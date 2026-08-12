import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
app.use(cors());
app.use(express.json());

// ===== ДИАГНОСТИКА СЕТИ =====
console.log('🔍 ДИАГНОСТИКА СЕТИ:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Внутренние сетевые интерфейсы
const networkInterfaces = os.networkInterfaces();
console.log('🌐 Внутренние интерфейсы:');
Object.keys(networkInterfaces).forEach(iface => {
  networkInterfaces[iface].forEach(details => {
    if (details.family === 'IPv4' && !details.internal) {
      console.log(`   ${iface}: ${details.address}`);
    }
  });
});

// 2. Внешний IP (через API)
const getExternalIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('🌍 Внешний IP бэкенда (через ipify):', data.ip);
  } catch (error) {
    console.error('❌ Не удалось получить внешний IP через ipify:', error.message);
  }
};

// 3. Альтернативный способ получить внешний IP
const getExternalIPAlt = async () => {
  try {
    const response = await fetch('https://ifconfig.me/ip');
    const ip = await response.text();
    console.log('🌍 Внешний IP бэкенда (через ifconfig.me):', ip.trim());
  } catch (error) {
    console.error('❌ Не удалось получить внешний IP через ifconfig.me:', error.message);
  }
};

// 4. DNS-запрос для проверки доступности базы
const checkDatabaseDNS = async () => {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const host = dbUrl.hostname;
    console.log(`🔍 Проверка DNS для хоста: ${host}`);
    
    // Используем exec для nslookup
    const { stdout } = await execPromise(`nslookup ${host}`);
    console.log('📡 Результат nslookup:');
    console.log(stdout.trim());
  } catch (error) {
    console.error('❌ DNS-запрос не удался:', error.message);
  }
};

// 5. Проверка подключения к базе (проверка порта)
const checkDatabasePort = async () => {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const host = dbUrl.hostname;
    const port = dbUrl.port || 5432;
    console.log(`🔍 Проверка порта ${port} на хосте ${host}`);
    
    // Используем nc (netcat) для проверки порта
    const { stdout, stderr } = await execPromise(`timeout 5 nc -zv ${host} ${port} 2>&1 || echo "Connection failed"`);
    console.log('📡 Результат проверки порта:');
    console.log(stdout || stderr);
  } catch (error) {
    console.error('❌ Проверка порта не удалась:', error.message);
  }
};

// Запускаем все диагностики
(async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await getExternalIP();
  await getExternalIPAlt();
  await checkDatabaseDNS();
  await checkDatabasePort();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Диагностика завершена');
})();

// ===== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ =====
console.log('🔌 Подключение к базе данных...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Проверка подключения к БД
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    console.error('📋 Полная ошибка:', err);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
    release();
  }
});

// ===== ТЕСТОВЫЙ ЭНДПОИНТ =====
app.get('/test', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// ===== РЕГИСТРАЦИЯ =====
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, пароль и ФИО обязательны' });
    }

    // Проверяем, существует ли пользователь
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хэшируем пароль
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Создаём пользователя
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, created_at)
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, email, full_name, role, created_at`,
      [email, password_hash, full_name, role || 'participant']
    );

    res.status(201).json({
      message: 'Пользователь зарегистрирован',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ВХОД =====
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ПРОВЕРКА ТОКЕНА =====
app.get('/api/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

// ===== ПОЛУЧЕНИЕ ПРОФИЛЕЙ =====
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ПОЛУЧЕНИЕ УЧАСТНИКОВ =====
app.get('/api/participants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM participants ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ПОЛУЧЕНИЕ КЛУБОВ =====
app.get('/api/clubs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clubs ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ПОЛУЧЕНИЕ РЕГИСТРАЦИЙ =====
app.get('/api/registrations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registrations');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});