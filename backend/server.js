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
    const { email, password, full_name, role, phone, school, class_name, birth_date, club_id } = req.body;

    if (!email || !password || !full_name || !birth_date) {
      return res.status(400).json({ error: 'Email, пароль, ФИО и дата рождения обязательны' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, school, class_name, birth_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, role || 'participant', phone || '', school || '', class_name || '', birth_date]
    );

    const user = result.rows[0];

    if (club_id) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())`,
        [user.id, club_id]
      );
      await pool.query('UPDATE users SET club_id = $1 WHERE id = $2', [club_id, user.id]);
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
    console.log('🔐 Вход:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      console.log('⚠️ Хешируем пароль для:', email);
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      user.password_hash = newHash;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      console.log('❌ Неверный пароль для:', email);
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

    console.log('✅ Успешный вход:', email);

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
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const result = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
                u.birth_date, u.is_minor, u.registration_status, u.interests, u.bio, u.city, 
                u.position, u.status, u.club_id, u.created_at,
                c.name as club_name
         FROM users u
         LEFT JOIN clubs c ON u.club_id = c.id
         WHERE u.id = $1`,
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
// 5. /api/me2 - ЗАПАСНОЙ
// ============================================================
app.get('/api/me2', async (req, res) => {
  console.log('🔓 /api/me2 (без проверки токена - ЗАПАСНОЙ)');
  
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
              u.birth_date, u.is_minor, u.registration_status, u.interests, u.bio, u.city, 
              u.position, u.status, u.club_id, u.created_at,
              c.name as club_name
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.email = $1`,
      ['newadmin@dod.ru']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    console.log('✅ Пользователь найден через /api/me2 (запасной):', result.rows[0].email);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка /api/me2:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 6. ОБНОВЛЕНИЕ ПРОФИЛЯ
// ============================================================
app.patch('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { full_name, phone, school, class_name, interests, bio, city, position } = req.body;

    console.log('📥 Обновление профиля для:', decoded.email);

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           school = COALESCE($3, school),
           class_name = COALESCE($4, class_name),
           interests = COALESCE($5, interests),
           bio = COALESCE($6, bio),
           city = COALESCE($7, city),
           position = COALESCE($8, position)
       WHERE id = $9
       RETURNING id, email, full_name, role, phone, school, class_name, interests, bio, city, position`,
      [full_name, phone, school, class_name, interests, bio, city, position, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log('✅ Профиль обновлён');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 7. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
              u.birth_date, u.is_minor, u.registration_status, u.interests, u.bio, u.city, 
              u.position, u.status, u.club_id, u.created_at,
              c.name as club_name
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 8. ПОЛУЧЕНИЕ УЧАСТНИКОВ
// ============================================================
app.get('/api/participants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school,
              u.class_name, u.birth_date, u.created_at, u.status,
              u.club_id, c.name as club_name
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.role = 'participant'
       ORDER BY u.full_name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 9. ПОЛУЧЕНИЕ КЛУБОВ
// ============================================================
app.get('/api/clubs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              COUNT(DISTINCT cp.profile_id) as participants_count
       FROM clubs c
       LEFT JOIN club_participants cp ON c.id = cp.club_id AND cp.status = 'active'
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 10. ОБНОВЛЕНИЕ КЛУБА
// ============================================================
app.patch('/api/clubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, city, school, leader_name, contact_email, contact_phone } = req.body;

    const check = await pool.query('SELECT id FROM clubs WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Клуб не найден' });
    }

    const result = await pool.query(
      `UPDATE clubs 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           city = COALESCE($3, city),
           school = COALESCE($4, school),
           leader_name = COALESCE($5, leader_name),
           contact_email = COALESCE($6, contact_email),
           contact_phone = COALESCE($7, contact_phone),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, description, city, school, leader_name, contact_email, contact_phone, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления клуба:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 11. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (ДЛЯ АДМИНОВ)
// ============================================================
app.post('/api/users', async (req, res) => {
  try {
    const { email, full_name, role, phone, school, class_name, club_id, password } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ error: 'email и full_name обязательны' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    let generatedPassword = password;
    let isAutoGenerated = false;
    
    if (!generatedPassword) {
      generatedPassword = Math.random().toString(36).slice(-8) + '123';
      isAutoGenerated = true;
    }

    const password_hash = await bcrypt.hash(generatedPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, school, class_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, role || 'participant', phone || '', school || '', class_name || '']
    );

    const user = result.rows[0];

    if (club_id) {
      await pool.query('UPDATE users SET club_id = $1 WHERE id = $2', [club_id, user.id]);

      if (role === 'club_coordinator') {
        await pool.query(
          `INSERT INTO club_coordinators (profile_id, club_id, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [user.id, club_id]
        );
        console.log(`✅ Координатор ${user.full_name} (${user.id}) привязан к клубу ${club_id}`);
      } else {
        await pool.query(
          `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
           VALUES ($1, $2, 'active', NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [user.id, club_id]
        );
        console.log(`✅ Пользователь ${user.full_name} (${user.id}) привязан к клубу ${club_id}`);
      }
    }

    res.status(201).json({
      message: 'Пользователь создан!',
      user: user,
      generated_password: generatedPassword,
      is_auto_generated: isAutoGenerated
    });

  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 12. РЕДАКТИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, phone, school, class_name, club_id, status, position } = req.body;

    const check = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const oldRole = check.rows[0].role;

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           phone = COALESCE($3, phone),
           school = COALESCE($4, school),
           class_name = COALESCE($5, class_name),
           status = COALESCE($6, status),
           position = COALESCE($7, position),
           club_id = COALESCE($8, club_id)
       WHERE id = $9
       RETURNING id, email, full_name, role, phone, school, class_name, status, position, club_id`,
      [full_name, role, phone, school, class_name, status, position, club_id, id]
    );

    const user = result.rows[0];

    if (club_id) {
      await pool.query('UPDATE users SET club_id = $1 WHERE id = $2', [club_id, id]);

      if (role === 'club_coordinator') {
        await pool.query('DELETE FROM club_coordinators WHERE profile_id = $1', [id]);
        await pool.query(
          `INSERT INTO club_coordinators (profile_id, club_id, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [id, club_id]
        );
        console.log(`✅ Координатор ${user.full_name} обновлён: клуб ${club_id}`);
      } else {
        await pool.query('DELETE FROM club_participants WHERE profile_id = $1', [id]);
        await pool.query(
          `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
           VALUES ($1, $2, 'active', NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [id, club_id]
        );
      }
    } else {
      await pool.query('UPDATE users SET club_id = NULL WHERE id = $1', [id]);
      await pool.query('DELETE FROM club_coordinators WHERE profile_id = $1', [id]);
      await pool.query('DELETE FROM club_participants WHERE profile_id = $1', [id]);
    }

    if (oldRole === 'club_coordinator' && role !== 'club_coordinator') {
      await pool.query('DELETE FROM club_coordinators WHERE profile_id = $1', [id]);
      console.log(`🗑️ Пользователь ${user.full_name} больше не координатор`);
    }

    if (oldRole !== 'club_coordinator' && role === 'club_coordinator' && club_id) {
      await pool.query(
        `INSERT INTO club_coordinators (profile_id, club_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (profile_id, club_id) DO NOTHING`,
        [id, club_id]
      );
      console.log(`✅ Пользователь ${user.full_name} стал координатором клуба ${club_id}`);
    }

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
              u.status, u.position, u.club_id, c.name as club_name
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.id = $1`,
      [id]
    );

    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка редактирования пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 13. УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    console.error('❌ Ошибка удаления пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 14. ОБНОВЛЕНИЕ РОЛИ
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
// 15. ПОЛУЧЕНИЕ КООРДИНАТОРОВ
// ============================================================
app.get('/api/club-coordinators', async (req, res) => {
  try {
    const { profile_id } = req.query;
    let query = `
      SELECT cc.*, 
             u.full_name as user_name,
             c.name as club_name
      FROM club_coordinators cc
      LEFT JOIN users u ON cc.profile_id = u.id
      LEFT JOIN clubs c ON cc.club_id = c.id
    `;
    const params = [];
    
    if (profile_id) {
      query += ' WHERE cc.profile_id = $1';
      params.push(profile_id);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения координаторов:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 16. ДОСТИЖЕНИЯ
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
// 17. СОБЫТИЯ
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
// 18. ОБРАЩЕНИЯ - ПОЛУЧЕНИЕ ВСЕХ
// ============================================================
app.get('/api/appeals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;
    const userId = decoded.userId;

    let query = `
      SELECT a.*, 
             u.full_name as coordinator_name,
             c.name as club_name,
             r.full_name as resolved_by_name
      FROM appeals a
      LEFT JOIN users u ON a.coordinator_id = u.id
      LEFT JOIN clubs c ON a.club_id = c.id
      LEFT JOIN users r ON a.resolved_by = r.id
    `;
    const params = [];

    if (userRole === 'club_coordinator') {
      query += ' WHERE a.coordinator_id = $1';
      params.push(userId);
    } else if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      query += ' WHERE 1 = 0';
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения обращений:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 19. ОБРАЩЕНИЯ - СОЗДАНИЕ
// ============================================================
app.post('/api/appeals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'subject и message обязательны' });
    }

    if (userRole !== 'club_coordinator') {
      return res.status(403).json({ error: 'Только координаторы КЮДа могут создавать обращения' });
    }

    let clubId = null;
    const clubResult = await pool.query(
      'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
      [userId]
    );
    if (clubResult.rows.length > 0) {
      clubId = clubResult.rows[0].club_id;
    }

    if (!clubId) {
      return res.status(400).json({ error: 'Вы не привязаны к КЮДу' });
    }

    const result = await pool.query(
      `INSERT INTO appeals (club_id, coordinator_id, subject, message, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [clubId, userId, subject, message, priority || 'medium']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания обращения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 20. ОБРАЩЕНИЯ - ОТВЕТ (С СОХРАНЕНИЕМ СТАТУСОВ)
// ============================================================
app.post('/api/appeals/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для ответа на обращения' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Текст ответа обязателен' });
    }

    const appealCheck = await pool.query('SELECT status FROM appeals WHERE id = $1', [id]);
    if (appealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const oldStatus = appealCheck.rows[0].status;
    const newStatus = status || 'in_progress';

    // Сохраняем ответ с указанием старых и новых статусов
    await pool.query(
      `INSERT INTO appeal_replies (appeal_id, author_id, message, status_before, status_after, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, userId, message, oldStatus, newStatus]
    );

    await pool.query(
      `UPDATE appeals 
       SET status = $1,
           resolved_by = $2,
           resolved_at = CASE WHEN $1 IN ('resolved', 'rejected') THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3`,
      [newStatus, userId, id]
    );

    const result = await pool.query(
      `SELECT a.*, 
              u.full_name as coordinator_name,
              c.name as club_name,
              r.full_name as resolved_by_name
       FROM appeals a
       LEFT JOIN users u ON a.coordinator_id = u.id
       LEFT JOIN clubs c ON a.club_id = c.id
       LEFT JOIN users r ON a.resolved_by = r.id
       WHERE a.id = $1`,
      [id]
    );

    res.json({
      message: 'Ответ отправлен',
      appeal: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Ошибка ответа на обращение:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 21. ОБРАЩЕНИЯ - ПОЛУЧЕНИЕ ОТВЕТОВ
// ============================================================
app.get('/api/appeals/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, 
              u.full_name as author_name,
              u.role as author_role
       FROM appeal_replies r
       LEFT JOIN users u ON r.author_id = u.id
       WHERE r.appeal_id = $1
       ORDER BY r.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения ответов:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 22. РЕГИСТРАЦИИ
// ============================================================
app.get('/api/registrations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name as user_name, e.title as event_title
       FROM registrations r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN events e ON r.event_id = e.id
       ORDER BY r.registered_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/registrations', async (req, res) => {
  try {
    const { user_id, event_id } = req.body;

    if (!user_id || !event_id) {
      return res.status(400).json({ error: 'user_id и event_id обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO registrations (user_id, event_id, status, registered_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [user_id, event_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 23. ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ
// ============================================================
app.post('/api/create-test-user', async (req, res) => {
  try {
    const email = 'newadmin@dod.ru';
    const password = '123456';
    const full_name = 'Новый Администратор';
    const role = 'admin';

    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    console.log('🗑️ Старый пользователь удалён');

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, birth_date, registration_status)
       VALUES ($1, $2, $3, $4, '2000-01-01', 'active')
       RETURNING id, email, full_name, role, registration_status`,
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
// 24. ЗАПУСК
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: установлен`);
  console.log(`📝 Создать тестового пользователя: POST /api/create-test-user`);
  console.log(`👤 Тестовый пользователь: newadmin@dod.ru / 123456`);
});