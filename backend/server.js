// backend/server.js

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

console.log('🚀 ЗАПУСК БЭКЕНДА');
console.log('🔐 JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...');

// ===== CORS =====
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

// ===== БАЗА ДАННЫХ =====
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
  res.json({ status: 'ok', message: 'Сервер работает' });
});

// ============================================================
// 2. РЕГИСТРАЦИЯ
// ============================================================
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, full_name, role, phone, school, class_name, birth_date } = req.body;

    if (!email || !password || !full_name || !birth_date) {
      return res.status(400).json({ error: 'Email, пароль, ФИО и дата рождения обязательны' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, school, class_name, birth_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, role || 'participant', phone || '', school || '', class_name || '', birth_date]
    );

    res.status(201).json({
      message: 'Регистрация успешна!',
      user: result.rows[0]
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
    console.log('🔐 Вход:', email);

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Если пароль не захеширован - хешируем
    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      console.log('⚠️ Хешируем пароль для:', email);
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

    console.log('✅ Вход выполнен:', email);

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
// 4. ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (С ПРОВЕРКОЙ ТОКЕНА)
// ============================================================
app.get('/api/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 /api/me вызван');
    
    if (!authHeader) {
      console.log('❌ Нет заголовка Authorization');
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Токен:', token.substring(0, 30) + '...');

    try {
      // Проверяем токен
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
// 8. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, school, class_name, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 9. ОБНОВЛЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.patch('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'role обязателен' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 10. СОЗДАНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ (ДЛЯ АДМИНОВ)
// ============================================================
app.post('/api/users', async (req, res) => {
  try {
    const { email, full_name, role, phone, school, class_name, club_id } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ error: 'email и full_name обязательны' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Генерируем пароль
    const generatedPassword = Math.random().toString(36).slice(-8) + '123';
    const password_hash = await bcrypt.hash(generatedPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, school, class_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, role || 'participant', phone || '', school || '', class_name || '']
    );

    const user = result.rows[0];

    // Если указан клуб - добавляем в клуб
    if (club_id) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, club_id]
      );
    }

    res.status(201).json({
      message: 'Пользователь создан!',
      user: user,
      generated_password: generatedPassword
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 11. ПОЛУЧЕНИЕ ДОСТИЖЕНИЙ
// ============================================================
app.get('/api/achievements', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name as participant_name
       FROM achievements a
       LEFT JOIN users u ON a.participant_id = u.id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 12. ДОБАВЛЕНИЕ ДОСТИЖЕНИЯ
// ============================================================
app.post('/api/achievements', async (req, res) => {
  try {
    const { participant_id, title, description, achievement_date } = req.body;

    if (!participant_id || !title) {
      return res.status(400).json({ error: 'participant_id и title обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO achievements (participant_id, title, description, achievement_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [participant_id, title, description || '', achievement_date || new Date().toISOString().split('T')[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 13. УДАЛЕНИЕ ДОСТИЖЕНИЯ
// ============================================================
app.delete('/api/achievements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM achievements WHERE id = $1', [id]);
    res.json({ message: 'Достижение удалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 14. ПОЛУЧЕНИЕ СОБЫТИЙ
// ============================================================
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c.name as club_name
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       ORDER BY e.event_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 15. СОЗДАНИЕ СОБЫТИЯ
// ============================================================
app.post('/api/events', async (req, res) => {
  try {
    const { title, description, location, event_date, end_date, start_time, end_time, type, capacity, club_id, form_url } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'title и event_date обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO events (title, description, location, event_date, end_date, start_time, end_time, type, capacity, club_id, form_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [title, description || '', location || '', event_date, end_date || event_date, start_time || null, end_time || null, type || 'internal', capacity || 20, club_id || null, form_url || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 16. ОБНОВЛЕНИЕ СОБЫТИЯ
// ============================================================
app.patch('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, event_date, end_date, start_time, end_time, type, capacity, club_id, form_url } = req.body;

    const result = await pool.query(
      `UPDATE events 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           event_date = COALESCE($4, event_date),
           end_date = COALESCE($5, end_date),
           start_time = COALESCE($6, start_time),
           end_time = COALESCE($7, end_time),
           type = COALESCE($8, type),
           capacity = COALESCE($9, capacity),
           club_id = COALESCE($10, club_id),
           form_url = COALESCE($11, form_url)
       WHERE id = $12
       RETURNING *`,
      [title, description, location, event_date, end_date, start_time, end_time, type, capacity, club_id, form_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 17. УДАЛЕНИЕ СОБЫТИЯ
// ============================================================
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Событие удалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 18. ПОЛУЧЕНИЕ ОБРАЩЕНИЙ
// ============================================================
app.get('/api/appeals', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM appeals ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 19. СОЗДАНИЕ ОБРАЩЕНИЯ
// ============================================================
app.post('/api/appeals', async (req, res) => {
  try {
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'subject и message обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO appeals (subject, message, priority, status, created_at)
       VALUES ($1, $2, $3, 'new', NOW())
       RETURNING *`,
      [subject, message, priority || 'medium']
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 20. СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ
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

    // Создаём нового
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, birth_date)
       VALUES ($1, $2, $3, $4, '2000-01-01')
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, role]
    );

    console.log('✅ Тестовый пользователь создан');
    res.json({ message: 'Пользователь создан!', user: result.rows[0] });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 21. ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: установлен`);
  console.log(`👤 Тестовый пользователь: newadmin@dod.ru / 123456`);
  console.log(`📝 Создать тестового пользователя: POST /api/create-test-user`);
});