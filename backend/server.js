// backend/server.js

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { authenticate, requireRole, requireAdmin, requireAdminOrCoordinator } from './middleware/auth.js';
import { logActivity, initLogger, getActivityLogs } from './lib/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dod-platform-2024';

console.log('🚀 ЗАПУСК БЭКЕНДА');

// ============================================================
// БАЗА ДАННЫХ
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

initLogger(pool);

pool.connect((err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
  }
});

// ============================================================
// CORS
// ============================================================
const allowedOrigins = [
  'https://dod-frontend.relaxdev.ru',
  'https://dod-platform-clean.relaxdev.ru',
  'http://localhost:5173',
  'http://localhost:3000'
];
app.set('trust proxy', true);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log(`⚠️ CORS: запрос от ${origin} отклонён`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// RATE LIMITING
// ============================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { 
    error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function isPasswordStrong(password) {
  if (password.length < 8) return { valid: false, message: 'Пароль должен содержать минимум 8 символов' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Пароль должен содержать заглавную букву' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Пароль должен содержать строчную букву' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Пароль должен содержать цифру' };
  return { valid: true };
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
    console.error('❌ Ошибка создания уведомления:', error.message);
    return null;
  }
}

async function getClubName(clubId) {
  if (!clubId) return 'Все клубы';
  const result = await pool.query('SELECT name FROM clubs WHERE id = $1', [clubId]);
  return result.rows[0]?.name || 'Клуб';
}

// ============================================================
// ТЕСТ
// ============================================================
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер работает' });
});

