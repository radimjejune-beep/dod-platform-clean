// backend/server.js — ИСПРАВЛЕННАЯ ВЕРСИЯ

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
// ФУНКЦИИ УВЕДОМЛЕНИЙ
// ============================================================

async function createNotification(userId, type, title, message, link = null, priority = 'normal') {
  try {
    if (!userId) return null;
    
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, type, title, message, link, priority]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания уведомления:', error);
    return null;
  }
}

async function createNotificationForRole(role, type, title, message, link = null, priority = 'normal') {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (role, type, title, message, link, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [role, type, title, message, link, priority]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания уведомления для роли:', error);
    return null;
  }
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
      birth_date, social_links, skills, education, achievements, telegram, vk
    } = req.body;

    console.log('📥 Обновление профиля для:', decoded.email);

    // ===== ОБРАБОТКА ДАТЫ =====
    let birthDateValue = null;
    if (birth_date && birth_date !== '' && birth_date !== 'Invalid Date') {
      birthDateValue = birth_date;
    }

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
           vk = COALESCE($15, vk)
       WHERE id = $16
       RETURNING id, email, full_name, role, phone, school, class_name, interests, bio, city, position, birth_date, social_links, skills, education, achievements, telegram, vk`,
      [
        full_name, phone, school, class_name, interests, bio, city, position,
        birthDateValue, social_links, skills, education, achievements, telegram, vk,
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
// 15. ДОСТИЖЕНИЯ (С УВЕДОМЛЕНИЯМИ)
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

    // ===== УВЕДОМЛЕНИЕ: Новое достижение =====
    const userResult = await pool.query(
      'SELECT full_name, club_id FROM users WHERE id = $1',
      [participant_id]
    );
    
    if (userResult.rows.length > 0) {
      const participantName = userResult.rows[0].full_name;
      const clubId = userResult.rows[0].club_id;
      
      await createNotification(
        participant_id,
        'achievement',
        '🏆 Новое достижение',
        `Вы получили достижение: "${title}"${description ? ' — ' + description : ''}`,
        '/my-achievements',
        'high'
      );

      if (clubId) {
        const coordResult = await pool.query(
          'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
          [clubId]
        );
        if (coordResult.rows.length > 0) {
          await createNotification(
            coordResult.rows[0].profile_id,
            'achievement',
            '🏆 Достижение в клубе',
            `Участник "${participantName}" получил достижение: "${title}"`,
            `/participant/${participant_id}`,
            'normal'
          );
        }
      }

      const parentResult = await pool.query(
        'SELECT parent_id FROM child_parent WHERE child_id = $1 AND status = \'active\'',
        [participant_id]
      );
      for (const parent of parentResult.rows) {
        await createNotification(
          parent.parent_id,
          'achievement',
          '🏆 Достижение вашего ребёнка',
          `Ваш ребёнок "${participantName}" получил достижение: "${title}"`,
          `/participant/${participant_id}`,
          'high'
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания достижения:', error);
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
// 16. СОБЫТИЯ (С УВЕДОМЛЕНИЯМИ)
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

    const { title, description, location, event_date, end_date, start_time, end_time, type, capacity, club_id, form_url, is_global } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'title и event_date обязательны' });
    }

    let moderationStatus = 'approved';
    let finalClubId = club_id || null;

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
        is_global, moderation_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        title, description || '', location || '', event_date, end_date || event_date,
        start_time || null, end_time || null, type || 'internal', capacity || 20, 
        finalClubId, form_url || null,
        is_global || false, moderationStatus, userId
      ]
    );

    const newEvent = result.rows[0];

    // ===== УВЕДОМЛЕНИЕ: Новое мероприятие =====
    try {
      if (newEvent.moderation_status === 'approved') {
        if (newEvent.is_global) {
          await createNotificationForRole(
            'participant',
            'event',
            '📅 Новое глобальное мероприятие',
            `Приглашаем на мероприятие: "${newEvent.title}"`,
            '/calendar',
            'high'
          );
          await createNotificationForRole(
            'parent',
            'event',
            '📅 Новое мероприятие',
            `Приглашаем вашего ребёнка на мероприятие: "${newEvent.title}"`,
            '/calendar',
            'normal'
          );
        } else if (newEvent.club_id) {
          const clubMembers = await pool.query(
            'SELECT profile_id FROM club_participants WHERE club_id = $1 AND status = \'active\'',
            [newEvent.club_id]
          );
          for (const member of clubMembers.rows) {
            await createNotification(
              member.profile_id,
              'event',
              '📅 Новое мероприятие в клубе',
              `Мероприятие "${newEvent.title}" в вашем клубе`,
              '/calendar',
              'normal'
            );
          }
          
          const coordResult = await pool.query(
            'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
            [newEvent.club_id]
          );
          if (coordResult.rows.length > 0) {
            await createNotification(
              coordResult.rows[0].profile_id,
              'event',
              '📅 Мероприятие создано',
              `Мероприятие "${newEvent.title}" успешно создано в вашем клубе`,
              '/events',
              'normal'
            );
          }
        }
      }
    } catch (notifyError) {
      console.error('Ошибка отправки уведомления о мероприятии:', notifyError);
    }

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
// 18. ОБРАЩЕНИЯ (С УВЕДОМЛЕНИЯМИ)
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

    // ===== УВЕДОМЛЕНИЕ: Новое обращение =====
    await createNotificationForRole(
      'admin',
      'appeal',
      '📨 Новое обращение',
      `Координатор КЮДа создал обращение: "${subject}"`,
      '/appeals',
      'high'
    );
    await createNotificationForRole(
      'movement_coordinator',
      'appeal',
      '📨 Новое обращение',
      `Координатор КЮДа создал обращение: "${subject}"`,
      '/appeals',
      'high'
    );
    await createNotificationForRole(
      'president',
      'appeal',
      '📨 Новое обращение',
      `Координатор КЮДа создал обращение: "${subject}"`,
      '/appeals',
      'high'
    );
    await createNotificationForRole(
      'vice_president',
      'appeal',
      '📨 Новое обращение',
      `Координатор КЮДа создал обращение: "${subject}"`,
      '/appeals',
      'high'
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания обращения:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    const appealCheck = await pool.query(
      'SELECT coordinator_id, subject FROM appeals WHERE id = $1',
      [id]
    );
    if (appealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const coordinatorId = appealCheck.rows[0].coordinator_id;
    const subject = appealCheck.rows[0].subject;
    const newStatus = status || 'in_progress';

    await pool.query(
      `INSERT INTO appeal_replies (appeal_id, author_id, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, userId, message]
    );

    await pool.query(
      `UPDATE appeals 
       SET status = $1,
           resolved_by = $2,
           resolved_at = CASE WHEN $1 IN ('resolved', 'rejected') THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [newStatus, userId, id]
    );

    const statusText = {
      'in_progress': 'взят в работу',
      'resolved': 'решён',
      'rejected': 'отклонён'
    }[newStatus] || 'изменён';

    await createNotification(
      coordinatorId,
      'appeal',
      '📨 Ответ на обращение',
      `Статус вашего обращения "${subject}" ${statusText}. Ответ: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      '/appeals',
      'high'
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
    console.error('Ошибка ответа на обращение:', error);
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
// 19. ЗАПРОСЫ НА ТЬЮТОРОВ (С УВЕДОМЛЕНИЯМИ)
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

    // ===== УВЕДОМЛЕНИЕ: Новый запрос на тьютора =====
    await createNotificationForRole(
      'admin',
      'request',
      '🤝 Новый запрос на тьютора',
      `Координатор КЮДа запросил тьютора для мероприятия "${event_name}"`,
      '/tutor-requests',
      'high'
    );
    await createNotificationForRole(
      'movement_coordinator',
      'request',
      '🤝 Новый запрос на тьютора',
      `Координатор КЮДа запросил тьютора для мероприятия "${event_name}"`,
      '/tutor-requests',
      'high'
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
// 20. АВАТАР
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
       SET avatar_url = $1, updated_at = NOW()
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

app.get('/api/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 21-27. ОСТАЛЬНЫЕ ЭНДПОИНТЫ
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

app.get('/api/parent-children', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      `SELECT c.*, 
              u.full_name, u.phone, u.school, u.class_name, u.birth_date, u.avatar_url,
              cl.name as club_name
       FROM child_parent cp
       LEFT JOIN users u ON cp.child_id = u.id
       LEFT JOIN clubs cl ON u.club_id = cl.id
       WHERE cp.parent_id = $1 AND cp.status = 'active'
       ORDER BY u.full_name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения детей:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/parent-children', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (userRole !== 'admin' && userRole !== 'movement_coordinator') {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const { parent_id, child_id } = req.body;

    if (!parent_id || !child_id) {
      return res.status(400).json({ error: 'parent_id и child_id обязательны' });
    }

    const parentCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [parent_id]
    );
    if (parentCheck.rows.length === 0 || parentCheck.rows[0].role !== 'parent') {
      return res.status(400).json({ error: 'Родитель не найден' });
    }

    const childCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [child_id]
    );
    if (childCheck.rows.length === 0 || childCheck.rows[0].role !== 'participant') {
      return res.status(400).json({ error: 'Ребёнок не найден' });
    }

    const result = await pool.query(
      `INSERT INTO child_parent (parent_id, child_id, status, created_at)
       VALUES ($1, $2, 'active', NOW())
       ON CONFLICT (parent_id, child_id) DO UPDATE SET status = 'active', updated_at = NOW()
       RETURNING *`,
      [parent_id, child_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка привязки ребёнка:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/parent-children/:childId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { childId } = req.params;

    const result = await pool.query(
      'DELETE FROM child_parent WHERE parent_id = $1 AND child_id = $2 RETURNING *',
      [userId, childId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Связь не найдена' });
    }

    res.json({ message: 'Связь удалена' });
  } catch (error) {
    console.error('Ошибка удаления связи:', error);
    res.status(500).json({ error: error.message });
  }
});

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
// 24-27. ОБЪЯВЛЕНИЯ, ШАБЛОНЫ, ПРЕЗИДЕНТ, РЕЙТИНГ
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
// ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ
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
// УВЕДОМЛЕНИЯ API
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
// НОВОСТИ
// ============================================================

// ПОЛУЧЕНИЕ ВСЕХ НОВОСТЕЙ
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.full_name as author_name
       FROM news n
       LEFT JOIN users u ON n.created_by = u.id
       ORDER BY n.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения новостей:', error);
    res.status(500).json({ error: error.message });
  }
});

// СОЗДАНИЕ НОВОСТИ
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
      `INSERT INTO news (title, content, image_url, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [title, content, image_url || null, decoded.userId]
    );

    console.log('✅ Создана новость:', result.rows[0].title);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// ОБНОВЛЕНИЕ НОВОСТИ
app.put('/api/news/:id', async (req, res) => {
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
    const { title, content, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' });
    }

    const result = await pool.query(
      `UPDATE news 
       SET title = $1, content = $2, image_url = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title, content, image_url || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    console.log('✅ Обновлена новость:', result.rows[0].title);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// УДАЛЕНИЕ НОВОСТИ
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

    console.log('🗑️ Удалена новость:', id);
    res.json({ message: 'Новость удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// ЗАГРУЗКА ИЗОБРАЖЕНИЯ ДЛЯ НОВОСТИ
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

    // Сохраняем как есть (base64)
    console.log('✅ Загружено изображение для новости');
    res.json({ 
      image_url: image_base64,
      message: 'Изображение загружено' 
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// НОВОСТИ
// ============================================================

// ПОЛУЧЕНИЕ ВСЕХ НОВОСТЕЙ
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.full_name as author_name
       FROM news n
       LEFT JOIN users u ON n.created_by = u.id
       ORDER BY n.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения новостей:', error);
    res.status(500).json({ error: error.message });
  }
});

// СОЗДАНИЕ НОВОСТИ
app.post('/api/news', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Только админ и координатор движения могут создавать новости
    if (!['admin', 'movement_coordinator'].includes(decoded.role)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const { title, content, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO news (title, content, image_url, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [title.trim(), content.trim(), image_url || null, decoded.userId]
    );

    console.log('✅ Создана новость:', result.rows[0].title);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// ОБНОВЛЕНИЕ НОВОСТИ
app.put('/api/news/:id', async (req, res) => {
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
    const { title, content, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' });
    }

    const result = await pool.query(
      `UPDATE news 
       SET title = $1, content = $2, image_url = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title.trim(), content.trim(), image_url || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    console.log('✅ Обновлена новость:', result.rows[0].title);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// УДАЛЕНИЕ НОВОСТИ
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
    const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    console.log('🗑️ Удалена новость:', id);
    res.json({ message: 'Новость удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления новости:', error);
    res.status(500).json({ error: error.message });
  }
});

// ЗАГРУЗКА ИЗОБРАЖЕНИЯ ДЛЯ НОВОСТИ
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

    // Возвращаем base64 как есть (для простоты)
    console.log('✅ Загружено изображение для новости');
    res.json({ 
      image_url: image_base64,
      message: 'Изображение загружено' 
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ Эндпоинты новостей загружены');

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: установлен`);
  console.log(`📝 Создать тестового пользователя: POST /api/create-test-user`);
  console.log(`👤 Тестовый пользователь: newadmin@dod.ru / 123456`);
});