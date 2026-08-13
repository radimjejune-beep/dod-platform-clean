// backend/server.js

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

// ===== ПРАВИЛЬНЫЙ JWT СЕКРЕТ =====
const JWT_SECRET = 'super-secret-key-for-dod-platform-2024';
const PORT = process.env.PORT || 8080;

console.log('🔐 JWT_SECRET установлен:', JWT_SECRET.substring(0, 20) + '...');

// ===== MIDDLEWARE =====
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

// ===== ПОДКЛЮЧЕНИЕ К БАЗЕ =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
  }
});

// ============================================================
// 1. ТЕСТ
// ============================================================
app.get('/test', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// ============================================================
// 2. РЕГИСТРАЦИЯ
// ============================================================
app.post('/api/register', async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      role,
      phone,
      school,
      class_name,
      birth_date,
      club_id,
      child_id,
      is_minor,
      parent_full_name,
      parent_phone,
      parent_email,
      consents
    } = req.body;

    if (!email || !password || !full_name || !birth_date) {
      return res.status(400).json({ error: 'Email, пароль, ФИО и дата рождения обязательны' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, full_name, role, phone, school, class_name,
        birth_date, is_minor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, full_name, role, created_at`,
      [
        email,
        password_hash,
        full_name,
        role || 'participant',
        phone || '',
        school || '',
        class_name || '',
        birth_date,
        is_minor || false
      ]
    );

    const user = result.rows[0];

    if (role === 'participant' && club_id) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, club_id]
      );
    }

    if (role === 'parent' && child_id) {
      await pool.query(
        `INSERT INTO parent_child_relations (parent_id, child_id, status, created_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, child_id]
      );
    }

    if (consents) {
      const consentTypes = [
        { type: 'agree_to_terms', value: consents.agree_to_terms },
        { type: 'agree_personal_data', value: consents.agree_personal_data },
        { type: 'agree_minor_data', value: consents.agree_minor_data || false },
        { type: 'agree_image_use', value: consents.agree_image_use || false },
        { type: 'agree_photo_publication', value: consents.agree_photo_publication || false }
      ];

      for (const c of consentTypes) {
        if (c.value) {
          await pool.query(
            `INSERT INTO user_consents (user_id, consent_type, given_at, version)
             VALUES ($1, $2, NOW(), '1.0')`,
            [user.id, c.type]
          );
        }
      }
    }

    if (is_minor && parent_full_name) {
      await pool.query(
        `INSERT INTO parent_data (user_id, full_name, phone, email, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [user.id, parent_full_name, parent_phone || '', parent_email || '']
      );
    }

    res.status(201).json({
      message: 'Регистрация успешна!',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 3. ВХОД
// ============================================================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Попытка входа:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    console.log('👤 Найден пользователь:', user.email);

    // Если пароль не захеширован - обновляем
    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      console.log('⚠️ Пароль не захеширован! Обновляем...');
      const saltRounds = 10;
      const newHash = await bcrypt.hash(password, saltRounds);
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newHash, user.id]
      );
      user.password_hash = newHash;
      console.log('✅ Пароль обновлён');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      console.log('❌ Неверный пароль для:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // СОЗДАЁМ ТОКЕН С ПРАВИЛЬНЫМ СЕКРЕТОМ
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Успешный вход:', email);
    console.log('🔑 Токен создан:', token.substring(0, 30) + '...');

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
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 4. ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.get('/api/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Заголовок Authorization:', authHeader ? 'есть' : 'нет');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Токен (первые 30 символов):', token.substring(0, 30) + '...');
    
    try {
      // ПРОВЕРЯЕМ ТОКЕН С ПРАВИЛЬНЫМ СЕКРЕТОМ
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Токен валиден для:', decoded.email);

      const result = await pool.query(
        `SELECT id, email, full_name, role, phone, school, class_name,
                birth_date, is_minor, registration_status, interests, bio, city, created_at
         FROM users WHERE id = $1`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      res.json(result.rows[0]);
    } catch (jwtError) {
      console.error('❌ Ошибка JWT:', jwtError.message);
      return res.status(401).json({ error: 'Неверный токен' });
    }

  } catch (error) {
    console.error('❌ Ошибка /api/me:', error);
    res.status(401).json({ error: 'Неверный токен' });
  }
});

// ============================================================
// 5. ПОЛУЧЕНИЕ ВСЕХ ПРОФИЛЕЙ
// ============================================================
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, school, class_name,
              birth_date, is_minor, registration_status, interests, bio, city, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 6. ПОЛУЧЕНИЕ УЧАСТНИКОВ
// ============================================================
app.get('/api/participants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school,
              u.class_name, u.birth_date, u.created_at,
              cp.club_id, c.name as club_name
       FROM users u
       LEFT JOIN club_participants cp ON u.id = cp.profile_id AND cp.status = 'active'
       LEFT JOIN clubs c ON cp.club_id = c.id
       WHERE u.role = 'participant'
       ORDER BY u.full_name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 7. ПОЛУЧЕНИЕ КЛУБОВ
// ============================================================
app.get('/api/clubs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM clubs ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 8. ПОЛУЧЕНИЕ РЕГИСТРАЦИЙ
// ============================================================
app.get('/api/registrations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM registrations ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 9. СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.post('/api/create-test-user', async (req, res) => {
  try {
    const email = 'newadmin@dod.ru';
    const password = '123456';
    const full_name = 'Новый Администратор';
    const role = 'admin';

    // Удаляем старого пользователя
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    console.log('🗑️ Старый пользователь удалён');

    // Создаём нового с хешированным паролем
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, birth_date)
       VALUES ($1, $2, $3, $4, '2000-01-01')
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, role]
    );

    const user = result.rows[0];
    console.log('✅ Создан тестовый пользователь:', user.email);

    res.json({
      message: 'Тестовый пользователь создан!',
      user: user
    });

  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 10. ЗАПУСК
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: ${JWT_SECRET ? '✅ установлен' : '❌ НЕ УСТАНОВЛЕН!'}`);
  console.log(`📝 Создайте тестового пользователя: POST /api/create-test-user`);
});