// ============================================================
// ВХОД
// ============================================================
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Попытка входа: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      console.log(`❌ Пользователь не найден: ${email}`);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const waitTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(403).json({
        error: `Аккаунт заблокирован на ${waitTime} минут`,
        code: 'ACCOUNT_LOCKED',
        locked_until: user.locked_until
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      const attempts = (user.login_attempts || 0) + 1;
      
      if (attempts >= 5) {
        await pool.query(
          `UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3`,
          [attempts, new Date(Date.now() + 30 * 60 * 1000), user.id]
        );
        await logActivity(user.id, 'ACCOUNT_LOCKED', 'user', user.id, {
          reason: 'Слишком много неудачных попыток входа',
          attempts: attempts
        });
        return res.status(403).json({
          error: 'Аккаунт заблокирован на 30 минут из-за множества неудачных попыток',
          code: 'ACCOUNT_LOCKED'
        });
      }
      
      await pool.query('UPDATE users SET login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      console.log(`❌ Неверный пароль для: ${email} (попытка ${attempts})`);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    await pool.query('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    if (user.must_change_password === true) {
      console.log(`⚠️ Пользователь ${email} должен сменить временный пароль`);
      const resetToken = jwt.sign(
        { userId: user.id, mustChange: true, email: user.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      return res.status(403).json({
        error: 'Необходимо изменить временный пароль',
        code: 'MUST_CHANGE_PASSWORD',
        must_change_password: true,
        reset_token: resetToken
      });
    }

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

    await logActivity(user.id, 'LOGIN', 'user', user.id, {
      email: user.email,
      role: user.role
    });

    console.log(`✅ Успешный вход: ${email}`);
    
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
// СМЕНА ПАРОЛЯ
// ============================================================
app.post('/api/change-password', async (req, res) => {
  try {
    const { current_password, new_password, reset_token } = req.body;
    
    let userId;
    let isFirstLogin = false;
    
    if (reset_token) {
      try {
        const decoded = jwt.verify(reset_token, JWT_SECRET);
        userId = decoded.userId;
        isFirstLogin = decoded.mustChange === true;
      } catch (error) {
        return res.status(401).json({
          error: 'Ссылка для смены пароля недействительна или истекла',
          code: 'INVALID_RESET_TOKEN'
        });
      }
    } else {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Требуется авторизация' });

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
      
      const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (user.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
      
      const valid = await bcrypt.compare(current_password, user.rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: 'Неверный текущий пароль' });
    }
    
    const strength = isPasswordStrong(new_password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message, code: 'WEAK_PASSWORD' });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = false, 
       last_password_change = NOW(), login_attempts = 0, locked_until = NULL WHERE id = $2`,
      [hashedPassword, userId]
    );
    
    await logActivity(userId, 'PASSWORD_CHANGED', 'user', userId, {
      is_first_login: isFirstLogin
    });
    
    if (isFirstLogin) {
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      const userData = user.rows[0];
      
      const token = jwt.sign(
        {
          userId: userData.id,
          email: userData.email,
          role: userData.role,
          full_name: userData.full_name,
          club_id: userData.club_id,
          is_president: userData.is_president || false
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.json({
        message: 'Пароль успешно изменён! Добро пожаловать в систему.',
        token: token,
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          avatar_url: userData.avatar_url || null,
          club_id: userData.club_id || null
        },
        is_first_login: true
      });
    }
    
    res.json({ message: 'Пароль успешно изменён', is_first_login: false });
    
  } catch (error) {
    console.error('❌ Ошибка смены пароля:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАКРЫТАЯ РЕГИСТРАЦИЯ
// ============================================================
app.post('/api/register', async (req, res) => {
  return res.status(403).json({
    error: 'Регистрация закрыта. Аккаунты создаются только администрацией.',
    code: 'REGISTRATION_CLOSED'
  });
});

// ============================================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
              u.birth_date, u.is_minor, u.registration_status, u.interests, u.bio, u.city, 
              u.position, u.status, u.club_id, u.created_at, u.avatar_url, u.is_president,
              u.social_links, u.skills, u.education, u.achievements, u.telegram, u.vk,
              u.must_change_password,
              c.name as club_name
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка /api/me:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО АДМИН)
// ============================================================
app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      email, full_name, role, phone, school, class_name, club_id, 
      birth_date, password 
    } = req.body;

    console.log('📝 СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ:');
    console.log(`  👤 ФИО: ${full_name}`);
    console.log(`  📧 Email: ${email || 'авто'}`);
    console.log(`  🎭 Роль: ${role || 'participant'}`);
    console.log(`  🏫 Клуб ID: ${club_id || 'не указан'}`);

    if (!full_name) {
      return res.status(400).json({ error: 'full_name обязателен' });
    }

    let finalEmail = email;
    let isAutoGenerated = false;
    
    if (!finalEmail) {
      finalEmail = generateEmailFromName(full_name);
      isAutoGenerated = true;
      console.log(`  📧 Сгенерирован email: ${finalEmail}`);
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [finalEmail]);
    if (existing.rows.length > 0) {
      const randomSuffix = Math.floor(Math.random() * 10000);
      const baseEmail = finalEmail.split('@')[0];
      const domain = finalEmail.split('@')[1] || 'dod.local';
      finalEmail = `${baseEmail}${randomSuffix}@${domain}`;
      isAutoGenerated = true;
      console.log(`  📧 Email занят, новый: ${finalEmail}`);
    }

    const tempPassword = password || generatePassword();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    let finalClubId = null;
    let clubName = null;
    
    if (club_id) {
      console.log(`  🔍 Проверка клуба: ${club_id}`);
      const clubCheck = await pool.query('SELECT id, name FROM clubs WHERE id = $1', [club_id]);
      if (clubCheck.rows.length > 0) {
        finalClubId = club_id;
        clubName = clubCheck.rows[0].name;
        console.log(`  ✅ Клуб найден: ${clubName} (${finalClubId})`);
      } else {
        console.log(`  ⚠️ Клуб ${club_id} НЕ НАЙДЕН!`);
      }
    }

    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, full_name, role, phone, school, class_name, 
        birth_date, status, must_change_password, created_by, created_at,
        club_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true, $9, NOW(), $10)
      RETURNING id, email, full_name, role, club_id`,
      [
        finalEmail, 
        password_hash, 
        full_name, 
        role || 'participant', 
        phone || '', 
        school || '', 
        class_name || '', 
        birth_date || null, 
        req.user.userId,
        finalClubId
      ]
    );

    const user = result.rows[0];
    console.log(`  ✅ Пользователь создан: ${user.id}`);

    if (finalClubId) {
      console.log(`  🔗 Привязка к клубу ${finalClubId}...`);
      await pool.query('UPDATE users SET club_id = $1 WHERE id = $2', [finalClubId, user.id]);
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW()) ON CONFLICT (profile_id, club_id) DO NOTHING`,
        [user.id, finalClubId]
      );
      if (role === 'club_coordinator') {
        await pool.query(
          `INSERT INTO club_coordinators (profile_id, club_id, created_at)
           VALUES ($1, $2, NOW()) ON CONFLICT (profile_id, club_id) DO NOTHING`,
          [user.id, finalClubId]
        );
        console.log(`  ✅ Координатор привязан к клубу ${clubName}`);
      } else {
        console.log(`  ✅ Участник привязан к клубу ${clubName}`);
      }
    } else {
      console.log(`  ⚠️ Пользователь создан БЕЗ клуба`);
    }

    const updatedUser = await pool.query(
      `SELECT id, email, full_name, role, club_id FROM users WHERE id = $1`,
      [user.id]
    );

    console.log(`  📦 Итог: club_id = ${updatedUser.rows[0].club_id || 'null'}`);

    await logActivity(req.user.userId, 'CREATE_USER', 'user', user.id, {
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      club_id: finalClubId,
      club_name: clubName,
      temp_password: tempPassword
    });

    res.status(201).json({
      message: 'Пользователь создан!',
      user: updatedUser.rows[0],
      temp_password: tempPassword,
      is_auto_generated: isAutoGenerated,
      must_change_password: true,
      club_id: finalClubId,
      club_name: clubName
    });

  } catch (error) {
    console.error('❌ ОШИБКА создания пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ПРИКРЕПЛЕНИЕ К КЛУБУ (АДМИН)
// ============================================================
app.patch('/api/users/:id/assign-club', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { club_id } = req.body;
    
    const userRole = req.user.role;
    
    console.log(`📌 ПРИКРЕПЛЕНИЕ К КЛУБУ:`);
    console.log(`  👤 Пользователь: ${id}`);
    console.log(`  🏫 Клуб: ${club_id || 'ОТКРЕПИТЬ'}`);
    
    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    
    const userCheck = await pool.query('SELECT id, full_name, club_id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userCheck.rows[0];
    
    if (!club_id) {
      await pool.query('UPDATE users SET club_id = NULL WHERE id = $1', [id]);
      return res.json({ 
        message: 'Пользователь откреплён от клуба',
        user: { id: user.id, full_name: user.full_name },
        club_id: null
      });
    }
    
    const clubCheck = await pool.query('SELECT id, name FROM clubs WHERE id = $1', [club_id]);
    if (clubCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Клуб не найден' });
    }
    
    const club = clubCheck.rows[0];
    
    await pool.query('UPDATE users SET club_id = $1 WHERE id = $2', [club_id, id]);
    await pool.query(
      `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
       VALUES ($1, $2, 'active', NOW()) ON CONFLICT (profile_id, club_id) DO NOTHING`,
      [id, club_id]
    );
    
    await logActivity(req.user.userId, 'ASSIGN_CLUB', 'user', id, {
      user: user.full_name,
      club: club.name
    });
    
    res.json({
      message: 'Пользователь прикреплён к клубу',
      user: { id: user.id, full_name: user.full_name },
      club: { id: club.id, name: club.name }
    });
  } catch (error) {
    console.error('❌ Ошибка прикрепления к клубу:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// СБРОС ПАРОЛЯ (ТОЛЬКО АДМИН)
// ============================================================
app.post('/api/users/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const userCheck = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userCheck.rows[0];
    
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = true,
       last_password_change = NOW(), login_attempts = 0, locked_until = NULL WHERE id = $2`,
      [hashedPassword, id]
    );

    await logActivity(req.user.userId, 'RESET_PASSWORD', 'user', id, {
      user: user.full_name,
      email: user.email
    });

    res.json({
      message: 'Пароль сброшен',
      temp_password: newPassword,
      must_change_password: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Ошибка сброса пароля:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school, u.class_name,
              u.birth_date, u.is_minor, u.registration_status, u.interests, u.bio, u.city, 
              u.position, u.status, u.club_id, u.created_at, u.avatar_url,
              u.social_links, u.skills, u.education, u.achievements, u.telegram, u.vk,
              u.must_change_password,
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
// ПОЛУЧЕНИЕ УЧАСТНИКОВ
// ============================================================
app.get('/api/participants', authenticate, async (req, res) => {
  try {
    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    let query = `
      SELECT u.id, u.email, u.full_name, u.role, u.phone, u.school,
             u.class_name, u.birth_date, u.created_at, u.status, u.avatar_url,
             u.club_id, c.name as club_name
      FROM users u
      LEFT JOIN clubs c ON u.club_id = c.id
      WHERE u.role = 'participant'
    `;
    const params = [];

    if (req.user.role === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [req.user.userId]
      );
      if (clubResult.rows.length > 0) {
        query += ' AND u.club_id = $1';
        params.push(clubResult.rows[0].club_id);
      } else {
        return res.json([]);
      }
    }

    query += ' ORDER BY u.full_name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.patch('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, phone, school, class_name, club_id, status, position } = req.body;

    const check = await pool.query('SELECT id, role, club_id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const oldRole = check.rows[0].role;
    const oldClubId = check.rows[0].club_id;

    if (role && role !== oldRole && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администратор может изменять роль' });
    }

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

    if (newRole === 'club_coordinator' && newClubId) {
      await pool.query(
        `INSERT INTO club_coordinators (profile_id, club_id, created_at)
         VALUES ($1, $2, NOW()) ON CONFLICT (profile_id, club_id) DO NOTHING`,
        [id, newClubId]
      );
    }

    if (newRole === 'participant' && newClubId) {
      await pool.query(
        `INSERT INTO club_participants (profile_id, club_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW()) ON CONFLICT (profile_id, club_id) DO NOTHING`,
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
// УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО АДМИН)
// ============================================================
app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
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
// КЛУБЫ
// ============================================================
app.get('/api/clubs', authenticate, async (req, res) => {
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
// ДОСТИЖЕНИЯ
// ============================================================
app.get('/api/achievements', authenticate, async (req, res) => {
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

app.post('/api/achievements', authenticate, async (req, res) => {
  try {
    const { participant_id, title, description, achievement_date } = req.body;

    if (!participant_id || !title) {
      return res.status(400).json({ error: 'participant_id и title обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO achievements (participant_id, title, description, achievement_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [participant_id, title, description || '', achievement_date || new Date().toISOString().split('T')[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/achievements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM achievements WHERE id = $1', [id]);
    res.json({ message: 'Достижение удалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// СОБЫТИЯ — ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================================

app.get('/api/events', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📋 Запрос событий: userId=${userId}, role=${userRole}`);

    let query = `
      SELECT e.*, 
             c.name as club_name,
             u.full_name as created_by_name,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as participants_count
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    // --- АДМИН/ДВИЖЕНИЕ/ПРЕЗИДЕНТ ---
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      // Видят всё
      console.log('👑 Пользователь с высокими правами видит все события');
    } 
    // --- КООРДИНАТОР КЛУБА ---
    else if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      
      if (clubResult.rows.length > 0) {
        const clubId = clubResult.rows[0].club_id;
        // 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ: видит ВСЕ события СВОЕГО клуба
        conditions.push(`(e.club_id = $${params.length + 1})`);
        params.push(clubId);
        console.log(`🏫 Координатор КЮДа ${userId} видит события клуба ${clubId}`);
      } else {
        conditions.push('1 = 0');
        console.log(`⚠️ Координатор ${userId} не привязан к клубу`);
      }
    } 
    // --- УЧАСТНИК ---
    else if (userRole === 'participant') {
      const user = await pool.query('SELECT club_id FROM users WHERE id = $1', [userId]);
      if (user.rows.length > 0 && user.rows[0].club_id) {
        const clubId = user.rows[0].club_id;
        conditions.push(`(e.club_id = $${params.length + 1} OR e.is_global = true)`);
        params.push(clubId);
      } else {
        conditions.push(`e.is_global = true`);
      }
    } 
    // --- ТЬЮТОР ---
    else if (userRole === 'tutor') {
      const assignments = await pool.query(
        'SELECT event_id FROM event_tutor_assignments WHERE tutor_id = $1 AND status = $2',
        [userId, 'accepted']
      );
      if (assignments.rows.length > 0) {
        const eventIds = assignments.rows.map(r => r.event_id);
        conditions.push(`(e.id = ANY($${params.length + 1}::uuid[]))`);
        params.push(eventIds);
      } else {
        conditions.push('1 = 0');
      }
    } 
    // --- РОДИТЕЛЬ ---
    else if (userRole === 'parent') {
      const children = await pool.query(
        'SELECT child_id FROM child_parent WHERE parent_id = $1 AND status = $2',
        [userId, 'active']
      );
      if (children.rows.length > 0) {
        const childIds = children.rows.map(r => r.child_id);
        conditions.push(`(e.id IN (SELECT event_id FROM registrations WHERE user_id = ANY($${params.length + 1}::uuid[])))`);
        params.push(childIds);
      } else {
        conditions.push('1 = 0');
      }
    } 
    // --- ОСТАЛЬНЫЕ ---
    else {
      conditions.push('1 = 0');
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }

    query += ' ORDER BY e.event_date ASC';

    console.log('📋 Выполняется запрос с условиями:', conditions);
    console.log('📋 Параметры:', params);

    const result = await pool.query(query, params);
    
    console.log(`✅ Найдено ${result.rows.length} событий для пользователя ${userId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения событий:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// СОЗДАНИЕ СОБЫТИЯ
// ============================================================
app.post('/api/events', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

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
      form_url, 
      is_global,
      is_club_event
    } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Название и дата обязательны' });
    }

    let finalClubId = club_id || null;
    let finalIsGlobal = is_global || false;
    let finalIsClubEvent = is_club_event || false;

    console.log(`📝 СОЗДАНИЕ СОБЫТИЯ:`);
    console.log(`  📌 Название: ${title}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);
    console.log(`  🏫 Клуб: ${finalClubId}`);
    console.log(`  🌍 Глобальное: ${finalIsGlobal}`);

    // Если координатор клуба — проверяем доступ к клубу
    if (userRole === 'club_coordinator') {
      if (!finalClubId) {
        // Если клуб не указан, берём из привязки
        const clubResult = await pool.query(
          'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
          [userId]
        );
        if (clubResult.rows.length > 0) {
          finalClubId = clubResult.rows[0].club_id;
          finalIsClubEvent = true;
          finalIsGlobal = false;
          console.log(`  🏫 Автоматически привязан к клубу: ${finalClubId}`);
        } else {
          return res.status(400).json({ error: 'Вы не привязаны ни к одному КЮДу' });
        }
      } else {
        // Проверяем, что координатор имеет доступ к указанному клубу
        const clubCheck = await pool.query(
          'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
          [userId, finalClubId]
        );
        if (clubCheck.rows.length === 0) {
          return res.status(403).json({ error: 'У вас нет доступа к этому клубу' });
        }
        finalIsClubEvent = true;
        finalIsGlobal = false;
      }
    }

    // Админ может создавать глобальные события
    if (['admin', 'movement_coordinator'].includes(userRole)) {
      if (finalIsGlobal) {
        finalIsGlobal = true;
        finalClubId = null;
        finalIsClubEvent = false;
        console.log(`  🌍 Создаётся глобальное событие`);
      }
    }

    // Участник не может создавать события
    if (userRole === 'participant') {
      return res.status(403).json({ error: 'Участники не могут создавать мероприятия' });
    }

    const result = await pool.query(
      `INSERT INTO events (
        title, description, location, event_date, end_date, start_time, end_time,
        type, capacity, club_id, form_url, is_global, is_club_event, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *`,
      [
        title.trim(), 
        description || '', 
        location || '', 
        event_date,
        end_date || event_date, 
        start_time || null, 
        end_time || null,
        type || 'internal', 
        capacity || 20, 
        finalClubId,
        form_url || null, 
        finalIsGlobal, 
        finalIsClubEvent, 
        userId
      ]
    );

    console.log(`✅ Событие создано: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания события:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ОБНОВЛЕНИЕ СОБЫТИЯ
// ============================================================
app.patch('/api/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
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
      form_url,
      is_global,
      is_club_event,
      club_id
    } = req.body;

    console.log(`📝 ОБНОВЛЕНИЕ СОБЫТИЯ ${id}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    const check = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = check.rows[0];

    let canEdit = false;

    // Админ, координатор движения, президент — могут редактировать всё
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canEdit = true;
      console.log('  ✅ Высокие права — можно редактировать');
    } 
    // Координатор клуба — может редактировать события своего клуба
    else if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, event.club_id]
      );
      if (clubCheck.rows.length > 0) {
        canEdit = true;
        console.log('  ✅ Координатор клуба — можно редактировать');
      } else {
        console.log('  ❌ Нет доступа к этому клубу');
      }
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования' });
    }

    // Проверяем, может ли пользователь менять клуб/глобальность
    let finalClubId = club_id !== undefined ? club_id : event.club_id;
    let finalIsGlobal = is_global !== undefined ? is_global : event.is_global;
    let finalIsClubEvent = is_club_event !== undefined ? is_club_event : event.is_club_event;

    // Если координатор клуба — нельзя делать событие глобальным
    if (userRole === 'club_coordinator') {
      finalIsGlobal = false;
      if (finalClubId !== event.club_id && finalClubId) {
        const clubCheck = await pool.query(
          'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
          [userId, finalClubId]
        );
        if (clubCheck.rows.length === 0) {
          return res.status(403).json({ error: 'У вас нет доступа к этому клубу' });
        }
      }
    }

    // Только админ может делать глобальные события
    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      if (event.is_global === true && finalIsGlobal === false) {
        // Можно убрать глобальность
      } else if (event.is_global === false && finalIsGlobal === true) {
        return res.status(403).json({ error: 'Только администратор может делать событие глобальным' });
      }
    }

    const result = await pool.query(
      `UPDATE events 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           event_date = COALESCE($4, event_date),
           end_date = COALESCE($5, end_date),
           start_time = $6,
           end_time = $7,
           type = COALESCE($8, type),
           capacity = COALESCE($9, capacity),
           form_url = $10,
           club_id = $11,
           is_global = $12,
           is_club_event = $13
       WHERE id = $14
       RETURNING *`,
      [
        title, 
        description, 
        location, 
        event_date, 
        end_date, 
        start_time, 
        end_time, 
        type, 
        capacity, 
        form_url,
        finalClubId,
        finalIsGlobal,
        finalIsClubEvent,
        id
      ]
    );

    console.log(`✅ Событие ${id} обновлено`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления события:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// УДАЛЕНИЕ СОБЫТИЯ
// ============================================================
app.delete('/api/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`🗑️ УДАЛЕНИЕ МЕРОПРИЯТИЯ ${id}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];
    let canDelete = false;

    // Админ, координатор движения, президент — могут удалять всё
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canDelete = true;
      console.log('  ✅ Высокие права — можно удалить');
    } 
    // Координатор клуба — может удалять события своего клуба
    else if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, event.club_id]
      );
      if (clubCheck.rows.length > 0) {
        canDelete = true;
        console.log('  ✅ Координатор клуба — можно удалить');
      } else {
        console.log('  ❌ Нет доступа к этому клубу');
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'У вас нет прав для удаления мероприятия' });
    }

    // Удаляем связанные данные
    await pool.query('DELETE FROM event_participants WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM event_tutor_assignments WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM registrations WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    console.log(`✅ Событие "${event.title}" удалено`);
    res.json({ 
      message: 'Мероприятие удалено', 
      deleted_event: event.title 
    });
  } catch (error) {
    console.error('❌ Ошибка удаления мероприятия:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ПОЛУЧЕНИЕ МЕРОПРИЯТИЙ КЛУБА ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.get('/api/my-club-events', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📋 Запрос мероприятий клуба: userId=${userId}, role=${userRole}`);

    let clubId = null;

    // Определяем club_id пользователя
    if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (clubResult.rows.length > 0) {
        clubId = clubResult.rows[0].club_id;
      }
    } else {
      const userCheck = await pool.query('SELECT club_id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length > 0) {
        clubId = userCheck.rows[0].club_id;
      }
    }

    if (!clubId) {
      console.log('❌ У пользователя нет клуба');
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT e.*, c.name as club_name, u.full_name as proposed_by_name
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       LEFT JOIN users u ON e.proposed_by = u.id
       WHERE e.club_id = $1
       ORDER BY e.event_date ASC`,
      [clubId]
    );

    console.log(`✅ Найдено ${result.rows.length} мероприятий клуба ${clubId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения мероприятий клуба:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// РЕГИСТРАЦИИ
// ============================================================
app.get('/api/registrations', authenticate, async (req, res) => {
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

app.post('/api/registrations', authenticate, async (req, res) => {
  try {
    const { user_id, event_id } = req.body;

    if (!user_id || !event_id) {
      return res.status(400).json({ error: 'user_id и event_id обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO registrations (user_id, event_id, status, registered_at)
       VALUES ($1, $2, 'pending', NOW()) RETURNING *`,
      [user_id, event_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ОБРАЩЕНИЯ — ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================================

// ПОЛУЧЕНИЕ ОБРАЩЕНИЙ
app.get('/api/appeals', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    console.log(`📋 ЗАПРОС ОБРАЩЕНИЙ: userId=${userId}, role=${userRole}`);

    let query = `
      SELECT a.*, 
             u.full_name as coordinator_name,
             c.name as club_name,
             r.full_name as resolved_by_name
      FROM appeals a
      LEFT JOIN users u ON a.coordinator_id = u.id
      LEFT JOIN clubs c ON a.club_id = c.id
      LEFT JOIN users r ON a.resolved_by = r.id
      WHERE 1=1
    `;
    const params = [];

    // Координатор видит только свои обращения
    if (userRole === 'club_coordinator') {
      query += ' AND a.coordinator_id = $1';
      params.push(userId);
    } 
    // Админ/Движение/Президент видят всё
    else if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      query += ' AND 1 = 0';
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения обращений:', error);
    res.status(500).json({ error: error.message });
  }
});

// СОЗДАНИЕ ОБРАЩЕНИЯ
app.post('/api/appeals', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { subject, message, priority } = req.body;

    console.log('📨 СОЗДАНИЕ ОБРАЩЕНИЯ:');
    console.log(`  👤 Пользователь: ${userId}`);
    console.log(`  📝 Тема: ${subject}`);
    console.log(`  📄 Сообщение: ${message?.substring(0, 50)}...`);

    if (!subject || !message) {
      return res.status(400).json({ error: 'subject и message обязательны' });
    }

    if (userRole !== 'club_coordinator') {
      return res.status(403).json({ error: 'Только координаторы КЮДа могут создавать обращения' });
    }

    // Получаем club_id координатора
    const clubResult = await pool.query(
      'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
      [userId]
    );
    
    if (clubResult.rows.length === 0) {
      return res.status(400).json({ error: 'Вы не привязаны ни к одному КЮДу' });
    }

    const clubId = clubResult.rows[0].club_id;
    
    // Проверяем, что клуб существует
    const clubCheck = await pool.query(
      'SELECT id, name FROM clubs WHERE id = $1',
      [clubId]
    );
    
    if (clubCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Клуб не найден' });
    }

    console.log(`  🏫 Клуб: ${clubCheck.rows[0].name} (${clubId})`);

    // ✅ ИСПРАВЛЕНО: явное приведение типов
    const result = await pool.query(
      `INSERT INTO appeals (
        club_id, 
        coordinator_id, 
        subject, 
        message, 
        priority, 
        status, 
        created_at
      ) VALUES (
        $1::uuid, 
        $2::uuid, 
        $3, 
        $4, 
        $5, 
        'pending', 
        NOW()
      ) RETURNING *`,
      [clubId, userId, subject.trim(), message.trim(), priority || 'medium']
    );

    console.log(`✅ Обращение создано: ${result.rows[0].id}`);

    // Отправляем уведомления админам
    const admins = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'movement_coordinator', 'president', 'vice_president')"
    );
    
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
         VALUES ($1, 'appeal', '📨 Новое обращение', $2, '/appeals', 'high', NOW())`,
        [admin.id, `Новое обращение от координатора: ${subject.trim()}`]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания обращения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ОТВЕТ НА ОБРАЩЕНИЕ
app.post('/api/appeals/:id/reply', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📝 ОТВЕТ НА ОБРАЩЕНИЕ ${id}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для ответа на обращения' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Текст ответа обязателен' });
    }

    const appealCheck = await pool.query('SELECT * FROM appeals WHERE id = $1', [id]);
    if (appealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const appeal = appealCheck.rows[0];

    if (appeal.status === 'resolved' || appeal.status === 'rejected') {
      return res.status(400).json({ error: 'Это обращение уже закрыто' });
    }

    // Сохраняем ответ
    await pool.query(
      `INSERT INTO appeal_replies (appeal_id, author_id, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, userId, message.trim()]
    );

    // Обновляем статус обращения
    const newStatus = status || 'in_progress';
    const resolvedAt = newStatus === 'resolved' || newStatus === 'rejected' ? new Date() : null;
    
    await pool.query(
      `UPDATE appeals SET status = $1, resolved_by = $2, resolved_at = $3 WHERE id = $4`,
      [newStatus, userId, resolvedAt, id]
    );

    // Уведомляем координатора
    if (appeal.coordinator_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
         VALUES ($1, 'appeal', '📨 Ответ на обращение', $2, '/appeals', 'high', NOW())`,
        [appeal.coordinator_id, `Получен ответ на ваше обращение: ${appeal.subject}`]
      );
    }

    const result = await pool.query(
      `SELECT a.*, u.full_name as coordinator_name, c.name as club_name, r.full_name as resolved_by_name
       FROM appeals a 
       LEFT JOIN users u ON a.coordinator_id = u.id
       LEFT JOIN clubs c ON a.club_id = c.id 
       LEFT JOIN users r ON a.resolved_by = r.id 
       WHERE a.id = $1`,
      [id]
    );

    res.json({ message: 'Ответ отправлен', appeal: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка ответа на обращение:', error);
    res.status(500).json({ error: error.message });
  }
});

// ПОЛУЧЕНИЕ ОТВЕТОВ НА ОБРАЩЕНИЕ
app.get('/api/appeals/:id/replies', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.full_name as author_name, u.role as author_role
       FROM appeal_replies r 
       LEFT JOIN users u ON r.author_id = u.id
       WHERE r.appeal_id = $1 
       ORDER BY r.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения ответов:', error);
    res.status(500).json({ error: error.message });
  }
});

// УДАЛЕНИЕ ОБРАЩЕНИЯ
app.delete('/api/appeals/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    console.log(`🗑️ УДАЛЕНИЕ ОБРАЩЕНИЯ ${id}`);

    // Проверяем, существует ли обращение
    const check = await pool.query('SELECT * FROM appeals WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const appeal = check.rows[0];

    // Проверяем права: админ может удалить всё, координатор только свои
    let canDelete = false;
    if (userRole === 'admin' || userRole === 'movement_coordinator') {
      canDelete = true;
    } else if (userRole === 'club_coordinator' && appeal.coordinator_id === userId) {
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'У вас нет прав для удаления этого обращения' });
    }

    // Удаляем ответы
    await pool.query('DELETE FROM appeal_replies WHERE appeal_id = $1', [id]);
    // Удаляем обращение
    await pool.query('DELETE FROM appeals WHERE id = $1', [id]);

    console.log(`✅ Обращение ${id} удалено`);
    res.json({ message: 'Обращение удалено' });
  } catch (error) {
    console.error('❌ Ошибка удаления обращения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАПРОСЫ НА ТЬЮТОРОВ
// ============================================================
app.get('/api/tutor-requests', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT tr.*, u.full_name as requested_by_name, c.name as club_name, r.full_name as reviewed_by_name
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

app.post('/api/tutor-requests', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { tutor_name, tutor_email, tutor_phone, event_date, event_name, event_description, role, responsibilities, notes } = req.body;

    if (!tutor_name || !event_date || !event_name) {
      return res.status(400).json({ error: 'ФИО тьютора, дата и название мероприятия обязательны' });
    }

    if (userRole !== 'club_coordinator') {
      return res.status(403).json({ error: 'Только координаторы КЮДа могут создавать запросы' });
    }

    let clubId = null;
    const clubResult = await pool.query('SELECT club_id FROM club_coordinators WHERE profile_id = $1', [userId]);
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

app.patch('/api/tutor-requests/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для рассмотрения запросов' });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Статус должен быть "approved" или "rejected"' });
    }

    const result = await pool.query(
      `UPDATE tutor_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW(), comment = $3 WHERE id = $4 RETURNING *`,
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
app.post('/api/upload-avatar', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatar_base64 } = req.body;

    if (!avatar_base64) {
      return res.status(400).json({ error: 'Нет данных изображения' });
    }

    if (!avatar_base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }

    const sizeInBytes = Buffer.from(avatar_base64.split(',')[1], 'base64').length;
    if (sizeInBytes > 500 * 1024) {
      return res.status(400).json({ error: 'Изображение слишком большое. Максимум 500KB.' });
    }

    const result = await pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url`,
      [avatar_base64, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ message: 'Аватар обновлён', avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-news-image', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const { image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: 'Нет данных изображения' });
    }

    if (!image_base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }

    res.json({ message: 'Изображение загружено', image_url: image_base64 });
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ИСТОРИЯ УЧАСТНИКА
// ============================================================
app.get('/api/participant-events/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, c.name as club_name,
              CASE WHEN r.status = 'confirmed' THEN 'Участвовал'
                   WHEN r.status = 'pending' THEN 'Записан'
                   ELSE 'Не участвовал' END as participation_status
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

app.get('/api/participant-stats/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const eventsResult = await pool.query(
      `SELECT COUNT(*) as total_events,
              COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as attended_events
       FROM registrations WHERE user_id = $1`,
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
       FROM achievements a LEFT JOIN users u ON a.participant_id = u.id
       WHERE a.participant_id = $1 ORDER BY a.created_at DESC LIMIT 5`,
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
// ДЕТИ РОДИТЕЛЯ
// ============================================================
app.get('/api/parent-children', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.school, u.class_name, u.birth_date, u.avatar_url,
              u.status, u.consent_personal_data, u.consent_photo_publication, u.consent_event_participation,
              u.consent_agreement_date, u.interests, u.bio, u.city,
              cl.name as club_name, cp.parent_id, cp.child_id, cp.status as link_status
       FROM child_parent cp
       LEFT JOIN users u ON cp.child_id = u.id
       LEFT JOIN clubs cl ON u.club_id = cl.id
       WHERE cp.parent_id = $1 AND cp.status = 'active'
       ORDER BY u.full_name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения детей:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ПРИВЯЗКА РЕБЁНКА К РОДИТЕЛЮ
// ============================================================
app.post('/api/parent-link-child', authenticate, async (req, res) => {
  try {
    const parentId = req.user.userId;
    const parentRole = req.user.role;

    if (parentRole !== 'parent') {
      return res.status(403).json({ error: 'Только родители могут привязывать детей' });
    }

    const { child_email, child_password } = req.body;

    if (!child_email || !child_password) {
      return res.status(400).json({ error: 'Email и пароль ребёнка обязательны' });
    }

    const childResult = await pool.query('SELECT id, full_name, role, password_hash FROM users WHERE email = $1', [child_email]);
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

    const existingLink = await pool.query('SELECT id FROM child_parent WHERE child_id = $1 AND status = $2', [child.id, 'active']);
    if (existingLink.rows.length > 0) {
      const sameParent = await pool.query('SELECT id FROM child_parent WHERE child_id = $1 AND parent_id = $2 AND status = $3', [child.id, parentId, 'active']);
      if (sameParent.rows.length > 0) {
        return res.status(400).json({ error: 'Этот ребёнок уже привязан к вам' });
      }
      return res.status(400).json({ error: 'Этот ребёнок уже привязан к другому родителю' });
    }

    await pool.query(
      `INSERT INTO child_parent (parent_id, child_id, status, created_at)
       VALUES ($1, $2, 'active', NOW()) RETURNING *`,
      [parentId, child.id]
    );

    res.json({
      message: 'Ребёнок успешно привязан!',
      child: { id: child.id, full_name: child.full_name, email: child.email }
    });

  } catch (error) {
    console.error('❌ Ошибка привязки ребёнка:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// НАЗНАЧЕНИЕ ПРЕЗИДЕНТА КЛУБА
// ============================================================
app.patch('/api/clubs/:clubId/president', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { clubId } = req.params;
    const { president_id } = req.body;

    console.log(`👑 Назначение президента: клуб ${clubId}, пользователь ${president_id}`);

    let hasAccess = false;

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      hasAccess = true;
    }

    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query('SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2', [userId, clubId]);
      if (clubCheck.rows.length > 0) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'У вас нет прав для этого клуба.' });
    }

    if (!president_id) {
      await pool.query('UPDATE users SET is_president = false WHERE club_id = $1 AND is_president = true', [clubId]);
      await pool.query('UPDATE clubs SET president_id = NULL, updated_at = NOW() WHERE id = $1', [clubId]);
      return res.json({ message: 'Президент снят с должности', president: null });
    }

    const userCheck = await pool.query(
      `SELECT u.id, u.role, u.club_id, u.full_name, u.is_president FROM users u WHERE u.id = $1`,
      [president_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Участник не найден' });
    }
    
    const candidate = userCheck.rows[0];
    
    if (candidate.role !== 'participant') {
      return res.status(400).json({ error: 'Президентом может быть только участник с ролью participant' });
    }
    
    if (candidate.club_id !== clubId) {
      return res.status(400).json({ error: 'Участник не состоит в этом клубе' });
    }

    await pool.query('UPDATE users SET is_president = false WHERE club_id = $1 AND is_president = true', [clubId]);
    await pool.query('UPDATE users SET is_president = true WHERE id = $1', [president_id]);

    const result = await pool.query('UPDATE clubs SET president_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [president_id, clubId]);
    const president = await pool.query('SELECT id, full_name, email, avatar_url FROM users WHERE id = $1', [president_id]);

    res.json({ message: 'Президент назначен', club: result.rows[0], president: president.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка назначения президента:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clubs/:clubId/president', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.school, u.class_name, u.avatar_url
       FROM users u WHERE u.club_id = $1 AND u.is_president = true LIMIT 1`,
      [clubId]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('❌ Ошибка получения президента:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// РЕЙТИНГ УЧАСТНИКОВ КЛУБА
// ============================================================
app.get('/api/club-rating/:clubId', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.school, u.class_name, u.is_president, u.avatar_url,
              COUNT(DISTINCT r.event_id) as events_count,
              COUNT(DISTINCT a.id) as achievements_count,
              (COUNT(DISTINCT r.event_id) * 2 + COUNT(DISTINCT a.id) * 5) as rating_points
       FROM users u
       LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'confirmed'
       LEFT JOIN achievements a ON u.id = a.participant_id
       WHERE u.club_id = $1 AND u.role = 'participant' AND u.status = 'active'
       GROUP BY u.id, u.full_name, u.school, u.class_name, u.is_president, u.avatar_url
       ORDER BY rating_points DESC LIMIT $2`,
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
// НОВОСТИ
// ============================================================
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM news ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения новостей:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/news', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const { title, content, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO news (title, content, image_url, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [title, content, image_url || null]
    );

    console.log('✅ Создана новость:', result.rows[0].title);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания новости:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/news/:id', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
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
      `UPDATE news SET title = $1, content = $2, image_url = $3 WHERE id = $4 RETURNING *`,
      [title, content, image_url || null, id]
    );

    console.log('✅ Обновлена новость:', result.rows[0].title);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления новости:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/news/:id', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
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
// УВЕДОМЛЕНИЯ
// ============================================================
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const result = await pool.query(
      `SELECT n.* FROM notifications n
       WHERE n.user_id = $1 OR (n.user_id IS NULL AND n.role = $2) OR (n.user_id IS NULL AND n.role = 'all')
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId, userRole]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const check = await pool.query('SELECT user_id FROM notifications WHERE id = $1', [id]);
    if (check.rows.length > 0) {
      const ownerId = check.rows[0].user_id;
      if (ownerId && ownerId !== userId) {
        return res.status(403).json({ error: 'У вас нет прав' });
      }
    }

    await pool.query('UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query('UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false', [userId]);
    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЗАДАНИЯ ПРЕЗИДЕНТА
// ============================================================
app.get('/api/president-tasks', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const isPresident = req.user.is_president || false;

    let query = `
      SELECT pt.*, u.full_name as assigned_to_name, u2.full_name as created_by_name,
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

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      // Видит всё
    } else if (userRole === 'club_coordinator') {
      const clubResult = await pool.query('SELECT club_id FROM club_coordinators WHERE profile_id = $1', [userId]);
      if (clubResult.rows.length > 0) {
        const clubId = clubResult.rows[0].club_id;
        conditions.push(`(pt.created_by = $${params.length + 1} OR pt.club_id = $${params.length + 2} OR pt.is_global = true)`);
        params.push(userId, clubId);
      } else {
        conditions.push(`pt.created_by = $${params.length + 1}`);
        params.push(userId);
      }
    } else if (userRole === 'participant' && isPresident === true) {
      conditions.push(`(pt.assigned_to = $${params.length + 1} OR pt.is_global = true)`);
      params.push(userId);
    } else {
      conditions.push('1 = 0');
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }

    query += ' ORDER BY pt.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения заданий:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/president-tasks', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { title, description, priority, deadline, club_id, assigned_to, is_global } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Заголовок обязателен' });
    }

    let finalAssignedTo = assigned_to || null;

    if (club_id && !finalAssignedTo) {
      const presidentResult = await pool.query('SELECT id FROM users WHERE club_id = $1 AND is_president = true LIMIT 1', [club_id]);
      if (presidentResult.rows.length > 0) {
        finalAssignedTo = presidentResult.rows[0].id;
      } else {
        return res.status(400).json({ error: 'В этом клубе нет президента.' });
      }
    }

    if (!finalAssignedTo && !is_global) {
      return res.status(400).json({ error: 'Назначьте задание президенту клуба или сделайте его глобальным' });
    }

    const result = await pool.query(
      `INSERT INTO president_tasks (title, description, priority, deadline, club_id, assigned_to, created_by, is_global, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW()) RETURNING *`,
      [title.trim(), description || '', priority || 'medium', deadline || null, club_id || null, finalAssignedTo, userId, is_global || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания задания:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/president-tasks/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validStatuses = ['pending', 'in_progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    const taskCheck = await pool.query('SELECT * FROM president_tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const task = taskCheck.rows[0];
    const isCreator = task.created_by === userId;

    const allowedRoles = ['admin', 'movement_coordinator', 'president', 'vice_president'];
    const isAllowed = allowedRoles.includes(userRole);

    if (!isAllowed && !isCreator) {
      return res.status(403).json({ error: 'Недостаточно прав для изменения статуса' });
    }

    const completedAt = status === 'completed' ? new Date() : null;

    const result = await pool.query(
      `UPDATE president_tasks SET status = $1, completed_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, completedAt, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка изменения статуса:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/president-tasks/:id/respond', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!response || response.trim() === '') {
      return res.status(400).json({ error: 'Текст ответа обязателен' });
    }

    const taskCheck = await pool.query('SELECT * FROM president_tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const task = taskCheck.rows[0];

    if (!['president', 'vice_president'].includes(userRole)) {
      return res.status(403).json({ error: 'Только президенты могут отвечать на задания' });
    }

    if (task.assigned_to !== userId && !task.is_global) {
      return res.status(403).json({ error: 'Это задание не назначено вам' });
    }

    await pool.query(
      `INSERT INTO president_task_responses (task_id, user_id, response, created_at) VALUES ($1, $2, $3, NOW())`,
      [id, userId, response.trim()]
    );

    res.status(201).json({ success: true, message: 'Ответ отправлен' });
  } catch (error) {
    console.error('❌ Ошибка отправки ответа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/president-tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const taskCheck = await pool.query('SELECT * FROM president_tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const task = taskCheck.rows[0];

    const allowedRoles = ['admin', 'movement_coordinator'];
    const isAllowed = allowedRoles.includes(userRole);
    const isCreator = task.created_by === userId;

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
// НАЗНАЧЕНИЕ ТЬЮТОРОВ НА МЕРОПРИЯТИЯ
// ============================================================
app.post('/api/events/:eventId/tutors', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { tutor_id, role, notes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для назначения тьюторов' });
    }

    if (!tutor_id) {
      return res.status(400).json({ error: 'tutor_id обязателен' });
    }

    const tutorCheck = await pool.query('SELECT id, full_name, role FROM users WHERE id = $1 AND role = $2', [tutor_id, 'tutor']);
    if (tutorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тьютор не найден' });
    }

    const eventCheck = await pool.query('SELECT id, title FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const result = await pool.query(
      `INSERT INTO event_tutor_assignments (event_id, tutor_id, role, status, assigned_by, assigned_at, notes)
       VALUES ($1, $2, $3, 'pending', $4, NOW(), $5) RETURNING *`,
      [eventId, tutor_id, role || 'tutor', userId, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка назначения тьютора:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/event-tutor-assignments', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT eta.*, e.title as event_title, e.event_date, e.location,
             u.full_name as tutor_name, u2.full_name as assigned_by_name
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
    }

    query += ' ORDER BY eta.assigned_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения назначений:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/event-tutor-assignments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const validStatuses = ['pending', 'accepted', 'declined'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    const check = await pool.query('SELECT * FROM event_tutor_assignments WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Назначение не найдено' });
    }

    if (check.rows[0].tutor_id !== userId) {
      return res.status(403).json({ error: 'Вы можете менять статус только своих назначений' });
    }

    const result = await pool.query(
      `UPDATE event_tutor_assignments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления статуса:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ОТЧЁТЫ
// ============================================================
app.get('/api/reports', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT r.*, u.full_name as created_by_name, c.name as club_name,
             u2.full_name as submitted_by_name, u3.full_name as approved_by_name
      FROM reports r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN clubs c ON r.club_id = c.id
      LEFT JOIN users u2 ON r.submitted_by = u2.id
      LEFT JOIN users u3 ON r.approved_by = u3.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'club_coordinator') {
      const clubResult = await pool.query('SELECT club_id FROM club_coordinators WHERE profile_id = $1', [userId]);
      if (clubResult.rows.length > 0) {
        query += ' AND r.club_id = $1';
        params.push(clubResult.rows[0].club_id);
      } else {
        query += ' AND 1 = 0';
      }
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения отчётов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { club_id, report_month, report_text, events_count, participants_count } = req.body;

    if (!club_id) return res.status(400).json({ error: 'Выберите клуб' });
    if (!report_month) return res.status(400).json({ error: 'Выберите месяц отчёта' });

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(report_month)) {
      return res.status(400).json({ error: 'Неверный формат месяца. Используйте YYYY-MM' });
    }

    if (userRole === 'club_coordinator') {
      const clubCheck = await pool.query('SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2', [userId, club_id]);
      if (clubCheck.rows.length === 0) {
        return res.status(403).json({ error: 'У вас нет доступа к этому клубу' });
      }
    }

    const clubNameResult = await pool.query('SELECT name FROM clubs WHERE id = $1', [club_id]);
    const clubName = clubNameResult.rows[0]?.name || 'Клуб';

    const result = await pool.query(
      `INSERT INTO reports (club_id, created_by, title, content, report_month, events_count, participants_count, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', NOW(), NOW()) RETURNING *`,
      [club_id, userId, `Отчёт за ${report_month} (${clubName})`, report_text || '', report_month, parseInt(events_count) || 0, parseInt(participants_count) || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания отчёта:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/reports/:id/submit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const check = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Отчёт не найден' });
    }

    const report = check.rows[0];

    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Отчёт уже отправлен' });
    }

    const result = await pool.query(
      `UPDATE reports SET status = 'submitted', submitted_by = $1, submitted_at = NOW(), updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [userId, id]
    );

    await createNotification(
      userId,
      'report',
      '📤 Отчёт отправлен на проверку',
      `Вы отправили отчёт "${result.rows[0].title}" на проверку`,
      '/reports',
      'normal'
    );

    const admins = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'movement_coordinator', 'president', 'vice_president')"
    );
    const clubName = await getClubName(report.club_id);
    for (const admin of admins.rows) {
      await createNotification(
        admin.id,
        'report',
        '📤 Новый отчёт на проверку',
        `Отчёт "${result.rows[0].title}" (${clubName}) отправлен на проверку`,
        '/reports',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка отправки отчёта:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/reports/:id/approve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для утверждения отчётов' });
    }

    const check = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Отчёт не найден' });
    }

    const report = check.rows[0];

    if (report.status !== 'submitted') {
      return res.status(400).json({ error: 'Отчёт не ожидает проверки' });
    }

    const result = await pool.query(
      `UPDATE reports SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [userId, id]
    );

    if (report.created_by) {
      await createNotification(
        report.created_by,
        'report',
        '✅ Отчёт утверждён',
        `Ваш отчёт "${result.rows[0].title}" утверждён!`,
        '/reports',
        'high'
      );
    }

    const coordinators = await pool.query(
      'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
      [report.club_id]
    );
    for (const coord of coordinators.rows) {
      if (coord.profile_id !== report.created_by && coord.profile_id !== userId) {
        await createNotification(
          coord.profile_id,
          'report',
          '✅ Отчёт утверждён',
          `Отчёт "${result.rows[0].title}" утверждён!`,
          '/reports',
          'normal'
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка утверждения отчёта:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/reports/:id/reject', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для отклонения отчётов' });
    }

    const check = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Отчёт не найден' });
    }

    const report = check.rows[0];

    if (report.status !== 'submitted') {
      return res.status(400).json({ error: 'Отчёт не ожидает проверки' });
    }

    const result = await pool.query(
      `UPDATE reports SET status = 'rejected', approved_by = $1, approved_at = NOW(), 
       reviewer_comment = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [userId, comment || 'Без комментария', id]
    );

    if (report.created_by) {
      await createNotification(
        report.created_by,
        'report',
        '❌ Отчёт отклонён',
        `Ваш отчёт "${result.rows[0].title}" отклонён. Причина: ${comment || 'Без комментария'}`,
        '/reports',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка отклонения отчёта:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reports/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления отчётов' });
    }

    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ message: 'Отчёт удалён' });
  } catch (error) {
    console.error('❌ Ошибка удаления отчёта:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ДОКУМЕНТЫ
// ============================================================
app.get('/api/documents', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT d.*, u.full_name as created_by_name, c.name as club_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN clubs c ON d.club_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'club_coordinator') {
      const clubResult = await pool.query('SELECT club_id FROM club_coordinators WHERE profile_id = $1', [userId]);
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

app.post('/api/documents', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { title, content, category, document_type, is_public, club_id, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Заголовок обязателен' });
    }

    let finalClubId = club_id || null;
    if (userRole === 'club_coordinator' && !finalClubId) {
      const clubResult = await pool.query('SELECT club_id FROM club_coordinators WHERE profile_id = $1', [userId]);
      if (clubResult.rows.length > 0) {
        finalClubId = clubResult.rows[0].club_id;
      }
    }

    const result = await pool.query(
      `INSERT INTO documents (title, content, category, document_type, is_public, club_id, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title.trim(), content || '', category || 'general', document_type || 'pdf', is_public !== undefined ? is_public : true, finalClubId, tags || [], userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания документа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления документов' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Документ удалён' });
  } catch (error) {
    console.error('❌ Ошибка удаления документа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// МАССОВЫЕ УВЕДОМЛЕНИЯ
// ============================================================
app.get('/api/mass-notifications', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра уведомлений' });
    }

    const result = await pool.query(`
      SELECT mn.*, u.full_name as created_by_name
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

app.post('/api/mass-notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания уведомлений' });
    }

    const { title, message, recipients, priority, scheduled_at } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Заголовок и текст обязательны' });
    }

    const users = await pool.query('SELECT id, role FROM users WHERE status = $1', ['active']);
    
    let targetUsers = [];
    const roleMap = {
      'all': 'all',
      'participants': 'participant',
      'coordinators': 'club_coordinator',
      'tutors': 'tutor',
      'admins': ['admin', 'movement_coordinator']
    };

    const roles = roleMap[recipients];
    if (recipients === 'all') {
      targetUsers = users.rows;
    } else if (Array.isArray(roles)) {
      targetUsers = users.rows.filter(u => roles.includes(u.role));
    } else {
      targetUsers = users.rows.filter(u => u.role === roles);
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'Нет получателей для выбранной группы' });
    }

    const status = scheduled_at ? 'scheduled' : 'sent';
    const sentAt = !scheduled_at ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO mass_notifications (title, message, recipients, priority, status, scheduled_at, sent_at, created_by, recipient_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title.trim(), message.trim(), recipients || 'all', priority || 'normal', status, scheduled_at || null, sentAt, userId, targetUsers.length]
    );

    const massNotification = result.rows[0];
    let sentCount = 0;

    for (const user of targetUsers) {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, priority, link, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [user.id, 'system', title.trim(), message.trim(), priority || 'normal', '/notifications']
        );
        sentCount++;
      } catch (err) {
        console.error(`❌ Ошибка отправки уведомления пользователю ${user.id}:`, err.message);
      }
    }

    res.status(201).json({ ...massNotification, sent_count: sentCount });
  } catch (error) {
    console.error('❌ Ошибка создания уведомления:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mass-notifications/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления уведомлений' });
    }

    await pool.query('DELETE FROM mass_notifications WHERE id = $1', [id]);
    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error('❌ Ошибка удаления уведомления:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ЦЕЛИ И KPI
// ============================================================
app.get('/api/goals', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра целей' });
    }

    const result = await pool.query(`
      SELECT g.*, u.full_name as assigned_to_name, u2.full_name as created_by_name, c.name as club_name
      FROM goals g
      LEFT JOIN users u ON g.assigned_to = u.id
      LEFT JOIN users u2 ON g.created_by = u2.id
      LEFT JOIN clubs c ON g.club_id = c.id
      ORDER BY g.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения целей:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/goals', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для создания целей' });
    }

    const { title, description, category, target_value, unit, start_date, end_date, assigned_to, club_id } = req.body;

    if (!title || !title.trim() || !target_value) {
      return res.status(400).json({ error: 'Заголовок и целевое значение обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO goals (title, description, category, target_value, unit, start_date, end_date, assigned_to, club_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title.trim(), description || '', category || 'general', parseInt(target_value), unit || 'participants', start_date || null, end_date || null, assigned_to || null, club_id || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания цели:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/goals/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования целей' });
    }

    const { title, description, category, target_value, current_value, unit, status, start_date, end_date, assigned_to, club_id } = req.body;

    const check = await pool.query('SELECT * FROM goals WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    const result = await pool.query(
      `UPDATE goals SET title = $1, description = $2, category = $3, target_value = $4, current_value = $5,
       unit = $6, status = $7, start_date = $8, end_date = $9, assigned_to = $10, club_id = $11, updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [title || check.rows[0].title, description || check.rows[0].description, category || check.rows[0].category,
       target_value || check.rows[0].target_value, current_value !== undefined ? current_value : check.rows[0].current_value,
       unit || check.rows[0].unit, status || check.rows[0].status, start_date || check.rows[0].start_date,
       end_date || check.rows[0].end_date, assigned_to || check.rows[0].assigned_to, club_id || check.rows[0].club_id, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления цели:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/goals/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

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
// УПРАВЛЕНИЕ УЧАСТНИКАМИ МЕРОПРИЯТИЙ
// ============================================================
app.get('/api/events/:eventId/participants', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    let canView = false;
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canView = true;
    } else if (userRole === 'club_coordinator' && (event.created_by === userId || event.is_global === true)) {
      canView = true;
    } else if (userRole === 'tutor') {
      const assignmentCheck = await pool.query(
        'SELECT id FROM event_tutor_assignments WHERE event_id = $1 AND tutor_id = $2 AND status = $3',
        [eventId, userId, 'accepted']
      );
      if (assignmentCheck.rows.length > 0) canView = true;
    }

    if (!canView) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра участников' });
    }

    const result = await pool.query(
      `SELECT ep.*, u.full_name, u.school, u.class_name, u.avatar_url, u.club_id, c.name as club_name,
              ps.id as score_id, ps.engagement_score, ps.teamwork_score, ps.initiative_score,
              ps.communication_score, ps.responsibility_score, ps.comment as score_comment,
              ps.status as score_status, ps.created_at as score_created_at, ps.updated_at as score_updated_at
       FROM event_participants ep
       LEFT JOIN users u ON ep.user_id = u.id
       LEFT JOIN clubs c ON u.club_id = c.id
       LEFT JOIN participant_scores ps ON ps.event_id = ep.event_id AND ps.participant_id = ep.user_id AND ps.tutor_id = $2
       WHERE ep.event_id = $1 ORDER BY u.full_name`,
      [eventId, userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения участников:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events/:eventId/participants', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { user_id } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id обязателен' });
    }

    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    let canAdd = false;
    if (['admin', 'movement_coordinator'].includes(userRole)) {
      canAdd = true;
    } else if (userRole === 'club_coordinator' && (event.created_by === userId || event.is_global === true)) {
      canAdd = true;
    }

    if (!canAdd) {
      return res.status(403).json({ error: 'У вас нет прав для добавления участников' });
    }

    const userCheck = await pool.query('SELECT id, full_name, club_id FROM users WHERE id = $1 AND role = $2', [user_id, 'participant']);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Участник не найден' });
    }

    const existing = await pool.query('SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2', [eventId, user_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Участник уже добавлен на мероприятие' });
    }

    const result = await pool.query(
      `INSERT INTO event_participants (event_id, user_id, status, registered_at)
       VALUES ($1, $2, 'registered', NOW()) RETURNING *`,
      [eventId, user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка добавления участника:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/events/:eventId/participants/:participantId', authenticate, async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    let canRemove = false;
    if (['admin', 'movement_coordinator'].includes(userRole)) {
      canRemove = true;
    } else if (userRole === 'club_coordinator' && (event.created_by === userId || event.is_global === true)) {
      canRemove = true;
    }

    if (!canRemove) {
      return res.status(403).json({ error: 'У вас нет прав для удаления участников' });
    }

    await pool.query('DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2', [eventId, participantId]);

    res.json({ message: 'Участник удалён с мероприятия' });
  } catch (error) {
    console.error('❌ Ошибка удаления участника:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/:eventId/available-participants', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    let canView = false;
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canView = true;
    } else if (userRole === 'club_coordinator' && (event.created_by === userId || event.is_global === true)) {
      canView = true;
    }

    if (!canView) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра списка' });
    }

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.school, u.class_name, u.club_id, c.name as club_name
       FROM users u LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.role = 'participant' AND u.status = 'active'
       AND u.id NOT IN (SELECT user_id FROM event_participants WHERE event_id = $1)
       ORDER BY u.full_name`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения списка участников:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ВНУТРЕННИЕ МЕРОПРИЯТИЯ КЛУБА
// ============================================================
app.get('/api/my-club-events', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const userCheck = await pool.query('SELECT club_id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0 || !userCheck.rows[0].club_id) {
      console.log('❌ У пользователя нет клуба');
      return res.json([]);
    }

    const clubId = userCheck.rows[0].club_id;

    const result = await pool.query(
      `SELECT e.*, c.name as club_name, u.full_name as proposed_by_name
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       LEFT JOIN users u ON e.proposed_by = u.id
       WHERE e.is_club_event = true AND e.status = 'approved' AND e.club_id = $1
       ORDER BY e.event_date ASC`,
      [clubId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения мероприятий клуба:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// АУДИТ ЛОГОВ
// ============================================================
app.get('/api/activity-log', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра журнала' });
    }

    const { limit = 100, offset = 0, user_id, entity_type } = req.query;

    let query = `
      SELECT al.*, u.full_name as user_name, u.role as user_role
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
// СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
app.post('/api/create-test-user', async (req, res) => {
  try {
    const email = 'newadmin@dod.ru';
    const password = '123456';
    const full_name = 'Администратор';
    const role = 'admin';

    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    console.log('🗑️ Старый пользователь удалён');

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, birth_date, registration_status, must_change_password, status)
       VALUES ($1, $2, $3, $4, '2000-01-01', 'active', false, 'active')
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
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: ${JWT_SECRET ? 'установлен' : '❌ НЕ УСТАНОВЛЕН!'}`);
  console.log(`📝 Создать тестового пользователя: POST /api/create-test-user`);
  console.log(`👤 Тестовый пользователь: newadmin@dod.ru / 123456`);
  console.log(`✅ ВСЕ API ЗАГРУЖЕНЫ!`);
});