// backend/server.js - УПРОЩЁННАЯ ВЕРСИЯ

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = 'super-secret-key-for-dod-platform-2024';

console.log('🚀 ЗАПУСК БЭКЕНДА (УПРОЩЁННАЯ ВЕРСИЯ)');

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
  }
});

// ===== ТЕСТ =====
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер работает' });
});

// ===== ВХОД =====
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Вход:', email);

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      user.password_hash = newHash;
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

// ===== /api/me2 - УПРОЩЁННАЯ ВЕРСИЯ =====
app.get('/api/me2', async (req, res) => {
  console.log('✅ /api/me2 вызван');
  
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, school, class_name, birth_date, created_at
       FROM users WHERE email = $1`,
      ['newadmin@dod.ru']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    res.json({
      ...user,
      is_minor: false,
      registration_status: 'active',
      interests: '',
      bio: '',
      city: ''
    });
  } catch (error) {
    console.error('❌ Ошибка /api/me2:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== ОСТАЛЬНЫЕ ЭНДПОИНТЫ =====
app.get('/api/clubs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clubs ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, phone, school, class_name, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, phone, school, class_name, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/participants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name
       FROM users u
       WHERE u.role = 'participant'
       ORDER BY u.full_name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ЗАПУСК =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`📝 /api/me2 - работает без токена`);
  console.log(`👤 newadmin@dod.ru / 123456`);
});