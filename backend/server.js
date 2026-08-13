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
              birth_date, is_minor, registration_status, interests, bio, city, created_at
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
// 9. ЗАПРОСЫ НА РЕГИСТРАЦИЮ
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
// 12. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
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

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

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
// 13. ИЗМЕНЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ
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
// 14. ОБНОВЛЕНИЕ ПРОФИЛЯ
// ============================================================
app.patch('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const {
      full_name,
      phone,
      school,
      class_name,
      interests,
      bio,
      city
    } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           school = COALESCE($3, school),
           class_name = COALESCE($4, class_name),
           interests = COALESCE($5, interests),
           bio = COALESCE($6, bio),
           city = COALESCE($7, city)
       WHERE id = $8
       RETURNING id, email, full_name, role, phone, school, class_name, interests, bio, city, birth_date, is_minor`,
      [full_name, phone, school, class_name, interests, bio, city, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 15. ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ ПО ID
// ============================================================
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, school, class_name,
              birth_date, is_minor, registration_status, interests, bio, city, created_at
       FROM users WHERE id = $1`,
      [id]
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
// 16. ОБНОВЛЕНИЕ СТАТУСА ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Статус обязателен' });
    }

    const result = await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2
       RETURNING id, email, full_name, role, status`,
      [status, id]
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
// 17. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С ФИЛЬТРАЦИЕЙ
// ============================================================
app.get('/api/users', async (req, res) => {
  try {
    const { role, club_id, search } = req.query;

    let query = `
      SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school,
             u.class_name, u.birth_date, u.is_minor, u.registration_status,
             u.interests, u.bio, u.city, u.status, u.created_at,
             c.id as club_id, c.name as club_name
      FROM users u
      LEFT JOIN club_participants cp ON u.id = cp.profile_id AND cp.status = 'active'
      LEFT JOIN clubs c ON cp.club_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (club_id) {
      query += ` AND cp.club_id = $${paramIndex}`;
      params.push(club_id);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY u.full_name`;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 18. ДОСТИЖЕНИЯ
// ============================================================

app.get('/api/achievements', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
              u.full_name as participant_name,
              u.id as participant_id
       FROM achievements a
       LEFT JOIN users u ON a.participant_id = u.id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/achievements/participant/:participantId', async (req, res) => {
  try {
    const { participantId } = req.params;

    const result = await pool.query(
      `SELECT * FROM achievements 
       WHERE participant_id = $1 
       ORDER BY achievement_date DESC NULLS LAST, created_at DESC`,
      [participantId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/achievements', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const {
      participant_id,
      title,
      description,
      achievement_date,
      is_club_award,
      is_tutor_award
    } = req.body;

    if (!participant_id || !title) {
      return res.status(400).json({ error: 'Участник и название достижения обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO achievements (
        participant_id, title, description, achievement_date,
        added_by, is_club_award, is_tutor_award
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [participant_id, title, description || null, achievement_date || null, decoded.userId, is_club_award || false, is_tutor_award || false]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Ошибка добавления достижения:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/achievements/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM achievements WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Достижение не найдено' });
    }

    res.json({ message: 'Достижение удалено', achievement: result.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 19. МЕРОПРИЯТИЯ
// ============================================================

app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, 
              c.name as club_name,
              u.full_name as organizer_name
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       LEFT JOIN users u ON e.organizer_profile_id = u.id
       ORDER BY e.event_date ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.*, 
              c.name as club_name,
              u.full_name as organizer_name
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       LEFT JOIN users u ON e.organizer_profile_id = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const {
      title,
      description,
      location,
      event_date,
      end_date,
      start_time,
      end_time,
      type,
      capacity,
      club_id,
      form_url
    } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Название и дата мероприятия обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO events (
        title, description, location, event_date, end_date,
        start_time, end_time, type, capacity, club_id,
        organizer_profile_id, form_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        title,
        description || null,
        location || null,
        event_date,
        end_date || event_date,
        start_time || null,
        end_time || null,
        type || 'internal',
        capacity || 20,
        club_id || null,
        decoded.userId,
        form_url || null
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Ошибка создания мероприятия:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      event_date,
      end_date,
      start_time,
      end_time,
      type,
      capacity,
      club_id,
      form_url
    } = req.body;

    const result = await pool.query(
      `UPDATE events SET
        title = COALESCE($1, title),
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
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM events WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    res.json({ message: 'Мероприятие удалено', event: result.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАПУСК
// ============================================================
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});