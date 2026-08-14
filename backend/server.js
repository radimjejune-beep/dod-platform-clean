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
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dod-platform-2024';

console.log('🚀 ЗАПУСК БЭКЕНДА');

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
  }
});

// ============================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ УВЕДОМЛЕНИЙ
// ============================================================

async function createNotification(userId, type, title, message, link = null, priority = 'normal') {
  try {
    if (!userId) {
      console.log('⚠️ Попытка создать уведомление без userId');
      return null;
    }
    
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, type, title, message, link, priority]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка создания уведомления:', error.message);
    return null;
  }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function generateEmailFromName(fullName) {
  const parts = fullName.trim().split(' ');
  let login = '';
  
  if (parts.length >= 2) {
    const firstName = parts[0].toLowerCase();
    const lastName = parts[parts.length - 1].toLowerCase();
    const randomNum = Math.floor(Math.random() * 10000);
    login = `${firstName}.${lastName}${randomNum}`;
  } else {
    login = `user${Math.floor(Math.random() * 100000)}`;
  }
  
  const translit = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  let result = '';
  for (const char of login) {
    if (translit[char]) {
      result += translit[char];
    } else {
      result += char;
    }
  }
  
  return `${result}@dod.local`;
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================================
// 1. ТЕСТ
// ============================================================
app.get('/api/test', (req, res) => {
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
        role: user.role,
        avatar_url: user.avatar_url || null
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
                u.position, u.status, u.club_id, u.created_at, u.avatar_url, u.is_president,
                u.social_links, u.skills, u.education, u.achievements, u.telegram, u.vk,
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
              u.position, u.status, u.club_id, u.created_at, u.avatar_url, u.is_president,
              u.social_links, u.skills, u.education, u.achievements, u.telegram, u.vk,
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

    const { 
      full_name, phone, school, class_name, interests, bio, city, position,
      birth_date, social_links, skills, education, achievements, telegram, vk,
      parent_full_name, parent_phone, parent_email,
      consent_personal_data, consent_photo_publication, consent_event_participation,
      consent_agreement_date, charter_acceptance_date
    } = req.body;

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
           position = COALESCE($8, position),
           birth_date = $9,
           social_links = COALESCE($10, social_links),
           skills = COALESCE($11, skills),
           education = COALESCE($12, education),
           achievements = COALESCE($13, achievements),
           telegram = COALESCE($14, telegram),
           vk = COALESCE($15, vk),
           parent_full_name = COALESCE($16, parent_full_name),
           parent_phone = COALESCE($17, parent_phone),
           parent_email = COALESCE($18, parent_email),
           consent_personal_data = COALESCE($19, consent_personal_data),
           consent_photo_publication = COALESCE($20, consent_photo_publication),
           consent_event_participation = COALESCE($21, consent_event_participation),
           consent_agreement_date = $22,
           charter_acceptance_date = $23
       WHERE id = $24
       RETURNING *`,
      [
        full_name, phone, school, class_name, interests, bio, city, position,
        birth_date || null, social_links, skills, education, achievements, telegram, vk,
        parent_full_name, parent_phone, parent_email,
        consent_personal_data, consent_photo_publication, consent_event_participation,
        consent_agreement_date || null, charter_acceptance_date || null,
        decoded.userId
      ]
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
              u.position, u.status, u.club_id, u.created_at, u.avatar_url,
              u.social_links, u.skills, u.education, u.achievements, u.telegram, u.vk,
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
              u.class_name, u.birth_date, u.created_at, u.status, u.avatar_url,
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
// 10. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.post('/api/users', async (req, res) => {
  try {
    let { email, full_name, role, phone, school, class_name, club_id, password } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'full_name обязателен' });
    }

    let isAutoGenerated = false;
    
    if (!email) {
      email = generateEmailFromName(full_name);
      isAutoGenerated = true;
      console.log('📧 Сгенерирован email:', email);
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const randomSuffix = Math.floor(Math.random() * 10000);
      const baseEmail = email.split('@')[0];
      const domain = email.split('@')[1] || 'dod.local';
      email = `${baseEmail}${randomSuffix}@${domain}`;
      isAutoGenerated = true;
      console.log('📧 Email занят, сгенерирован новый:', email);
    }

    let generatedPassword = password;
    if (!generatedPassword) {
      generatedPassword = generatePassword();
      isAutoGenerated = true;
      console.log('🔑 Сгенерирован пароль:', generatedPassword);
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
      } else {
        await pool.query(
          `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
           VALUES ($1, $2, 'active', NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [user.id, club_id]
        );
      }
    }

    res.status(201).json({
      message: 'Пользователь создан!',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      generated_password: generatedPassword,
      is_auto_generated: isAutoGenerated
    });

  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 11. ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
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
      } else {
        await pool.query('DELETE FROM club_participants WHERE profile_id = $1', [id]);
        await pool.query(
          `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
           VALUES ($1, $2, 'active', NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [id, club_id]
        );
      }
    }

    if (oldRole === 'club_coordinator' && role !== 'club_coordinator') {
      await pool.query('DELETE FROM club_coordinators WHERE profile_id = $1', [id]);
    }

    if (oldRole !== 'club_coordinator' && role === 'club_coordinator' && club_id) {
      await pool.query(
        `INSERT INTO club_coordinators (profile_id, club_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (profile_id, club_id) DO NOTHING`,
        [id, club_id]
      );
    }

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
              u.status, u.position, u.club_id, u.avatar_url, c.name as club_name
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
// 12. УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
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
// 13. ОБНОВЛЕНИЕ РОЛИ
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
// 14. ПОЛУЧЕНИЕ КООРДИНАТОРОВ
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
// 15. ДОСТИЖЕНИЯ
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
// 16. СОБЫТИЯ
// ============================================================
app.get('/api/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    let query = `
      SELECT e.*, 
             c.name as club_name,
             u.full_name as created_by_name,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as participants_count
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE (e.moderation_status = 'approved' OR e.moderation_status IS NULL)
    `;
    const params = [];
    const conditions = [];

    conditions.push('(e.is_global = true OR e.is_global IS NULL)');

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      conditions.push('(e.is_club_event = true)');
    } else if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (clubResult.rows.length > 0) {
        const clubId = clubResult.rows[0].club_id;
        conditions.push(`(e.is_club_event = true AND e.club_id = $${params.length + 1})`);
        params.push(clubId);
      } else {
        conditions.push('1 = 0');
      }
    } else if (userRole === 'participant') {
      const user = await pool.query(
        'SELECT club_id FROM users WHERE id = $1',
        [userId]
      );
      if (user.rows.length > 0 && user.rows[0].club_id) {
        const clubId = user.rows[0].club_id;
        conditions.push(`(e.is_club_event = true AND e.club_id = $${params.length + 1})`);
        params.push(clubId);
      } else {
        conditions.push('1 = 0');
      }
    } else if (userRole === 'tutor') {
      const clubs = await pool.query(
        'SELECT DISTINCT club_id FROM event_tutors WHERE tutor_id = $1',
        [userId]
      );
      if (clubs.rows.length > 0) {
        const clubIds = clubs.rows.map(r => r.club_id);
        conditions.push(`(e.is_club_event = true AND e.club_id = ANY($${params.length + 1}::uuid[]))`);
        params.push(clubIds);
      } else {
        conditions.push('1 = 0');
      }
    } else if (userRole === 'parent') {
      conditions.push('1 = 0');
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }

    query += ' ORDER BY e.event_date ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения событий:', error);
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
    const userId = decoded.userId;
    const userRole = decoded.role;

    const { title, description, location, event_date, end_date, start_time, end_time, type, capacity, club_id, form_url, is_global, is_club_event } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'title и event_date обязательны' });
    }

    let moderationStatus = 'approved';
    let finalClubId = club_id || null;
    let finalIsClubEvent = is_club_event || false;

    if (userRole === 'club_coordinator') {
      if (is_global) {
        moderationStatus = 'pending';
      }
    } else if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      moderationStatus = 'approved';
    } else {
      return res.status(403).json({ error: 'У вас нет прав для создания мероприятий' });
    }

    const result = await pool.query(
      `INSERT INTO events (
        title, description, location, event_date, end_date, 
        start_time, end_time, type, capacity, club_id, form_url,
        is_global, is_club_event, moderation_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        title, description || '', location || '', event_date, end_date || event_date,
        start_time || null, end_time || null, type || 'internal', capacity || 20,
        finalClubId, form_url || null,
        is_global || false, finalIsClubEvent, moderationStatus, userId
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания события:', error);
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
// 17. РЕГИСТРАЦИИ
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
// 18. ОБРАЩЕНИЯ (ИСПРАВЛЕННЫЕ)
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

    // Уведомление админам
    const admins = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'movement_coordinator', 'president', 'vice_president')"
    );
    for (const admin of admins.rows) {
      await createNotification(
        admin.id,
        'appeal',
        '📨 Новое обращение',
        `Новое обращение от координатора: "${subject}"`,
        '/appeals',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания обращения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ОТВЕТ НА ОБРАЩЕНИЕ (ИСПРАВЛЕННЫЙ)
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

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Текст ответа обязателен' });
    }

    // Проверяем существование обращения
    const appealCheck = await pool.query(
      'SELECT id, coordinator_id FROM appeals WHERE id = $1',
      [id]
    );
    if (appealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const appeal = appealCheck.rows[0];

    // Вставляем ответ
    await pool.query(
      `INSERT INTO appeal_replies (appeal_id, author_id, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, userId, message.trim()]
    );

    // Обновляем статус
    const newStatus = status || 'in_progress';
    await pool.query(
      `UPDATE appeals 
       SET status = $1,
           resolved_by = $2,
           resolved_at = CASE WHEN $1 IN ('resolved', 'rejected') THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [newStatus, userId, id]
    );

    // Уведомление координатору
    if (appeal.coordinator_id) {
      await createNotification(
        appeal.coordinator_id,
        'appeal',
        '📨 Ответ на обращение',
        `Получен ответ на ваше обращение`,
        '/appeals',
        'high'
      );
    }

    // Получаем обновлённое обращение
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
    console.error('❌ Детали:', error.detail || 'Нет деталей');
    res.status(500).json({ error: error.message });
  }
});

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

app.delete('/api/appeals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'У вас нет прав для удаления обращений' });
    }

    const check = await pool.query('SELECT id FROM appeals WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    await pool.query('DELETE FROM appeal_replies WHERE appeal_id = $1', [id]);
    await pool.query('DELETE FROM appeals WHERE id = $1', [id]);

    res.json({ message: 'Обращение удалено' });
  } catch (error) {
    console.error('Ошибка удаления обращения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 19. ЗАПРОСЫ НА ТЬЮТОРОВ
// ============================================================
app.get('/api/tutor-requests', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    let query = `
      SELECT tr.*, 
             u.full_name as requested_by_name,
             c.name as club_name,
             r.full_name as reviewed_by_name
      FROM tutor_requests tr
      LEFT JOIN users u ON tr.requested_by = u.id
      LEFT JOIN clubs c ON tr.club_id = c.id
      LEFT JOIN users r ON tr.reviewed_by = r.id
    `;
    const params = [];

    if (userRole === 'club_coordinator') {
      query += ' WHERE tr.requested_by = $1';
      params.push(userId);
    } else if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      query += ' WHERE 1 = 0';
    }

    query += ' ORDER BY tr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения запросов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tutor-requests', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const { tutor_name, tutor_email, tutor_phone, event_date, event_name, event_description, role, responsibilities, notes } = req.body;

    if (!tutor_name || !event_date || !event_name) {
      return res.status(400).json({ error: 'ФИО тьютора, дата и название мероприятия обязательны' });
    }

    if (userRole !== 'club_coordinator') {
      return res.status(403).json({ error: 'Только координаторы КЮДа могут создавать запросы' });
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
      `INSERT INTO tutor_requests (
        club_id, requested_by, tutor_name, tutor_email, tutor_phone,
        event_date, event_name, event_description, role, responsibilities, notes, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', NOW())
      RETURNING *`,
      [clubId, userId, tutor_name, tutor_email || '', tutor_phone || '', event_date, event_name, event_description || '', role || 'Тьютор', responsibilities || [], notes || '']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания запроса:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tutor-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

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
      return res.status(403).json({ error: 'У вас нет прав для рассмотрения запросов' });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Статус должен быть "approved" или "rejected"' });
    }

    const result = await pool.query(
      `UPDATE tutor_requests 
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           comment = $3
       WHERE id = $4
       RETURNING *`,
      [status, userId, comment || '', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления запроса:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАГРУЗКА АВАТАРА
// ============================================================
app.post('/api/upload-avatar', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { avatar_base64 } = req.body;

    if (!avatar_base64) {
      return res.status(400).json({ error: 'Нет данных изображения' });
    }

    if (!avatar_base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET avatar_url = $1
       WHERE id = $2
       RETURNING id, avatar_url`,
      [avatar_base64, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ 
      message: 'Аватар обновлён', 
      avatar_url: result.rows[0].avatar_url 
    });
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАГРУЗКА ИЗОБРАЖЕНИЯ ДЛЯ НОВОСТЕЙ
// ============================================================
app.post('/api/upload-news-image', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!['admin', 'movement_coordinator'].includes(decoded.role)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const { image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: 'Нет данных изображения' });
    }

    if (!image_base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }

    res.json({ 
      message: 'Изображение загружено', 
      image_url: image_base64 
    });
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 21. ИСТОРИЯ УЧАСТНИКА
// ============================================================
app.get('/api/participant-events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, 
              c.name as club_name,
              CASE 
                WHEN r.status = 'confirmed' THEN 'Участвовал'
                WHEN r.status = 'pending' THEN 'Записан'
                ELSE 'Не участвовал'
              END as participation_status
       FROM events e
       LEFT JOIN registrations r ON e.id = r.event_id AND r.user_id = $1
       LEFT JOIN clubs c ON e.club_id = c.id
       WHERE r.user_id = $1 OR e.is_global = true
       ORDER BY e.event_date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/participant-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const eventsResult = await pool.query(
      `SELECT COUNT(*) as total_events,
              COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as attended_events
       FROM registrations
       WHERE user_id = $1`,
      [userId]
    );

    const achievementsResult = await pool.query(
      'SELECT COUNT(*) as achievements_count FROM achievements WHERE participant_id = $1',
      [userId]
    );

    const totalEvents = parseInt(eventsResult.rows[0]?.total_events || 0);
    const attendedEvents = parseInt(eventsResult.rows[0]?.attended_events || 0);
    const achievementsCount = parseInt(achievementsResult.rows[0]?.achievements_count || 0);

    const level = Math.floor((totalEvents + achievementsCount) / 5) + 1;
    const nextLevel = level + 1;
    const progress = ((totalEvents + achievementsCount) % 5) / 5 * 100;

    const recentAchievements = await pool.query(
      `SELECT a.*, u.full_name as participant_name
       FROM achievements a
       LEFT JOIN users u ON a.participant_id = u.id
       WHERE a.participant_id = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      total_events: totalEvents,
      attended_events: attendedEvents,
      achievements_count: achievementsCount,
      level: level,
      next_level: nextLevel,
      progress: progress,
      recent_achievements: recentAchievements.rows
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 22. ДЕТИ РОДИТЕЛЯ
// ============================================================
app.get('/api/parent-children', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    console.log('👨‍👩‍👦 Запрос детей для родителя:', userId);

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.full_name, 
        u.phone, 
        u.school, 
        u.class_name, 
        u.birth_date, 
        u.avatar_url,
        u.status,
        u.consent_personal_data,
        u.consent_photo_publication,
        u.consent_event_participation,
        u.consent_agreement_date,
        u.interests,
        u.bio,
        u.city,
        cl.name as club_name,
        cp.parent_id,
        cp.child_id,
        cp.status as link_status
       FROM child_parent cp
       LEFT JOIN users u ON cp.child_id = u.id
       LEFT JOIN clubs cl ON u.club_id = cl.id
       WHERE cp.parent_id = $1 AND cp.status = 'active'
       ORDER BY u.full_name`,
      [userId]
    );

    console.log('✅ Найдено детей:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения детей:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 23. TIMELINE РЕБЁНКА
// ============================================================
app.get('/api/child-timeline/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 20 } = req.query;

    const events = await pool.query(
      `SELECT 
        'event' as type,
        e.id as id,
        e.title as title,
        e.event_date as date,
        e.location as location,
        r.status as status,
        '📅' as icon
       FROM registrations r
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1
       ORDER BY e.event_date DESC
       LIMIT $2`,
      [childId, limit]
    );

    const achievements = await pool.query(
      `SELECT 
        'achievement' as type,
        a.id as id,
        a.title as title,
        a.achievement_date as date,
        a.description as description,
        '🏆' as icon
       FROM achievements a
       WHERE a.participant_id = $1
       ORDER BY a.achievement_date DESC
       LIMIT $2`,
      [childId, limit]
    );

    const timeline = [...events.rows, ...achievements.rows];
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(timeline.slice(0, limit));
  } catch (error) {
    console.error('Ошибка получения timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 24. ОБЪЯВЛЕНИЯ
// ============================================================
app.post('/api/announcements', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const { club_id, title, content, priority = 'normal' } = req.body;

    if (!club_id || !title || !content) {
      return res.status(400).json({ error: 'club_id, title и content обязательны' });
    }

    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, club_id]
      );
      if (clubCheck.rows.length === 0) {
        return res.status(403).json({ error: 'У вас нет прав для этого клуба' });
      }
    } else if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const result = await pool.query(
      `INSERT INTO announcements (club_id, created_by, title, content, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [club_id, userId, title, content, priority]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания объявления:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/announcements/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT a.*, u.full_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.club_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [clubId, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения объявлений:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    res.json({ message: 'Объявление удалено' });
  } catch (error) {
    console.error('Ошибка удаления объявления:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 25. ШАБЛОНЫ ОТЧЁТОВ
// ============================================================
app.get('/api/report-templates', async (req, res) => {
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
      SELECT rt.*, 
             u.full_name as created_by_name,
             c.name as club_name
      FROM report_templates rt
      LEFT JOIN users u ON rt.created_by = u.id
      LEFT JOIN clubs c ON rt.club_id = c.id
    `;
    const params = [];

    if (userRole === 'club_coordinator') {
      query += ' WHERE rt.created_by = $1';
      params.push(userId);
    } else if (!['admin', 'movement_coordinator'].includes(userRole)) {
      query += ' WHERE 1 = 0';
    }

    query += ' ORDER BY rt.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения шаблонов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/report-templates', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const { club_id, name, description, template_data, category = 'general' } = req.body;

    if (!name || !template_data) {
      return res.status(400).json({ error: 'name и template_data обязательны' });
    }

    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, club_id]
      );
      if (clubCheck.rows.length === 0) {
        return res.status(403).json({ error: 'У вас нет прав для этого клуба' });
      }
    } else if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const result = await pool.query(
      `INSERT INTO report_templates (club_id, created_by, name, description, template_data, category, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [club_id || null, userId, name, description || '', template_data, category]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания шаблона:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/report-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM report_templates WHERE id = $1', [id]);
    res.json({ message: 'Шаблон удалён' });
  } catch (error) {
    console.error('Ошибка удаления шаблона:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 26. ПРЕЗИДЕНТ КЛУБА
// ============================================================
app.patch('/api/clubs/:clubId/president', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const { clubId } = req.params;
    const { president_id } = req.body;

    if (!president_id) {
      return res.status(400).json({ error: 'president_id обязателен' });
    }

    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, clubId]
      );
      if (clubCheck.rows.length === 0) {
        return res.status(403).json({ error: 'У вас нет прав для этого клуба' });
      }
    } else if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const userCheck = await pool.query(
      'SELECT id, role, club_id FROM users WHERE id = $1',
      [president_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Участник не найден' });
    }
    if (userCheck.rows[0].role !== 'participant') {
      return res.status(400).json({ error: 'Указанный пользователь не является участником' });
    }
    if (userCheck.rows[0].club_id !== clubId) {
      return res.status(400).json({ error: 'Участник не состоит в этом клубе' });
    }

    await pool.query(
      'UPDATE users SET is_president = false WHERE club_id = $1 AND is_president = true',
      [clubId]
    );

    await pool.query(
      'UPDATE users SET is_president = true WHERE id = $1',
      [president_id]
    );

    const result = await pool.query(
      'UPDATE clubs SET president_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [president_id, clubId]
    );

    const president = await pool.query(
      'SELECT id, full_name, email FROM users WHERE id = $1',
      [president_id]
    );

    res.json({
      message: 'Президент назначен',
      club: result.rows[0],
      president: president.rows[0]
    });
  } catch (error) {
    console.error('Ошибка назначения президента:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clubs/:clubId/president', async (req, res) => {
  try {
    const { clubId } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.school, u.class_name, u.avatar_url
       FROM users u
       WHERE u.club_id = $1 AND u.is_president = true
       LIMIT 1`,
      [clubId]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Ошибка получения президента:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 27. РЕЙТИНГ УЧАСТНИКОВ КЛУБА
// ============================================================
app.get('/api/club-rating/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.school,
        u.class_name,
        u.is_president,
        u.avatar_url,
        COUNT(DISTINCT r.event_id) as events_count,
        COUNT(DISTINCT a.id) as achievements_count,
        (COUNT(DISTINCT r.event_id) * 2 + COUNT(DISTINCT a.id) * 5) as rating_points
       FROM users u
       LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'confirmed'
       LEFT JOIN achievements a ON u.id = a.participant_id
       WHERE u.club_id = $1 AND u.role = 'participant' AND u.status = 'active'
       GROUP BY u.id, u.full_name, u.school, u.class_name, u.is_president, u.avatar_url
       ORDER BY rating_points DESC
       LIMIT $2`,
      [clubId, limit]
    );

    const rating = result.rows.map((row, index) => ({
      ...row,
      position: index + 1,
      medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null
    }));

    res.json(rating);
  } catch (error) {
    console.error('Ошибка получения рейтинга:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 28. НОВОСТИ
// ============================================================
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM news ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения новостей:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/news', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!['admin', 'movement_coordinator'].includes(decoded.role)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const { title, content, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO news (title, content, image_url, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [title, content, image_url || null]
    );

    console.log('✅ Создана новость:', result.rows[0].title);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания новости:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!['admin', 'movement_coordinator'].includes(decoded.role)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const { id } = req.params;
    await pool.query('DELETE FROM news WHERE id = $1', [id]);

    res.json({ message: 'Новость удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 29. УВЕДОМЛЕНИЯ API
// ============================================================
app.get('/api/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const result = await pool.query(
      `SELECT n.*
       FROM notifications n
       WHERE n.user_id = $1 
          OR (n.user_id IS NULL AND n.role = $2)
          OR (n.user_id IS NULL AND n.role = 'all')
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId, userRole]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const check = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [id]
    );
    
    if (check.rows.length > 0) {
      const ownerId = check.rows[0].user_id;
      if (ownerId && ownerId !== userId) {
        return res.status(403).json({ error: 'У вас нет прав' });
      }
    }

    await pool.query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    await pool.query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false',
      [userId]
    );

    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const { user_id, role, type, title, message, link, priority = 'normal' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'title и message обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, role, type, title, message, link, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [user_id || null, role || null, type || 'system', title, message, link || null, priority]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания уведомления:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 30. СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ
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
// ПРИВЯЗКА РЕБЁНКА К РОДИТЕЛЮ (ПО ЛОГИНУ И ПАРОЛЮ)
// ============================================================
app.post('/api/parent-link-child', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const parentId = decoded.userId;
    const parentRole = decoded.role;

    if (parentRole !== 'parent') {
      return res.status(403).json({ error: 'Только родители могут привязывать детей' });
    }

    const { child_email, child_password } = req.body;

    if (!child_email || !child_password) {
      return res.status(400).json({ error: 'Email и пароль ребёнка обязательны' });
    }

    const childResult = await pool.query(
      'SELECT id, full_name, role, password_hash FROM users WHERE email = $1',
      [child_email]
    );

    if (childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ребёнок с таким email не найден' });
    }

    const child = childResult.rows[0];

    if (child.role !== 'participant') {
      return res.status(400).json({ error: 'Указанный пользователь не является участником' });
    }

    const validPassword = await bcrypt.compare(child_password, child.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const existingLink = await pool.query(
      'SELECT id FROM child_parent WHERE child_id = $1 AND status = \'active\'',
      [child.id]
    );

    if (existingLink.rows.length > 0) {
      const sameParent = await pool.query(
        'SELECT id FROM child_parent WHERE child_id = $1 AND parent_id = $2 AND status = \'active\'',
        [child.id, parentId]
      );
      if (sameParent.rows.length > 0) {
        return res.status(400).json({ error: 'Этот ребёнок уже привязан к вам' });
      }
      return res.status(400).json({ error: 'Этот ребёнок уже привязан к другому родителю' });
    }

    await pool.query(
      `INSERT INTO child_parent (parent_id, child_id, status, created_at)
       VALUES ($1, $2, 'active', NOW())
       RETURNING *`,
      [parentId, child.id]
    );

    await createNotification(
      parentId,
      'system',
      '👨‍👩‍👦 Ребёнок привязан',
      `Вы успешно привязали ребёнка "${child.full_name}" к своему аккаунту`,
      '/parent-dashboard',
      'high'
    );

    await createNotification(
      child.id,
      'system',
      '👨‍👩‍👦 Привязка к родителю',
      `Ваш профиль привязан к родителю. Теперь родитель может видеть ваши достижения и мероприятия.`,
      '/profile',
      'normal'
    );

    res.json({
      message: 'Ребёнок успешно привязан!',
      child: {
        id: child.id,
        full_name: child.full_name,
        email: child.email
      }
    });

  } catch (error) {
    console.error('❌ Ошибка привязки ребёнка:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ВНУТРЕННИЕ МЕРОПРИЯТИЯ КЛУБА
// ============================================================

// ПОЛУЧЕНИЕ ВНУТРЕННИХ МЕРОПРИЯТИЙ КЛУБА
app.get('/api/club-events/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    let hasAccess = false;
    
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      hasAccess = true;
    }
    
    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, clubId]
      );
      if (clubCheck.rows.length > 0) {
        hasAccess = true;
      }
    }
    
    if (userRole === 'participant') {
      const userCheck = await pool.query(
        'SELECT club_id FROM users WHERE id = $1 AND club_id = $2',
        [userId, clubId]
      );
      if (userCheck.rows.length > 0) {
        hasAccess = true;
      }
    }
    
    if (userRole === 'tutor') {
      const tutorCheck = await pool.query(
        'SELECT id FROM event_tutors WHERE tutor_id = $1 AND club_id = $2',
        [userId, clubId]
      );
      if (tutorCheck.rows.length > 0) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'У вас нет доступа к этому клубу' });
    }

    const result = await pool.query(
      `SELECT e.*, 
              u.full_name as proposed_by_name,
              u2.full_name as created_by_name,
              COUNT(DISTINCT ep.user_id) as current_participants
       FROM events e
       LEFT JOIN users u ON e.proposed_by = u.id
       LEFT JOIN users u2 ON e.created_by = u2.id
       LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.status = 'registered'
       WHERE e.club_id = $1 AND e.is_club_event = true
       GROUP BY e.id, u.full_name, u2.full_name
       ORDER BY e.event_date ASC`,
      [clubId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения мероприятий клуба:', error);
    res.status(500).json({ error: error.message });
  }
});

// СОЗДАНИЕ ВНУТРЕННЕГО МЕРОПРИЯТИЯ КЛУБА
app.post('/api/club-events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const {
      title,
      description,
      location,
      event_date,
      end_date,
      start_time,
      end_time,
      max_participants,
      registration_deadline,
      club_id
    } = req.body;

    if (!title || !event_date || !club_id) {
      return res.status(400).json({ error: 'Название, дата и клуб обязательны' });
    }

    let canCreate = false;
    
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canCreate = true;
    }
    
    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, club_id]
      );
      if (clubCheck.rows.length > 0) {
        canCreate = true;
      }
    }

    if (!canCreate) {
      return res.status(403).json({ error: 'У вас нет прав для создания мероприятий в этом клубе' });
    }

    let status = 'approved';
    if (userRole === 'participant') {
      status = 'pending';
    }

    const result = await pool.query(
      `INSERT INTO events (
        title, description, location, event_date, end_date,
        start_time, end_time, max_participants, registration_deadline,
        club_id, is_club_event, proposed_by, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13, NOW())
      RETURNING *`,
      [
        title,
        description || '',
        location || '',
        event_date,
        end_date || event_date,
        start_time || null,
        end_time || null,
        max_participants || 20,
        registration_deadline || null,
        club_id,
        userId,
        status,
        userId
      ]
    );

    const newEvent = result.rows[0];

    const participants = await pool.query(
      'SELECT id FROM users WHERE club_id = $1 AND role = $2 AND status = $3',
      [club_id, 'participant', 'active']
    );

    for (const p of participants.rows) {
      await createNotification(
        p.id,
        'event',
        '📅 Новое мероприятие в клубе',
        `В вашем клубе создано мероприятие: "${title}"`,
        `/club/${club_id}`,
        'normal'
      );
    }

    if (userRole === 'participant' && status === 'pending') {
      const coordinators = await pool.query(
        'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
        [club_id]
      );
      for (const c of coordinators.rows) {
        await createNotification(
          c.profile_id,
          'event',
          '📅 Новое предложение мероприятия',
          `Участник предложил мероприятие "${title}" в вашем клубе`,
          `/club/${club_id}`,
          'high'
        );
      }
    }

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Ошибка создания мероприятия клуба:', error);
    res.status(500).json({ error: error.message });
  }
});

// МОДЕРАЦИЯ ВНУТРЕННЕГО МЕРОПРИЯТИЯ
app.patch('/api/club-events/:id/moderate', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    let canModerate = false;
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canModerate = true;
    }
    
    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        `SELECT c.id FROM clubs c
         JOIN club_coordinators cc ON c.id = cc.club_id
         JOIN events e ON e.club_id = c.id
         WHERE cc.profile_id = $1 AND e.id = $2`,
        [userId, id]
      );
      if (clubCheck.rows.length > 0) {
        canModerate = true;
      }
    }

    if (!canModerate) {
      return res.status(403).json({ error: 'У вас нет прав для модерации' });
    }

    const result = await pool.query(
      `UPDATE events 
       SET status = $1, moderation_comment = $2, moderated_by = $3, moderated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, comment || null, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = result.rows[0];

    if (event.proposed_by) {
      await createNotification(
        event.proposed_by,
        'event',
        status === 'approved' ? '✅ Мероприятие одобрено' : '❌ Мероприятие отклонено',
        `Ваше мероприятие "${event.title}" ${status === 'approved' ? 'одобрено' : 'отклонено'}`,
        `/club/${event.club_id}`,
        status === 'approved' ? 'high' : 'normal'
      );
    }

    if (status === 'approved') {
      const participants = await pool.query(
        'SELECT id FROM users WHERE club_id = $1 AND role = $2 AND status = $3',
        [event.club_id, 'participant', 'active']
      );
      for (const p of participants.rows) {
        await createNotification(
          p.id,
          'event',
          '📅 Новое мероприятие в клубе',
          `Мероприятие "${event.title}" одобрено и доступно для записи!`,
          `/club/${event.club_id}`,
          'normal'
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка модерации мероприятия:', error);
    res.status(500).json({ error: error.message });
  }
});

// ЗАПИСЬ НА ВНУТРЕННЕЕ МЕРОПРИЯТИЕ
app.post('/api/club-events/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const eventCheck = await pool.query(
      'SELECT id, club_id, max_participants, status FROM events WHERE id = $1 AND is_club_event = true',
      [id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    if (event.status !== 'approved') {
      return res.status(400).json({ error: 'Мероприятие ещё не одобрено' });
    }

    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND club_id = $2 AND role = $3',
      [userId, event.club_id, 'participant']
    );
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Вы не являетесь участником этого клуба' });
    }

    const existing = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже записаны на это мероприятие' });
    }

    const count = await pool.query(
      'SELECT COUNT(*) FROM event_participants WHERE event_id = $1 AND status = $2',
      [id, 'registered']
    );
    const maxParticipants = event.max_participants || 20;
    if (parseInt(count.rows[0].count) >= maxParticipants) {
      return res.status(400).json({ error: 'Лимит участников достигнут' });
    }

    const result = await pool.query(
      `INSERT INTO event_participants (event_id, user_id, status, registered_at)
       VALUES ($1, $2, 'registered', NOW())
       RETURNING *`,
      [id, userId]
    );

    const coordinators = await pool.query(
      'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
      [event.club_id]
    );
    const user = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId]
    );
    for (const c of coordinators.rows) {
      await createNotification(
        c.profile_id,
        'event',
        '📝 Новая запись на мероприятие',
        `${user.rows[0].full_name} записался на "${event.title}"`,
        `/club/${event.club_id}`,
        'normal'
      );
    }

    res.json({ 
      message: 'Вы записаны на мероприятие!', 
      participant: result.rows[0] 
    });
  } catch (error) {
    console.error('Ошибка записи на мероприятие:', error);
    res.status(500).json({ error: error.message });
  }
});

// ПОЛУЧЕНИЕ ВСЕХ ВНУТРЕННИХ МЕРОПРИЯТИЙ ДЛЯ ПОЛЬЗОВАТЕЛЯ
app.get('/api/my-club-events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    let clubIds = [];

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      const result = await pool.query(
        `SELECT e.*, 
                c.name as club_name,
                u.full_name as proposed_by_name
         FROM events e
         LEFT JOIN clubs c ON e.club_id = c.id
         LEFT JOIN users u ON e.proposed_by = u.id
         WHERE e.is_club_event = true AND e.status = 'approved'
         ORDER BY e.event_date ASC`
      );
      return res.json(result.rows);
    }

    if (userRole === 'club_coordinator') {
      const clubs = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      clubIds = clubs.rows.map(r => r.club_id);
    }

    if (userRole === 'participant') {
      const user = await pool.query(
        'SELECT club_id FROM users WHERE id = $1',
        [userId]
      );
      if (user.rows.length > 0 && user.rows[0].club_id) {
        clubIds = [user.rows[0].club_id];
      }
    }

    if (userRole === 'tutor') {
      const clubs = await pool.query(
        'SELECT DISTINCT club_id FROM event_tutors WHERE tutor_id = $1',
        [userId]
      );
      clubIds = clubs.rows.map(r => r.club_id);
    }

    if (clubIds.length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT e.*, 
              c.name as club_name,
              u.full_name as proposed_by_name
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       LEFT JOIN users u ON e.proposed_by = u.id
       WHERE e.is_club_event = true 
         AND e.status = 'approved'
         AND e.club_id = ANY($1::uuid[])
       ORDER BY e.event_date ASC`,
      [clubIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения мероприятий:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: установлен`);
  console.log(`📝 Создать тестового пользователя: POST /api/create-test-user`);
  console.log(`👤 Тестовый пользователь: newadmin@dod.ru / 123456`);
});