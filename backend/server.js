// server.js

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const PORT = process.env.PORT || 8080;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Проверка подключения
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
    release();
  }
});

// ============================================================
// 1. ТЕСТОВЫЙ ЭНДПОИНТ
// ============================================================
app.get('/test', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// ============================================================
// 2. РЕГИСТРАЦИЯ (ПОЛНАЯ)
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

    // ===== ВАЛИДАЦИЯ =====
    if (!email || !password || !full_name || !birth_date) {
      return res.status(400).json({ error: 'Email, пароль, ФИО и дата рождения обязательны' });
    }

    // Проверяем, существует ли пользователь
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хэшируем пароль
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // ===== СОЗДАЁМ ПОЛЬЗОВАТЕЛЯ =====
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

    // ===== ПРИВЯЗКА К КЛУБУ (ДЛЯ УЧАСТНИКОВ) =====
    if (role === 'participant' && club_id) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, club_id]
      );
    }

    // ===== ПРИВЯЗКА РОДИТЕЛЯ К РЕБЁНКУ =====
    if (role === 'parent' && child_id) {
      await pool.query(
        `INSERT INTO parent_child_relations (parent_id, child_id, status, created_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, child_id]
      );
    }

    // ===== СОХРАНЯЕМ СОГЛАСИЯ =====
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

    // ===== ДАННЫЕ РОДИТЕЛЯ (ДЛЯ НЕСОВЕРШЕННОЛЕТНИХ) =====
    if (is_minor && parent_full_name) {
      await pool.query(
        `INSERT INTO parent_data (user_id, full_name, phone, email, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [user.id, parent_full_name, parent_phone || '', parent_email || '']
      );
    }

    res.status(201).json({
      message: 'Пользователь зарегистрирован. Ожидайте подтверждения администратора.',
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

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем статус регистрации
    if (user.registration_status === 'pending') {
      return res.status(403).json({ error: 'Ваша регистрация ещё не подтверждена администратором' });
    }

    if (user.registration_status === 'rejected') {
      return res.status(403).json({ error: 'Ваша регистрация отклонена' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

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

// ============================================================
// 4. ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.get('/api/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, school, class_name,
              birth_date, is_minor, registration_status, created_at
       FROM users WHERE id = $1`,
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

// ============================================================
// 5. ПОЛУЧЕНИЕ ВСЕХ ПРОФИЛЕЙ
// ============================================================
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, school, class_name,
              birth_date, is_minor, registration_status, created_at
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
// 9. ЗАПРОСЫ НА РЕГИСТРАЦИЮ (ДЛЯ АДМИНКИ)
// ============================================================
app.get('/api/registration-requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school,
              u.class_name, u.birth_date, u.is_minor, u.created_at,
              u.registration_status,
              c.name as club_name,
              pd.full_name as parent_full_name,
              pd.phone as parent_phone,
              pd.email as parent_email
       FROM users u
       LEFT JOIN club_participants cp ON u.id = cp.profile_id
       LEFT JOIN clubs c ON cp.club_id = c.id
       LEFT JOIN parent_data pd ON u.id = pd.user_id
       WHERE u.registration_status = 'pending'
       ORDER BY u.created_at ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 10. ОДОБРЕНИЕ РЕГИСТРАЦИИ
// ============================================================
app.patch('/api/registration-requests/:userId/approve', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET registration_status = 'approved',
           approved_at = NOW()
       WHERE id = $1 AND registration_status = 'pending'
       RETURNING id, full_name, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запрос не найден или уже обработан' });
    }

    res.json({
      message: 'Регистрация одобрена',
      user: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 11. ОТКЛОНЕНИЕ РЕГИСТРАЦИИ
// ============================================================
app.patch('/api/registration-requests/:userId/reject', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET registration_status = 'rejected'
       WHERE id = $1 AND registration_status = 'pending'
       RETURNING id, full_name, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запрос не найден или уже обработан' });
    }

    res.json({
      message: 'Регистрация отклонена',
      user: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 12. СОЗДАНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
// ============================================================
app.post('/api/users', async (req, res) => {
  try {
    const {
      email,
      full_name,
      role,
      phone,
      school,
      class_name,
      birth_date,
      club_id,
      child_id
    } = req.body;

    if (!email || !full_name || !role) {
      return res.status(400).json({ error: 'Email, ФИО и роль обязательны' });
    }

    // Проверяем существование
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Генерируем пароль
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, full_name, role, phone, school, class_name,
        birth_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, full_name, role`,
      [
        email,
        password_hash,
        full_name,
        role,
        phone || '',
        school || '',
        class_name || '',
        birth_date || null
      ]
    );

    const user = result.rows[0];

    // Привязка к клубу
    if (role === 'participant' && club_id) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, club_id]
      );
    }

    // Привязка родителя
    if (role === 'parent' && child_id) {
      await pool.query(
        `INSERT INTO parent_child_relations (parent_id, child_id, status, created_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, child_id]
      );
    }

    res.status(201).json({
      message: 'Пользователь создан',
      user,
      generated_password: password
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 13. ИЗМЕНЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
// ============================================================
app.patch('/api/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Роль обязательна' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, full_name, role`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: 'Роль обновлена',
      user: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 14. ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});