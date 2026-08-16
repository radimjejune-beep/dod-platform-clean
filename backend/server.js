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

// ============================================================
// CORS НАСТРОЙКА
// ============================================================
app.use(cors({
  origin: [
    '*',
    'https://dod-frontend.relaxdev.ru',
    'https://dod-platform-clean.relaxdev.ru',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());

app.use((req, res, next) => {
  const allowedOrigins = [
    'https://dod-frontend.relaxdev.ru',
    'https://dod-platform-clean.relaxdev.ru',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ПРОВЕРКА И ПРИВЯЗКА КООРДИНАТОРА
// ============================================================
async function ensureCoordinatorClub(userId) {
  try {
    const userResult = await pool.query(
      'SELECT id, role, club_id FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return null;
    const user = userResult.rows[0];
    
    if (user.role !== 'club_coordinator') return user;
    
    if (!user.club_id) {
      const coordResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (coordResult.rows.length > 0) {
        const clubId = coordResult.rows[0].club_id;
        await pool.query(
          'UPDATE users SET club_id = $1 WHERE id = $2',
          [clubId, userId]
        );
        user.club_id = clubId;
        console.log(`✅ Координатору ${userId} присвоен клуб ${clubId}`);
      }
    } else {
      const coordResult = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, user.club_id]
      );
      if (coordResult.rows.length === 0) {
        await pool.query(
          `INSERT INTO club_coordinators (profile_id, club_id, created_at)
           VALUES ($1, $2, NOW())`,
          [userId, user.club_id]
        );
        console.log(`✅ Координатор ${userId} привязан к клубу ${user.club_id}`);
      }
    }
    
    return user;
  } catch (error) {
    console.error('❌ Ошибка в ensureCoordinatorClub:', error);
    return null;
  }
}

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
// 3. ВХОД (ИСПРАВЛЕННЫЙ)
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

    // ============================================================
    // АВТОМАТИЧЕСКАЯ ПРИВЯЗКА КООРДИНАТОРА К КЛУБУ
    // ============================================================
    if (user.role === 'club_coordinator') {
      await ensureCoordinatorClub(user.id);
      const updatedUser = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      if (updatedUser.rows.length > 0) {
        Object.assign(user, updatedUser.rows[0]);
      }
    }

    // ============================================================
    // СОЗДАЁМ ТОКЕН ОДИН РАЗ! С is_president!
    // ============================================================
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        club_id: user.club_id,
        is_president: user.is_president || false
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Успешный вход:', email);
    console.log('👑 is_president в токене:', user.is_president || false);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url || null,
        club_id: user.club_id || null
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
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role === 'club_coordinator') {
        await ensureCoordinatorClub(decoded.userId);
      }

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
        await ensureCoordinatorClub(user.id);
        console.log(`✅ Координатор ${user.full_name} привязан к клубу ${club_id}`);
      } else {
        await pool.query(
          `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
           VALUES ($1, $2, 'active', NOW())
           ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [user.id, club_id]
        );
      }
    } else {
      if (role === 'club_coordinator') {
        await ensureCoordinatorClub(user.id);
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

    const check = await pool.query('SELECT id, role, club_id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const oldRole = check.rows[0].role;
    const oldClubId = check.rows[0].club_id;

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

    const newRole = role || oldRole;
    const newClubId = club_id || oldClubId;

    if (newRole === 'club_coordinator') {
      if (newClubId) {
        await ensureCoordinatorClub(id);
        console.log(`✅ Координатор ${user.full_name} привязан к клубу ${newClubId}`);
      } else {
        await ensureCoordinatorClub(id);
      }
    } else if (oldRole === 'club_coordinator' && newRole !== 'club_coordinator') {
      await pool.query('DELETE FROM club_coordinators WHERE profile_id = $1', [id]);
      console.log(`✅ Пользователь ${user.full_name} больше не координатор`);
    } else if (newRole === 'participant' && newClubId) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())
         ON CONFLICT (profile_id, club_id) DO NOTHING`,
        [id, newClubId]
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

    conditions.push('(e.is_global = true)');

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      conditions.push('(e.is_club_event = true)');
    } 
    else if (userRole === 'club_coordinator') {
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
    } 
    else if (userRole === 'participant') {
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
    } 
    else if (userRole === 'tutor') {
      const assignments = await pool.query(
        'SELECT event_id FROM event_tutor_assignments WHERE tutor_id = $1 AND status = $2',
        [userId, 'accepted']
      );
    
      if (assignments.rows.length > 0) {
        const eventIds = assignments.rows.map(r => r.event_id);
        conditions.push(`(e.id = ANY($${params.length + 1}::uuid[]))`);
        params.push(eventIds);
        console.log(`👨‍🏫 Тьютор видит ${assignments.rows.length} мероприятий`);
      } else {
        conditions.push('1 = 0');
        console.log('👨‍🏫 Тьютор не назначен ни на одно мероприятие');
      }
    }
    else if (userRole === 'parent') {
    } 
    else {
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
// 18. ОБРАЩЕНИЯ
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

    const appealCheck = await pool.query(
      'SELECT id, coordinator_id, status FROM appeals WHERE id = $1',
      [id]
    );
    
    if (appealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const appeal = appealCheck.rows[0];

    if (appeal.status === 'resolved' || appeal.status === 'rejected') {
      return res.status(400).json({ error: 'Это обращение уже закрыто' });
    }

    await pool.query(
      `INSERT INTO appeal_replies (appeal_id, author_id, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, userId, message.trim()]
    );

    const newStatus = status || 'in_progress';
    await pool.query(
      `UPDATE appeals 
       SET status = $1,
           resolved_by = $2,
           resolved_at = CASE WHEN $1 IN ('resolved', 'rejected') THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [newStatus, userId, id]
    );

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
// 20. ЗАГРУЗКА АВАТАРА
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

    const sizeInBytes = Buffer.from(avatar_base64.split(',')[1], 'base64').length;
    const sizeInKB = sizeInBytes / 1024;
    console.log(`📦 Размер аватара: ${sizeInKB.toFixed(2)} KB`);
    
    if (sizeInBytes > 500 * 1024) {
      return res.status(400).json({ 
        error: 'Изображение слишком большое. Максимум 500KB. Пожалуйста, сожмите изображение.' 
      });
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
// ИСПОЛЬЗОВАНИЕ ШАБЛОНА ДЛЯ СОЗДАНИЯ ОТЧЁТА
// ============================================================
app.post('/api/reports/from-template/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator', 'club_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания отчётов' });
    }

    // Получаем шаблон
    const templateResult = await pool.query(
      'SELECT * FROM report_templates WHERE id = $1',
      [templateId]
    );
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }

    const template = templateResult.rows[0];

    // Получаем данные из запроса
    const { club_id, report_month, report_data } = req.body;

    // Заменяем плейсхолдеры в шаблоне
    let content = template.template_data;
    const placeholders = {
      '{club_name}': await getClubName(club_id),
      '{report_month}': report_month || new Date().toISOString().slice(0, 7),
      '{date}': new Date().toISOString().slice(0, 10),
      '{user_name}': decoded.full_name || 'Пользователь',
      ...report_data
    };

    for (const [key, value] of Object.entries(placeholders)) {
      content = content.replace(new RegExp(key, 'g'), value || '');
    }

    // Создаём отчёт
    const result = await pool.query(
      `INSERT INTO reports (
        club_id, created_by, title, content, report_month, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'draft', NOW())
      RETURNING *`,
      [
        club_id || null,
        userId,
        `Отчёт за ${placeholders['{report_month}']}`,
        content,
        placeholders['{report_month}'] || new Date().toISOString().slice(0, 7)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания отчёта из шаблона:', error);
    res.status(500).json({ error: error.message });
  }
});

// Вспомогательная функция
async function getClubName(clubId) {
  if (!clubId) return 'Все клубы';
  const result = await pool.query('SELECT name FROM clubs WHERE id = $1', [clubId]);
  return result.rows[0]?.name || 'Клуб';
}

// ============================================================
// 26. НАЗНАЧЕНИЕ ПРЕЗИДЕНТА КЛУБА
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

    console.log(`👑 Назначение президента: клуб ${clubId}, пользователь ${president_id}, роль ${userRole}`);

    let hasAccess = false;

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      hasAccess = true;
    }

    if (userRole === 'club_coordinator') {
      if (decoded.club_id === clubId) {
        hasAccess = true;
      }
      
      if (!hasAccess) {
        const clubCheck = await pool.query(
          'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
          [userId, clubId]
        );
        if (clubCheck.rows.length > 0) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'У вас нет прав для этого клуба. Вы не привязаны к этому КЮДу.' 
      });
    }

    if (!president_id) {
      await pool.query(
        'UPDATE users SET is_president = false WHERE club_id = $1 AND is_president = true',
        [clubId]
      );
      await pool.query(
        'UPDATE clubs SET president_id = NULL, updated_at = NOW() WHERE id = $1',
        [clubId]
      );
      return res.json({ 
        message: 'Президент снят с должности',
        president: null 
      });
    }

    const userCheck = await pool.query(
      `SELECT u.id, u.role, u.club_id, u.full_name, u.is_president
       FROM users u 
       WHERE u.id = $1`,
      [president_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Участник не найден' });
    }
    
    const candidate = userCheck.rows[0];
    
    if (candidate.role !== 'participant') {
      return res.status(400).json({ 
        error: 'Президентом может быть только участник с ролью participant' 
      });
    }
    
    if (candidate.club_id !== clubId) {
      return res.status(400).json({ 
        error: 'Участник не состоит в этом клубе' 
      });
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
      'SELECT id, full_name, email, avatar_url FROM users WHERE id = $1',
      [president_id]
    );

    await createNotification(
      president_id,
      'system',
      '👑 Вы назначены президентом клуба',
      `Поздравляем! Вы назначены президентом клуба "${result.rows[0].name || 'КЮД'}"`,
      `/club/${clubId}`,
      'high'
    );

    const coordinators = await pool.query(
      'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
      [clubId]
    );
    for (const coord of coordinators.rows) {
      if (coord.profile_id !== userId) {
        await createNotification(
          coord.profile_id,
          'system',
          '👑 Назначен президент клуба',
          `Новый президент назначен в вашем клубе: ${candidate.full_name}`,
          `/club/${clubId}`,
          'medium'
        );
      }
    }

    res.json({
      message: 'Президент назначен',
      club: result.rows[0],
      president: president.rows[0]
    });
  } catch (error) {
    console.error('❌ Ошибка назначения президента:', error);
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
    console.error('❌ Ошибка получения президента:', error);
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

    const check = await pool.query('SELECT id FROM news WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    const result = await pool.query(
      `UPDATE news 
       SET title = $1,
           content = $2,
           image_url = $3
       WHERE id = $4
       RETURNING *`,
      [title, content, image_url || null, id]
    );

    console.log('✅ Обновлена новость:', result.rows[0].title);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления новости:', error);
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
    
    const check = await pool.query('SELECT id FROM news WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    await pool.query('DELETE FROM news WHERE id = $1', [id]);

    console.log('✅ Удалена новость:', id);
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
// 31. ПРИВЯЗКА РЕБЁНКА К РОДИТЕЛЮ
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
      'SELECT id FROM child_parent WHERE child_id = $1 AND status = $2',
      [child.id, 'active']
    );

    if (existingLink.rows.length > 0) {
      const sameParent = await pool.query(
        'SELECT id FROM child_parent WHERE child_id = $1 AND parent_id = $2 AND status = $3',
        [child.id, parentId, 'active']
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
// 32. ВНУТРЕННИЕ МЕРОПРИЯТИЯ КЛУБА
// ============================================================
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
// 33. ЗАДАНИЯ ПРЕЗИДЕНТА
// ============================================================
app.get('/api/president-tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;
    const isPresident = decoded.is_president || false;

    let query = `
      SELECT 
        pt.*,
        u.full_name as assigned_to_name,
        u2.full_name as created_by_name,
        c.name as club_name,
        (SELECT COUNT(*) FROM president_task_responses ptr WHERE ptr.task_id = pt.id) as response_count
      FROM president_tasks pt
      LEFT JOIN users u ON pt.assigned_to = u.id
      LEFT JOIN users u2 ON pt.created_by = u2.id
      LEFT JOIN clubs c ON pt.club_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let conditions = [];

    if (['admin', 'movement_coordinator'].includes(userRole)) {
      console.log('👑 Админ/Координатор движения: видит все задания');
    } 
    else if (userRole === 'president') {
      console.log('👑 Президент движения: видит все задания');
    }
    else if (userRole === 'vice_president') {
      console.log('👑 Вице-президент движения: видит все задания');
    }
    else if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      
      if (clubResult.rows.length > 0) {
        const clubId = clubResult.rows[0].club_id;
        conditions.push(`(
          pt.created_by = $${params.length + 1} 
          OR pt.club_id = $${params.length + 2} 
          OR pt.is_global = true
        )`);
        params.push(userId, clubId);
        console.log(`🏫 Координатор клуба (клуб ${clubId}): видит только задания своего клуба и глобальные`);
      } else {
        conditions.push(`pt.created_by = $${params.length + 1}`);
        params.push(userId);
        console.log('⚠️ Координатор без клуба: видит только свои задания');
      }
    }
    else if (userRole === 'participant' && isPresident === true) {
      conditions.push(`(pt.assigned_to = $${params.length + 1} OR pt.is_global = true)`);
      params.push(userId);
      console.log(`👑 Президент клуба: видит свои задания (${userId})`);
    }
    else {
      conditions.push('1 = 0');
      console.log('⛔ Нет прав для просмотра заданий');
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }

    query += ' ORDER BY pt.created_at DESC';

    const result = await pool.query(query, params);
    console.log(`📥 Загружено заданий: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения заданий:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/president-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        pt.*,
        u.full_name as assigned_to_name,
        u2.full_name as created_by_name,
        c.name as club_name,
        (SELECT COUNT(*) FROM president_task_responses ptr WHERE ptr.task_id = pt.id) as response_count
      FROM president_tasks pt
      LEFT JOIN users u ON pt.assigned_to = u.id
      LEFT JOIN users u2 ON pt.created_by = u2.id
      LEFT JOIN clubs c ON pt.club_id = c.id
      WHERE pt.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка получения задания:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/president-tasks', async (req, res) => {
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
      priority, 
      deadline, 
      club_id, 
      assigned_to, 
      is_global 
    } = req.body;

    if (userRole === 'president') {
      if (is_global) {
        return res.status(403).json({ error: 'Президент движения не может создавать глобальные задания' });
      }
      if (!assigned_to) {
        return res.status(400).json({ error: 'Укажите президента клуба, которому назначается задание' });
      }
    }
    else if (userRole === 'vice_president') {
      if (is_global) {
        return res.status(403).json({ error: 'Вице-президент движения не может создавать глобальные задания' });
      }
      if (!assigned_to) {
        return res.status(400).json({ error: 'Укажите президента клуба, которому назначается задание' });
      }
    }
    else if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      
      if (clubResult.rows.length === 0) {
        return res.status(400).json({ error: 'Вы не привязаны к КЮДу' });
      }
      
      const coordinatorClubId = clubResult.rows[0].club_id;
      
      if (club_id && club_id !== coordinatorClubId) {
        return res.status(403).json({ error: 'Вы можете создавать задания только для своего КЮДа' });
      }
      
      if (is_global) {
        return res.status(403).json({ error: 'Координатор КЮДа не может создавать глобальные задания' });
      }
      
      if (assigned_to) {
        const presidentCheck = await pool.query(
          `SELECT u.id, u.role, u.is_president, u.club_id 
           FROM users u 
           WHERE u.id = $1`,
          [assigned_to]
        );
        if (presidentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Пользователь не найден' });
        }
        const president = presidentCheck.rows[0];
        if (president.role !== 'president' && !president.is_president) {
          return res.status(400).json({ error: 'Указанный пользователь не является президентом клуба' });
        }
        if (president.club_id !== coordinatorClubId) {
          return res.status(403).json({ error: 'Вы можете назначать задания только президенту своего КЮДа' });
        }
      }
    }
    else if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Недостаточно прав для создания задания' });
    }

    let finalAssignedTo = assigned_to || null;

    console.log(`🔍 Проверка автоматического назначения: club_id=${club_id}, assigned_to=${assigned_to}, finalAssignedTo=${finalAssignedTo}`);

    if (club_id && !finalAssignedTo) {
      const presidentResult = await pool.query(
        'SELECT id FROM users WHERE club_id = $1 AND is_president = true LIMIT 1',
        [club_id]
      );
      if (presidentResult.rows.length > 0) {
        finalAssignedTo = presidentResult.rows[0].id;
        console.log(`👑 Автоматически назначено президенту клуба: ${finalAssignedTo}`);
      } else {
        console.log(`⚠️ В клубе ${club_id} нет президента`);
        return res.status(400).json({ 
          error: 'В этом клубе нет президента. Назначьте президента клуба сначала.' 
        });
      }
    }

    if (!finalAssignedTo && !is_global) {
      console.log(`⚠️ Задание не назначено: finalAssignedTo=${finalAssignedTo}, is_global=${is_global}`);
      return res.status(400).json({ 
        error: 'Назначьте задание президенту клуба или сделайте его глобальным' 
      });
    }

    console.log(`✅ Итоговое назначение: finalAssignedTo=${finalAssignedTo}, is_global=${is_global}`);

    if (finalAssignedTo) {
      const presidentCheck = await pool.query(
        `SELECT u.id, u.role, u.is_president, u.club_id 
         FROM users u 
         WHERE u.id = $1`,
        [finalAssignedTo]
      );
      if (presidentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Пользователь не найден' });
      }
      const president = presidentCheck.rows[0];
      if (president.role !== 'president' && !president.is_president) {
        return res.status(400).json({ error: 'Указанный пользователь не является президентом клуба' });
      }
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Заголовок обязателен' });
    }

    const result = await pool.query(
      `
      INSERT INTO president_tasks (
        title, description, priority, deadline, club_id, assigned_to, 
        created_by, is_global, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
      RETURNING *
      `,
      [
        title.trim(),
        description || '',
        priority || 'medium',
        deadline || null,
        club_id || null,
        finalAssignedTo,
        userId,
        is_global || false
      ]
    );

    const newTask = result.rows[0];

    const fullResult = await pool.query(
      `
      SELECT 
        pt.*,
        u.full_name as assigned_to_name,
        u2.full_name as created_by_name,
        c.name as club_name,
        (SELECT COUNT(*) FROM president_task_responses ptr WHERE ptr.task_id = pt.id) as response_count
      FROM president_tasks pt
      LEFT JOIN users u ON pt.assigned_to = u.id
      LEFT JOIN users u2 ON pt.created_by = u2.id
      LEFT JOIN clubs c ON pt.club_id = c.id
      WHERE pt.id = $1
      `,
      [newTask.id]
    );

    if (finalAssignedTo) {
      let notificationTitle = '👑 Новое задание';
      let notificationMessage = `Вам назначено задание: "${title}"`;
      
      if (userRole === 'president') {
        notificationTitle = '👑 Новое задание от президента движения';
        notificationMessage = `Президент движения назначил вам задание: "${title}"`;
      } else if (userRole === 'vice_president') {
        notificationTitle = '👑 Новое задание от вице-президента движения';
        notificationMessage = `Вице-президент движения назначил вам задание: "${title}"`;
      } else if (userRole === 'club_coordinator') {
        notificationTitle = '📌 Новое задание от координатора КЮДа';
        notificationMessage = `Координатор вашего КЮДа назначил вам задание: "${title}"`;
      }
      
      await createNotification(
        finalAssignedTo,
        'task',
        notificationTitle,
        notificationMessage,
        '/president-tasks',
        'high'
      );
    }

    if (club_id) {
      const coordinators = await pool.query(
        'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
        [club_id]
      );
      for (const coord of coordinators.rows) {
        if (coord.profile_id !== userId) {
          let fromWho = 'Назначено';
          if (userRole === 'president') fromWho = 'Президент движения';
          else if (userRole === 'vice_president') fromWho = 'Вице-президент движения';
          else if (userRole === 'admin') fromWho = 'Администратор';
          else if (userRole === 'movement_coordinator') fromWho = 'Координатор движения';
          else if (userRole === 'club_coordinator') fromWho = 'Координатор КЮДа';
          
          await createNotification(
            coord.profile_id,
            'task',
            '📌 Задание для президента вашего клуба',
            `${fromWho} назначил задание президенту вашего клуба: "${title}"`,
            '/president-tasks',
            'medium'
          );
        }
      }
    }

    if (is_global) {
      const presidents = await pool.query(
        "SELECT id FROM users WHERE role = 'president' OR is_president = true"
      );
      for (const p of presidents.rows) {
        await createNotification(
          p.id,
          'task',
          '👑 Новое глобальное задание',
          `Новое задание для всех президентов клубов: "${title}"`,
          '/president-tasks',
          'medium'
        );
      }
    }

    if (userRole === 'club_coordinator') {
      const admins = await pool.query(
        "SELECT id FROM users WHERE role IN ('admin', 'movement_coordinator', 'president', 'vice_president')"
      );
      for (const admin of admins.rows) {
        if (admin.id !== userId) {
          await createNotification(
            admin.id,
            'task',
            '📌 Новое задание от координатора КЮДа',
            `Координатор КЮДа создал задание для президента: "${title}"`,
            '/president-tasks',
            'normal'
          );
        }
      }
    }

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания задания:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/president-tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const validStatuses = ['pending', 'in_progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    const taskCheck = await pool.query(
      'SELECT * FROM president_tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const task = taskCheck.rows[0];

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    const isAllowed = allowedRoles.includes(userRole);
    const isCreator = task.created_by === userId;

    if (!isAllowed && !isCreator) {
      return res.status(403).json({ error: 'Недостаточно прав для изменения статуса' });
    }

    if (userRole === 'club_coordinator' && !isCreator) {
      return res.status(403).json({ error: 'Вы можете менять статус только своих заданий' });
    }

    const completedAt = status === 'completed' ? new Date() : null;

    const result = await pool.query(
      `
      UPDATE president_tasks 
      SET status = $1, completed_at = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [status, completedAt, id]
    );

    if (task.created_by !== userId) {
      await createNotification(
        task.created_by,
        'task',
        `📌 Статус задания изменён на "${status}"`,
        `Задание "${task.title}" теперь имеет статус: ${status}`,
        '/president-tasks',
        'normal'
      );
    }

    if (task.club_id) {
      const coordinators = await pool.query(
        'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
        [task.club_id]
      );
      for (const coord of coordinators.rows) {
        if (coord.profile_id !== userId && coord.profile_id !== task.created_by) {
          await createNotification(
            coord.profile_id,
            'task',
            `📌 Статус задания для президента изменён`,
            `Статус задания "${task.title}" изменён на: ${status}`,
            '/president-tasks',
            'normal'
          );
        }
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка изменения статуса:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/president-tasks/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    if (!response || response.trim() === '') {
      return res.status(400).json({ error: 'Текст ответа обязателен' });
    }

    const taskCheck = await pool.query(
      'SELECT * FROM president_tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const task = taskCheck.rows[0];

    if (userRole !== 'president' && userRole !== 'vice_president') {
      return res.status(403).json({ error: 'Только президенты клубов могут отвечать на задания' });
    }

    const userCheck = await pool.query(
      'SELECT is_president, club_id FROM users WHERE id = $1',
      [userId]
    );
    if (userCheck.rows.length === 0 || !userCheck.rows[0].is_president) {
      return res.status(403).json({ error: 'Вы не являетесь президентом клуба' });
    }

    if (task.assigned_to !== userId && !task.is_global) {
      return res.status(403).json({ error: 'Это задание не назначено вам' });
    }

    await pool.query(
      `
      INSERT INTO president_task_responses (task_id, user_id, response, created_at)
      VALUES ($1, $2, $3, NOW())
      `,
      [id, userId, response.trim()]
    );

    await createNotification(
      task.created_by,
      'task',
      '💬 Новый ответ на задание',
      `Получен ответ от президента клуба на задание "${task.title}"`,
      `/president-tasks`,
      'medium'
    );

    if (task.club_id) {
      const coordinators = await pool.query(
        'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
        [task.club_id]
      );
      for (const coord of coordinators.rows) {
        if (coord.profile_id !== task.created_by) {
          await createNotification(
            coord.profile_id,
            'task',
            '💬 Президент клуба ответил на задание',
            `Президент вашего клуба ответил на задание "${task.title}"`,
            `/president-tasks`,
            'normal'
          );
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'Ответ отправлен' 
    });
  } catch (error) {
    console.error('❌ Ошибка отправки ответа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/president-tasks/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        ptr.*,
        u.full_name as user_name,
        u.role as user_role,
        u.is_president
      FROM president_task_responses ptr
      LEFT JOIN users u ON ptr.user_id = u.id
      WHERE ptr.task_id = $1
      ORDER BY ptr.created_at DESC
      `,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения ответов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/president-tasks/:id', async (req, res) => {
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

    const taskCheck = await pool.query(
      'SELECT * FROM president_tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const task = taskCheck.rows[0];

    const allowedRoles = ['admin', 'movement_coordinator'];
    const isAllowed = allowedRoles.includes(userRole);
    const isCreator = task.created_by === userId;

    if (userRole === 'president' || userRole === 'vice_president') {
      return res.status(403).json({ error: 'Президент и вице-президент не могут удалять задания' });
    }

    if (!isAllowed && !isCreator) {
      return res.status(403).json({ error: 'Недостаточно прав для удаления' });
    }

    await pool.query('DELETE FROM president_task_responses WHERE task_id = $1', [id]);
    await pool.query('DELETE FROM president_tasks WHERE id = $1', [id]);

    res.json({ success: true, message: 'Задание удалено' });
  } catch (error) {
    console.error('❌ Ошибка удаления задания:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 34. ОФИЦИАЛЬНЫЕ ДОКУМЕНТЫ
// ============================================================
app.get('/api/documents', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;
    const userId = decoded.userId;

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет доступа к этому разделу' });
    }

    let query = `
      SELECT 
        d.*,
        u.full_name as created_by_name,
        u2.full_name as approved_by_name,
        (SELECT COUNT(*) FROM document_acknowledgments da WHERE da.document_id = d.id) as read_count,
        (SELECT COUNT(*) FROM document_acknowledgments da WHERE da.document_id = d.id AND da.user_id = $1) as is_read
      FROM official_documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.approved_by = u2.id
      WHERE 1=1
    `;
    const params = [userId];
    const conditions = [];

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      console.log('👑 Показываем все документы для:', userRole);
    } else if (['club_coordinator', 'tutor'].includes(userRole)) {
      conditions.push(`d.status = 'published'`);
      console.log('🏫 Показываем только опубликованные документы для:', userRole);
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' AND ') + ')';
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения документов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
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
      return res.status(403).json({ error: 'У вас нет прав для создания документов' });
    }

    const { title, content, document_type, is_urgent, priority } = req.body;

    if (!title || !content || !document_type) {
      return res.status(400).json({ error: 'Заголовок, содержание и тип документа обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO official_documents (
        title, content, document_type, is_urgent, priority, 
        status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, NOW(), NOW())
      RETURNING *`,
      [title, content, document_type, is_urgent || false, priority || 'normal', userId]
    );

    const newDocument = result.rows[0];

    if (userRole !== 'president') {
      const presidents = await pool.query(
        "SELECT id FROM users WHERE role = 'president'"
      );
      for (const p of presidents.rows) {
        await createNotification(
          p.id,
          'document',
          '📜 Новый документ на согласование',
          `Создан новый документ: "${title}"`,
          '/documents',
          'high'
        );
      }
    }

    res.status(201).json(newDocument);
  } catch (error) {
    console.error('❌ Ошибка создания документа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/documents/:id/submit', async (req, res) => {
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

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const check = await pool.query('SELECT * FROM official_documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    if (check.rows[0].created_by !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Вы можете отправлять только свои документы' });
    }

    const result = await pool.query(
      `UPDATE official_documents 
       SET status = 'pending_approval', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const presidents = await pool.query(
      "SELECT id FROM users WHERE role = 'president'"
    );
    for (const p of presidents.rows) {
      await createNotification(
        p.id,
        'document',
        '📜 Документ на согласовании',
        `Документ "${result.rows[0].title}" отправлен на согласование`,
        '/documents',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка отправки на согласование:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/documents/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (userRole !== 'president' && userRole !== 'vice_president') {
      return res.status(403).json({ error: 'Только президент движения может одобрять документы' });
    }

    const check = await pool.query('SELECT * FROM official_documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    if (check.rows[0].status !== 'pending_approval') {
      return res.status(400).json({ error: 'Документ не ожидает согласования' });
    }

    const result = await pool.query(
      `UPDATE official_documents 
       SET status = 'approved', 
           approved_by = $1, 
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [decoded.userId, id]
    );

    if (result.rows[0].created_by) {
      await createNotification(
        result.rows[0].created_by,
        'document',
        '✅ Документ одобрен',
        `Ваш документ "${result.rows[0].title}" одобрен президентом`,
        '/documents',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка одобрения документа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/documents/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (userRole !== 'president' && userRole !== 'vice_president') {
      return res.status(403).json({ error: 'Только президент движения может отклонять документы' });
    }

    const check = await pool.query('SELECT * FROM official_documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    const result = await pool.query(
      `UPDATE official_documents 
       SET status = 'rejected', 
           approved_by = $1, 
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [decoded.userId, id]
    );

    if (result.rows[0].created_by) {
      await createNotification(
        result.rows[0].created_by,
        'document',
        '❌ Документ отклонён',
        `Ваш документ "${result.rows[0].title}" отклонён. Причина: ${reason || 'Не указана'}`,
        '/documents',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка отклонения документа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/documents/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для публикации' });
    }

    const check = await pool.query('SELECT * FROM official_documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    if (check.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Документ должен быть одобрен перед публикацией' });
    }

    const result = await pool.query(
      `UPDATE official_documents 
       SET status = 'published', 
           published_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const allowedViewers = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'];
    const viewers = await pool.query(
      "SELECT id FROM users WHERE role = ANY($1::text[])",
      [allowedViewers]
    );
    
    for (const viewer of viewers.rows) {
      await createNotification(
        viewer.id,
        'document',
        '📢 Новый официальный документ',
        `Опубликован документ: "${result.rows[0].title}"`,
        '/documents',
        'normal'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка публикации документа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    await pool.query(
      `INSERT INTO document_acknowledgments (document_id, user_id, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (document_id, user_id) DO UPDATE SET read_at = NOW()`,
      [id, userId]
    );

    res.json({ message: 'Документ отмечен как прочитанный' });
  } catch (error) {
    console.error('❌ Ошибка отметки о прочтении:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
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
      return res.status(403).json({ error: 'Только администратор может удалять документы' });
    }

    const check = await pool.query('SELECT id, title FROM official_documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    const doc = check.rows[0];

    await pool.query('DELETE FROM document_acknowledgments WHERE document_id = $1', [id]);
    await pool.query('DELETE FROM document_comments WHERE document_id = $1', [id]);
    await pool.query('DELETE FROM official_documents WHERE id = $1', [id]);

    console.log(`✅ Документ "${doc.title}" удалён администратором`);

    res.json({ 
      message: 'Документ удалён',
      deleted_document: doc
    });
  } catch (error) {
    console.error('❌ Ошибка удаления документа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 35. НАЗНАЧЕНИЕ ТЬЮТОРОВ НА МЕРОПРИЯТИЯ
// ============================================================
app.post('/api/events/:eventId/tutors', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { tutor_id, role, notes } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для назначения тьюторов' });
    }

    if (!tutor_id) {
      return res.status(400).json({ error: 'tutor_id обязателен' });
    }

    const tutorCheck = await pool.query(
      'SELECT id, full_name, role FROM users WHERE id = $1 AND role = $2',
      [tutor_id, 'tutor']
    );
    if (tutorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тьютор не найден' });
    }

    const eventCheck = await pool.query(
      'SELECT id, title FROM events WHERE id = $1',
      [eventId]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    const existing = await pool.query(
      'SELECT id FROM event_tutor_assignments WHERE event_id = $1 AND tutor_id = $2',
      [eventId, tutor_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Тьютор уже назначен на это мероприятие' });
    }

    const result = await pool.query(
      `INSERT INTO event_tutor_assignments (
        event_id, tutor_id, role, status, assigned_by, assigned_at, notes
      ) VALUES ($1, $2, $3, 'pending', $4, NOW(), $5)
      RETURNING *`,
      [eventId, tutor_id, role || 'tutor', userId, notes || null]
    );

    await createNotification(
      tutor_id,
      'event',
      '📅 Новое назначение на мероприятие',
      `Вас назначили тьютором на мероприятие: "${event.title}"`,
      `/events/${eventId}`,
      'high'
    );

    const eventCreator = await pool.query(
      'SELECT created_by FROM events WHERE id = $1',
      [eventId]
    );
    if (eventCreator.rows.length > 0 && eventCreator.rows[0].created_by !== userId) {
      await createNotification(
        eventCreator.rows[0].created_by,
        'event',
        '👤 Тьютор назначен на мероприятие',
        `На мероприятие "${event.title}" назначен тьютор: ${tutorCheck.rows[0].full_name}`,
        `/events/${eventId}`,
        'medium'
      );
    }

    res.status(201).json({
      message: 'Тьютор назначен на мероприятие',
      assignment: result.rows[0],
      tutor: tutorCheck.rows[0]
    });
  } catch (error) {
    console.error('❌ Ошибка назначения тьютора:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/event-tutor-assignments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;
    const userId = decoded.userId;

    console.log(`👤 Запрос назначений от: ${userRole} (${userId})`);

    let query = `
      SELECT 
        eta.*,
        e.title as event_title,
        e.event_date,
        e.location,
        u.full_name as tutor_name,
        u2.full_name as assigned_by_name
      FROM event_tutor_assignments eta
      LEFT JOIN events e ON eta.event_id = e.id
      LEFT JOIN users u ON eta.tutor_id = u.id
      LEFT JOIN users u2 ON eta.assigned_by = u2.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'tutor') {
      query += ' AND eta.tutor_id = $1';
      params.push(userId);
      console.log(`👨‍🏫 Загрузка назначений для тьютора ${userId}`);
    }

    query += ' ORDER BY eta.assigned_at DESC';

    const result = await pool.query(query, params);
    console.log(`📥 Найдено назначений: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения назначений:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/:eventId/tutors', async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        eta.*,
        u.full_name as tutor_name,
        u.email as tutor_email,
        u.phone as tutor_phone,
        u2.full_name as assigned_by_name
      FROM event_tutor_assignments eta
      LEFT JOIN users u ON eta.tutor_id = u.id
      LEFT JOIN users u2 ON eta.assigned_by = u2.id
      WHERE eta.event_id = $1
      ORDER BY eta.assigned_at DESC
      `,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения назначений:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/event-tutor-assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const validStatuses = ['pending', 'accepted', 'declined'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    const check = await pool.query(
      'SELECT * FROM event_tutor_assignments WHERE id = $1',
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Назначение не найдено' });
    }

    if (check.rows[0].tutor_id !== userId) {
      return res.status(403).json({ error: 'Вы можете менять статус только своих назначений' });
    }

    const result = await pool.query(
      `UPDATE event_tutor_assignments 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    const assignment = result.rows[0];
    const eventCreator = await pool.query(
      'SELECT created_by, title FROM events WHERE id = $1',
      [assignment.event_id]
    );
    if (eventCreator.rows.length > 0) {
      const tutor = await pool.query(
        'SELECT full_name FROM users WHERE id = $1',
        [userId]
      );
      await createNotification(
        eventCreator.rows[0].created_by,
        'event',
        status === 'accepted' ? '✅ Тьютор принял назначение' : '❌ Тьютор отклонил назначение',
        `Тьютор ${tutor.rows[0].full_name} ${status === 'accepted' ? 'принял' : 'отклонил'} назначение на "${eventCreator.rows[0].title}"`,
        `/events/${assignment.event_id}`,
        'medium'
      );
    }

    res.json({
      message: `Статус изменён на "${status}"`,
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Ошибка обновления статуса:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/event-tutor-assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    const allowedRoles = ['admin', 'movement_coordinator'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления назначений' });
    }

    await pool.query('DELETE FROM event_tutor_assignments WHERE id = $1', [id]);

    res.json({ message: 'Назначение удалено' });
  } catch (error) {
    console.error('❌ Ошибка удаления назначения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ============================================================
// НОВЫЕ API ДЛЯ КООРДИНАТОРА ДВИЖЕНИЯ
// ============================================================
// ============================================================

// ============================================================
// 32. ДОКУМЕНТЫ (Центр документов) - РАБОЧАЯ ВЕРСИЯ
// ============================================================

// ===== ПОЛУЧЕНИЕ ВСЕХ ДОКУМЕНТОВ =====
app.get('/api/documents', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;
    const userId = decoded.userId;
    const isPresident = decoded.is_president || false;

    if (userRole === 'participant' || userRole === 'parent' || isPresident === true) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра документов' });
    }

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра документов' });
    }

    let query = `
      SELECT 
        d.*,
        u.full_name as created_by_name,
        c.name as club_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN clubs c ON d.club_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (clubResult.rows.length > 0) {
        const clubId = clubResult.rows[0].club_id;
        query += ` AND (d.club_id = $1 OR d.is_public = true OR d.club_id IS NULL)`;
        params.push(clubId);
      } else {
        query += ` AND (d.is_public = true OR d.club_id IS NULL)`;
      }
    }

    query += ' ORDER BY d.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения документов:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ПОЛУЧЕНИЕ ОДНОГО ДОКУМЕНТА =====
app.get('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;
    const isPresident = decoded.is_president || false;

    if (userRole === 'participant' || userRole === 'parent' || isPresident === true) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра документов' });
    }

    const result = await pool.query(
      `SELECT d.*, u.full_name as created_by_name, c.name as club_name
       FROM documents d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN clubs c ON d.club_id = c.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка получения документа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== СОЗДАНИЕ ДОКУМЕНТА (РАБОТАЕТ) =====
app.post('/api/documents', async (req, res) => {
  try {
    console.log('📥 POST /api/documents');

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания документов' });
    }

    const { title, content, category, document_type, is_public, club_id, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Заголовок обязателен' });
    }

    let finalClubId = club_id || null;
    if (userRole === 'club_coordinator' && !finalClubId) {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (clubResult.rows.length > 0) {
        finalClubId = clubResult.rows[0].club_id;
      }
    }

    const result = await pool.query(
      `INSERT INTO documents (
        title, content, category, document_type, is_public, club_id, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        title.trim(),
        content || '',
        category || 'general',
        document_type || 'pdf',
        is_public !== undefined ? is_public : true,
        finalClubId,
        tags || [],
        userId
      ]
    );

    console.log('✅ Документ сохранён! ID:', result.rows[0].id);

    // УВЕДОМЛЕНИЯ
    const users = await pool.query(
      `SELECT id FROM users 
       WHERE status = 'active' 
       AND role NOT IN ('participant', 'parent')
       AND (role != 'participant' OR is_president != true)`
    );

    for (const user of users.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          user.id,
          'document',
          `📢 Новый документ: ${result.rows[0].title}`,
          `Опубликован новый документ "${result.rows[0].title}"`,
          '/documents-center',
          'normal'
        ]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ОБНОВЛЕНИЕ ДОКУМЕНТА =====
app.put('/api/documents/:id', async (req, res) => {
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

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования документов' });
    }

    const { title, content, category, document_type, is_public, club_id, tags } = req.body;

    const check = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    if (userRole === 'club_coordinator' && check.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Вы можете редактировать только свои документы' });
    }

    const result = await pool.query(
      `UPDATE documents 
       SET title = $1, content = $2, category = $3, document_type = $4, 
           is_public = $5, club_id = $6, tags = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        title || check.rows[0].title,
        content || check.rows[0].content,
        category || check.rows[0].category,
        document_type || check.rows[0].document_type,
        is_public !== undefined ? is_public : check.rows[0].is_public,
        club_id || check.rows[0].club_id,
        tags || check.rows[0].tags,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== УДАЛЕНИЕ ДОКУМЕНТА =====
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления документов' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Документ удалён' });
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ API для документов загружены');

// ============================================================
// 33. ЗАДАЧИ (Планировщик задач)
// ============================================================

// ===== ПОЛУЧЕНИЕ ВСЕХ ЗАДАЧ =====
app.get('/api/tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра задач' });
    }

    const result = await pool.query(
      `
      SELECT 
        t.*,
        u.full_name as assigned_to_name,
        u2.full_name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ORDER BY t.created_at DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения задач:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== СОЗДАНИЕ ЗАДАЧИ =====
app.post('/api/tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания задач' });
    }

    const { title, description, category, priority, due_date, assigned_to, recurrence, recurrence_end } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Заголовок задачи обязателен' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        title, description, category, priority, due_date, assigned_to, 
        recurrence, recurrence_end, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        title.trim(),
        description || '',
        category || 'general',
        priority || 'medium',
        due_date || null,
        assigned_to || null,
        recurrence || 'none',
        recurrence_end || null,
        userId
      ]
    );

    // Логируем действие
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CREATE', 'task', result.rows[0].id, { title: result.rows[0].title }]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания задачи:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ОБНОВЛЕНИЕ ЗАДАЧИ =====
app.put('/api/tasks/:id', async (req, res) => {
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

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования задач' });
    }

    const { title, description, category, priority, status, due_date, assigned_to, recurrence, recurrence_end } = req.body;

    const check = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, category = $3, priority = $4, status = $5,
           due_date = $6, assigned_to = $7, recurrence = $8, recurrence_end = $9,
           updated_at = NOW(),
           completed_at = CASE WHEN $5 = 'completed' AND status != 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $10
       RETURNING *`,
      [
        title || check.rows[0].title,
        description || check.rows[0].description,
        category || check.rows[0].category,
        priority || check.rows[0].priority,
        status || check.rows[0].status,
        due_date || check.rows[0].due_date,
        assigned_to || check.rows[0].assigned_to,
        recurrence || check.rows[0].recurrence,
        recurrence_end || check.rows[0].recurrence_end,
        id
      ]
    );

    // Логируем действие
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'UPDATE', 'task', id, { title: result.rows[0].title, status: result.rows[0].status }]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления задачи:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== УДАЛЕНИЕ ЗАДАЧИ =====
app.delete('/api/tasks/:id', async (req, res) => {
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

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления задач' });
    }

    const check = await pool.query('SELECT title FROM tasks WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // Логируем действие
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'DELETE', 'task', id, { title: check.rows[0].title }]
    );

    res.json({ message: 'Задача удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления задачи:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 34. ШАБЛОНЫ ОТЧЁТОВ (ДЛЯ ВСЕХ РОЛЕЙ)
// ============================================================

// ===== ПОЛУЧЕНИЕ ВСЕХ ШАБЛОНОВ =====
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

    // Разрешаем доступ: админ, координатор движения, координатор КЮДа, тьютор
    if (!['admin', 'movement_coordinator', 'club_coordinator', 'tutor'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра шаблонов' });
    }

    let query = `
      SELECT 
        rt.*,
        u.full_name as created_by_name,
        c.name as club_name
      FROM report_templates rt
      LEFT JOIN users u ON rt.created_by = u.id
      LEFT JOIN clubs c ON rt.club_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Координатор КЮДа видит шаблоны:
    // 1. Созданные им
    // 2. Для его клуба
    // 3. Общие (без клуба)
    if (userRole === 'club_coordinator') {
      // Получаем клуб координатора
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      
      if (clubResult.rows.length > 0) {
        const clubId = clubResult.rows[0].club_id;
        query += ` AND (rt.created_by = $1 OR rt.club_id = $2 OR rt.club_id IS NULL)`;
        params.push(userId, clubId);
      } else {
        query += ` AND rt.created_by = $1`;
        params.push(userId);
      }
    }
    // Тьютор видит только общие шаблоны
    else if (userRole === 'tutor') {
      query += ` AND rt.club_id IS NULL`;
    }

    query += ' ORDER BY rt.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения шаблонов:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== СОЗДАНИЕ ШАБЛОНА =====
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

    // Разрешаем создание: админ, координатор движения, координатор КЮДа
    if (!['admin', 'movement_coordinator', 'club_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания шаблонов' });
    }

    const { name, description, category, template_data, club_id } = req.body;

    console.log('📥 Получены данные:', { name, description, category, club_id, template_data_length: template_data?.length });

    if (!name || !name.trim() || !template_data || !template_data.trim()) {
      return res.status(400).json({ error: 'Название и шаблон обязательны' });
    }

    // Если координатор КЮДа создаёт шаблон - автоматически привязываем к его клубу
    let finalClubId = club_id || null;
    if (userRole === 'club_coordinator' && !finalClubId) {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (clubResult.rows.length > 0) {
        finalClubId = clubResult.rows[0].club_id;
      }
    }

    const templateDataString = typeof template_data === 'string' ? template_data : JSON.stringify(template_data);

    const result = await pool.query(
      `INSERT INTO report_templates (
        name, description, category, template_data, club_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        name.trim(),
        description || '',
        category || 'general',
        templateDataString,
        finalClubId,
        userId
      ]
    );

    console.log('✅ Шаблон создан:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания шаблона:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 35. КАТЕГОРИИ ДОСТИЖЕНИЙ
// ============================================================

// ===== ПОЛУЧЕНИЕ ВСЕХ КАТЕГОРИЙ =====
app.get('/api/achievement-categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM achievement_categories WHERE is_active = true ORDER BY points DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения категорий:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 36. МАССОВЫЕ УВЕДОМЛЕНИЯ (РАСШИРЕННЫЙ)
// ============================================================

// ===== ПОЛУЧЕНИЕ ВСЕХ УВЕДОМЛЕНИЙ =====
app.get('/api/mass-notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра уведомлений' });
    }

    const result = await pool.query(`
      SELECT 
        mn.*,
        u.full_name as created_by_name,
        u.role as created_by_role
      FROM mass_notifications mn
      LEFT JOIN users u ON mn.created_by = u.id
      ORDER BY mn.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения уведомлений:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== УДАЛЕНИЕ МАССОВОГО УВЕДОМЛЕНИЯ =====
app.delete('/api/mass-notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления уведомлений' });
    }

    // Проверяем, что уведомление существует
    const check = await pool.query('SELECT id, title FROM mass_notifications WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    // Удаляем уведомление
    await pool.query('DELETE FROM mass_notifications WHERE id = $1', [id]);

    // Логируем действие
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        decoded.userId,
        'DELETE',
        'mass_notification',
        id,
        { title: check.rows[0].title }
      ]
    );

    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error('❌ Ошибка удаления уведомления:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ API для массовых уведомлений загружены');

// ============================================================
// 37. ЦЕЛИ И KPI
// ============================================================

// ===== ПОЛУЧЕНИЕ ВСЕХ ЦЕЛЕЙ =====
app.get('/api/goals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;
    const userId = decoded.userId;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра целей' });
    }

    const result = await pool.query(
      `
      SELECT 
        g.*,
        u.full_name as assigned_to_name,
        u2.full_name as created_by_name,
        c.name as club_name
      FROM goals g
      LEFT JOIN users u ON g.assigned_to = u.id
      LEFT JOIN users u2 ON g.created_by = u2.id
      LEFT JOIN clubs c ON g.club_id = c.id
      ORDER BY g.created_at DESC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения целей:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== СОЗДАНИЕ ЦЕЛИ =====
app.post('/api/goals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания целей' });
    }

    const { title, description, category, target_value, unit, start_date, end_date, assigned_to, club_id } = req.body;

    if (!title || !title.trim() || !target_value) {
      return res.status(400).json({ error: 'Заголовок и целевое значение обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO goals (
        title, description, category, target_value, unit, start_date, end_date, assigned_to, club_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        title.trim(),
        description || '',
        category || 'general',
        parseInt(target_value),
        unit || 'participants',
        start_date || null,
        end_date || null,
        assigned_to || null,
        club_id || null,
        userId
      ]
    );

    // Логируем действие
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CREATE', 'goal', result.rows[0].id, { title: result.rows[0].title, target: result.rows[0].target_value }]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания цели:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ОБНОВЛЕНИЕ ЦЕЛИ =====
app.put('/api/goals/:id', async (req, res) => {
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

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования целей' });
    }

    const { title, description, category, target_value, current_value, unit, status, start_date, end_date, assigned_to, club_id } = req.body;

    const check = await pool.query('SELECT * FROM goals WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    const result = await pool.query(
      `UPDATE goals 
       SET title = $1, description = $2, category = $3, target_value = $4, current_value = $5,
           unit = $6, status = $7, start_date = $8, end_date = $9, assigned_to = $10, 
           club_id = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        title || check.rows[0].title,
        description || check.rows[0].description,
        category || check.rows[0].category,
        target_value || check.rows[0].target_value,
        current_value !== undefined ? current_value : check.rows[0].current_value,
        unit || check.rows[0].unit,
        status || check.rows[0].status,
        start_date || check.rows[0].start_date,
        end_date || check.rows[0].end_date,
        assigned_to || check.rows[0].assigned_to,
        club_id || check.rows[0].club_id,
        id
      ]
    );

    // Логируем действие
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'UPDATE', 'goal', id, { title: result.rows[0].title, progress: `${result.rows[0].current_value}/${result.rows[0].target_value}` }]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления цели:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== УДАЛЕНИЕ ЦЕЛИ =====
app.delete('/api/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления целей' });
    }

    await pool.query('DELETE FROM goals WHERE id = $1', [id]);
    res.json({ message: 'Цель удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления цели:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 38. ЖУРНАЛ ДЕЙСТВИЙ (Activity Log)
// ============================================================

// ===== ПОЛУЧЕНИЕ ЖУРНАЛА =====
app.get('/api/activity-log', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра журнала' });
    }

    const { limit = 100, offset = 0, user_id, entity_type } = req.query;

    let query = `
      SELECT 
        al.*,
        u.full_name as user_name,
        u.role as user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (user_id) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (entity_type) {
      query += ` AND al.entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения журнала:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 39. СТАТИСТИКА СОГЛАСИЙ
// ============================================================

// ===== ПОЛУЧЕНИЕ СТАТИСТИКИ СОГЛАСИЙ =====
app.get('/api/consents-stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра статистики' });
    }

    const { club_id } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN consent_personal_data = true THEN 1 END) as personal_data,
        COUNT(CASE WHEN consent_photo_publication = true THEN 1 END) as photo_publication,
        COUNT(CASE WHEN consent_event_participation = true THEN 1 END) as event_participation,
        COUNT(CASE WHEN consent_personal_data = true AND consent_photo_publication = true AND consent_event_participation = true THEN 1 END) as all_consents,
        COUNT(CASE WHEN consent_personal_data = false OR consent_photo_publication = false OR consent_event_participation = false THEN 1 END) as missing_consents
      FROM users
      WHERE role = 'participant' AND status = 'active'
    `;
    const params = [];

    if (club_id) {
      query += ` AND club_id = $1`;
      params.push(club_id);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0] || { total: 0, personal_data: 0, photo_publication: 0, event_participation: 0, all_consents: 0, missing_consents: 0 });
  } catch (error) {
    console.error('❌ Ошибка получения статистики согласий:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ПОЛУЧЕНИЕ СПИСКА УЧАСТНИКОВ С НЕДОСТАЮЩИМИ СОГЛАСИЯМИ =====
app.get('/api/consents-missing', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра' });
    }

    const { club_id } = req.query;

    let query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.school,
        u.class_name,
        u.club_id,
        c.name as club_name,
        u.consent_personal_data,
        u.consent_photo_publication,
        u.consent_event_participation
      FROM users u
      LEFT JOIN clubs c ON u.club_id = c.id
      WHERE u.role = 'participant' 
        AND u.status = 'active'
        AND (u.consent_personal_data = false OR u.consent_photo_publication = false OR u.consent_event_participation = false)
    `;
    const params = [];

    if (club_id) {
      query += ` AND u.club_id = $1`;
      params.push(club_id);
    }

    query += ' ORDER BY u.full_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения списка:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ API для координатора движения загружены');

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: установлен`);
  console.log(`📝 Создать тестового пользователя: POST /api/create-test-user`);
  console.log(`👤 Тестовый пользователь: newadmin@dod.ru / 123456`);
});