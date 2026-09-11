// backend/server.js

// config.js импортируется ПЕРВЫМ: он вызывает dotenv.config() до того,
// как любой другой модуль обратится к process.env.
import { JWT_SECRET, DATABASE_URL, PORT, IS_PRODUCTION, JWT_EXPIRES_IN, TRUST_PROXY_HOPS, DB_SSL, BCRYPT_ROUNDS } from './lib/config.js';

import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { authenticate, requireRole, requireAdmin, requireAdminOrCoordinator, initAuth, invalidateUserCache, BLOCKED_STATUSES } from './middleware/auth.js';
import { logActivity, initLogger, getActivityLogs } from './lib/logger.js';
import {
  CLUB_POSITIONS,
  CLUB_POSITION_LABELS,
  ALL_CLUB_PERMISSIONS,
  NO_CLUB_PERMISSIONS,
  permissionsForPosition
} from './lib/clubPermissions.js';

// ===== ВАЛИДАЦИЯ =====
import { validateBody } from './middleware/validate.js';
import { 
  eventSchema, 
  userSchema, 
  registrationSchema,
  reportSchema,
  achievementSchema,
  appealSchema,
  documentSchema,
  newsSchema,
  goalSchema,
  taskSchema,
  presidentTaskSchema,
  massNotificationSchema,
  clubSchema,
  achievementCategorySchema,
  tutorInvitationSchema
} from './lib/validation.js';

const app = express();

console.log('🚀 ЗАПУСК БЭКЕНДА');

// ============================================================
// TRUST PROXY (ДЛЯ RELAXDEV)
// ============================================================
// ⚠️ Было app.set('trust proxy', true) — безусловное доверие заголовку
// X-Forwarded-For. Клиент подставляет его сам, поэтому rate limiting
// обходился подстановкой случайного IP на каждый запрос, а
// express-rate-limit писал в лог ERR_ERL_PERMISSIVE_TRUST_PROXY.
// Доверяем ровно тому числу прокси, которое стоит перед приложением.
app.set('trust proxy', TRUST_PROXY_HOPS);
console.log(`✅ Trust proxy: ${TRUST_PROXY_HOPS} прокси`);

// ============================================================
// БАЗА ДАННЫХ
// ============================================================
// ⚠️ RelaxDev: «TLS не используется. База доступна только из внутренней
// сети, поэтому в коде укажите ssl: false». Раньше здесь стояло
// ssl: IS_PRODUCTION ? {...} : false — то есть подключение работало
// только потому, что NODE_ENV не выставлен. Стоило бы кому-то задать
// NODE_ENV=production, и база отвалилась бы с «server does not support
// SSL connections». Управляем этим явной переменной.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DB_SSL ? { rejectUnauthorized: false } : false
});

initLogger(pool);
initAuth(pool);

pool.connect((err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('✅ Подключение к PostgreSQL установлено');
  }
});

// ============================================================
// CORS (ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================================
// Это список ORIGIN'ов — адресов, с которых браузер открывает интерфейс.
// Собственный домен бэкенда (dod-backend.relaxdev.ru) сюда не входит и не
// должен: он никогда не приходит в заголовке Origin.
//
// Убран https://dod-frontend.relaxdev.ru — такого проекта на RelaxDev нет.
// Мёртвый домен в белом списке опасен: если кто-то зарегистрирует его на
// том же хостинге, он получит разрешённый origin.
//
// Список переопределяется переменной CORS_ORIGINS (адреса через запятую) —
// добавить домен можно без правки кода и передеплоя фронта.
const allowedOrigins = (process.env.CORS_ORIGINS || [
  'https://dod-platform-clean.relaxdev.ru',
  'http://localhost:5173',
  'http://localhost:3000'
].join(','))
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

console.log(`✅ CORS разрешён для: ${allowedOrigins.join(', ')}`);

// Основной CORS
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log(`⚠️ CORS: запрос от ${origin} отклонён`);
    const err = new Error('Not allowed by CORS');
    err.status = 403;
    err.code = 'CORS_DENIED';
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// ============================================================
// ОБРАБОТКА OPTIONS (CORS PREFLIGHT)
// ============================================================
app.options('*', (req, res) => {
  const origin = req.headers.origin || '';
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  res.sendStatus(200);
});

// ============================================================
// ЛОГИ И JSON
// ============================================================
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

// Привязка ребёнка требует пароль ребёнка — значит, это тоже точка подбора.
const linkChildLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Слишком много попыток привязки. Попробуйте через час.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Смена пароля — тоже точка подбора: по reset-токену и по текущему паролю.
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Слишком много попыток смены пароля. Попробуйте через 15 минут.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

// ⚠️ Раньше здесь был Math.random(): он не криптостойкий, и по нескольким
// выданным паролям восстанавливается состояние генератора, а значит и
// следующие пароли. Для временных паролей администраторов это критично.
//
// Из алфавита убраны l, I, 1, O, 0 — временные пароли диктуют по телефону,
// и путаница в них стоит звонка в поддержку. Спецсимволы тоже убраны по
// той же причине; длина компенсирует.
function generatePassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  const bytes = crypto.randomBytes(length);

  // Первые три символа гарантируют выполнение требований isPasswordStrong
  let password =
    upper[bytes[0] % upper.length] +
    lower[bytes[1] % lower.length] +
    digits[bytes[2] % digits.length];

  for (let i = 3; i < length; i++) password += all[bytes[i] % all.length];
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

// ============================================================
// РАЗБОР КАРТИНКИ В ФОРМАТЕ data:URL
// ============================================================
// Белый список форматов. svg+xml намеренно отсутствует: это документ,
// который умеет исполнять скрипты, и его нельзя принимать как аватар.
const ALLOWED_IMAGE_TYPES = ['png', 'jpeg', 'jpg', 'webp', 'gif'];

function parseDataImage(value, maxBytes) {
  if (typeof value !== 'string') {
    return { error: 'Неверный формат изображения' };
  }

  const match = value.match(/^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    return { error: 'Неверный формат изображения' };
  }

  const type = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return { error: `Формат ${type} не поддерживается. Допустимы: ${ALLOWED_IMAGE_TYPES.join(', ')}` };
  }

  let bytes;
  try {
    bytes = Buffer.from(match[2], 'base64');
  } catch {
    return { error: 'Не удалось прочитать изображение' };
  }

  if (bytes.length === 0) {
    return { error: 'Изображение пустое' };
  }

  if (bytes.length > maxBytes) {
    return { error: `Изображение слишком большое. Максимум ${Math.round(maxBytes / 1024)}KB.` };
  }

  return { type, bytes };
}

// ============================================================
// ПРОВЕРКИ ДОСТУПА
// ============================================================

// Роли, которые видят движение целиком
const MOVEMENT_ROLES = ['admin', 'movement_coordinator', 'president', 'vice_president'];

// Все роли сотрудников (могут работать с участниками в своей зоне)
const STAFF_ROLES = [...MOVEMENT_ROLES, 'club_coordinator', 'tutor'];

// Клубы, в которых человек работает — на любой должности.
// Раньше читалось из club_coordinators, где должность была одна.
async function getCoordinatorClubIds(userId) {
  const result = await pool.query(
    'SELECT club_id FROM club_staff WHERE user_id = $1 AND removed_at IS NULL',
    [userId]
  );
  return result.rows.map((r) => r.club_id);
}

// Что человек может делать в конкретном клубе.
// Одна точка правды вместо двух десятков проверок role === 'club_coordinator'.
async function getClubPermissions(requester, clubId) {
  if (!clubId) return NO_CLUB_PERMISSIONS;

  // Координаторы движения и админы могут всё в любом клубе
  if (MOVEMENT_ROLES.includes(requester.role)) return ALL_CLUB_PERMISSIONS;

  const staff = await pool.query(
    'SELECT position FROM club_staff WHERE user_id = $1 AND club_id = $2 AND removed_at IS NULL',
    [requester.userId, clubId]
  );
  if (staff.rows.length === 0) return NO_CLUB_PERMISSIONS;

  return permissionsForPosition(staff.rows[0].position);
}

async function canInClub(requester, clubId, capability) {
  const permissions = await getClubPermissions(requester, clubId);
  return permissions[capability] === true;
}

// Должность человека в клубе — нужна там, где важно не «можно ли»,
// а «кто именно»: например, отправлять команду вправе только руководитель
async function getClubPosition(userId, clubId) {
  const r = await pool.query(
    'SELECT position FROM club_staff WHERE user_id = $1 AND club_id = $2 AND removed_at IS NULL',
    [userId, clubId]
  );
  return r.rows[0]?.position || null;
}

// Имеет ли запрашивающий право видеть данные конкретного участника
async function canViewParticipant(requester, participantId) {
  const { userId, role } = requester;

  if (!participantId) return false;
  if (userId === participantId) return true;
  if (MOVEMENT_ROLES.includes(role)) return true;

  if (role === 'club_coordinator') {
    const r = await pool.query(
      `SELECT 1 FROM users u
       JOIN club_coordinators cc ON cc.club_id = u.club_id
       WHERE u.id = $1 AND cc.profile_id = $2`,
      [participantId, userId]
    );
    return r.rows.length > 0;
  }

  if (role === 'tutor') {
    const r = await pool.query(
      `SELECT 1 FROM event_participants ep
       JOIN event_tutor_assignments eta ON eta.event_id = ep.event_id
       WHERE ep.participant_id = $1 AND eta.tutor_id = $2`,
      [participantId, userId]
    );
    return r.rows.length > 0;
  }

  if (role === 'parent') {
    const r = await pool.query(
      `SELECT 1 FROM child_parent
       WHERE parent_id = $1 AND child_id = $2 AND status = 'active'`,
      [userId, participantId]
    );
    return r.rows.length > 0;
  }

  return false;
}

// Пустая строка из формы должна становиться NULL, а не падать в базе
function nullableDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
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

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, club_id, is_president,
              avatar_url, status, login_attempts, locked_until, must_change_password
       FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      console.log(`❌ Пользователь не найден: ${email}`);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // ⚠️ Вход не смотрел на status вообще: пользователь, помеченный как
    // отключённый, спокойно заходил в систему.
    if (BLOCKED_STATUSES.includes(user.status)) {
      console.log(`⛔ Вход отключённой учётной записи: ${email}`);
      return res.status(403).json({
        error: 'Учётная запись отключена. Обратитесь к администратору.',
        code: 'ACCOUNT_DISABLED'
      });
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
      { expiresIn: JWT_EXPIRES_IN }
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// СМЕНА ПАРОЛЯ
// ============================================================
app.post('/api/change-password', changePasswordLimiter, async (req, res) => {
  try {
    const { current_password, new_password, reset_token } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'Новый пароль обязателен', code: 'NEW_PASSWORD_REQUIRED' });
    }

    let userId;
    let isFirstLogin = false;

    if (reset_token) {
      // ⚠️ Раньше сюда принимался ЛЮБОЙ токен, подписанный JWT_SECRET, —
      // в том числе обычный токен входа. Достаточно было передать его в
      // поле reset_token, и пароль менялся без знания текущего. Украденный
      // токен превращался во владение аккаунтом навсегда.
      let decoded;
      try {
        decoded = jwt.verify(reset_token, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({
          error: 'Ссылка для смены пароля недействительна или истекла',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      // Токен должен быть выдан именно под смену пароля
      if (decoded.mustChange !== true) {
        return res.status(401).json({
          error: 'Недействительный токен смены пароля',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      userId = decoded.userId;
      isFirstLogin = true;

      // ...и пользователь всё ещё должен быть в состоянии «смени пароль»,
      // иначе один и тот же токен работает повторно в течение часа
      const state = await pool.query(
        'SELECT must_change_password FROM users WHERE id = $1',
        [userId]
      );
      if (state.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      if (state.rows[0].must_change_password !== true) {
        return res.status(401).json({
          error: 'Токен смены пароля уже использован',
          code: 'RESET_TOKEN_USED'
        });
      }
    } else {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Требуется авторизация', code: 'UNAUTHORIZED' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Неверный формат токена', code: 'INVALID_TOKEN_FORMAT' });
      }

      // Раньше jwt.verify здесь не был обёрнут: на просроченном токене
      // исключение уходило во внешний catch и клиент получал 500 вместо 401.
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ error: 'Сессия истекла. Войдите заново.', code: 'TOKEN_EXPIRED' });
      }

      // Токен смены пароля не годится для смены пароля «изнутри»:
      // по нему нельзя подтвердить знание текущего пароля.
      if (decoded.mustChange === true) {
        return res.status(401).json({ error: 'Требуется авторизация', code: 'UNAUTHORIZED' });
      }

      userId = decoded.userId;

      if (!current_password) {
        return res.status(400).json({ error: 'Текущий пароль обязателен', code: 'CURRENT_PASSWORD_REQUIRED' });
      }

      const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (user.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });

      const valid = await bcrypt.compare(current_password, user.rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: 'Неверный текущий пароль', code: 'WRONG_PASSWORD' });

      // Новый пароль не должен совпадать со старым
      const same = await bcrypt.compare(new_password, user.rows[0].password_hash);
      if (same) {
        return res.status(400).json({ error: 'Новый пароль совпадает с текущим', code: 'PASSWORD_UNCHANGED' });
      }
    }

    const strength = isPasswordStrong(new_password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message, code: 'WEAK_PASSWORD' });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    
    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = false, 
       last_password_change = NOW(), login_attempts = 0, locked_until = NULL WHERE id = $2`,
      [hashedPassword, userId]
    );
    
    await logActivity(userId, 'PASSWORD_CHANGED', 'user', userId, {
      is_first_login: isFirstLogin
    });
    
    if (isFirstLogin) {
      const user = await pool.query(
        `SELECT id, email, full_name, role, club_id, is_president, avatar_url
         FROM users WHERE id = $1`,
        [userId]
      );
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
        { expiresIn: JWT_EXPIRES_IN }
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО АДМИН) — С ВАЛИДАЦИЕЙ
// ============================================================
app.post('/api/users', authenticate, requireAdmin, validateBody(userSchema), async (req, res) => {
  try {
    const validatedData = req.validatedBody;
    const { 
      email, full_name, role, phone, school, class_name, club_id, 
      birth_date, password 
    } = validatedData;

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
    const password_hash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

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
        // Первый сотрудник клуба становится руководителем, последующие —
        // заместителями: руководитель в клубе может быть только один.
        const hasHead = await pool.query(
          `SELECT 1 FROM club_staff WHERE club_id = $1 AND position = 'head' AND removed_at IS NULL`,
          [finalClubId]
        );
        const position = hasHead.rows.length > 0 ? 'deputy' : 'head';

        await pool.query(
          `INSERT INTO club_staff (club_id, user_id, position, appointed_by, comment)
           VALUES ($1, $2, $3, $4, 'Назначен при создании учётной записи')
           ON CONFLICT DO NOTHING`,
          [finalClubId, user.id, position, req.user.userId]
        );
        console.log(`  ✅ Сотрудник привязан к клубу ${clubName}: ${position}`);
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
      invalidateUserCache(id);
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
    invalidateUserCache(id);
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
      // ⚠️ Бралось rows[0]: координатор, ведущий два КЮДа, второго не видел
      const clubIds = await getCoordinatorClubIds(req.user.userId);
      if (clubIds.length === 0) return res.json([]);
      query += ' AND u.club_id = ANY($1)';
      params.push(clubIds);
    }

    if (req.user.role === 'tutor') {
      // ⚠️ Тьютор получал всех участников движения. По матрице ролей он
      // должен видеть только участников мероприятий, на которые назначен.
      query += ` AND u.id IN (
        SELECT ep.participant_id FROM event_participants ep
        JOIN event_tutor_assignments eta ON eta.event_id = ep.event_id
        WHERE eta.tutor_id = $1
      )`;
      params.push(req.user.userId);
    }

    query += ' ORDER BY u.full_name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ОБНОВЛЕНИЕ ПРОФИЛЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (PATCH /api/profile)
// ============================================================
app.patch('/api/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      full_name,
      phone,
      school,
      class_name,
      interests,
      bio,
      city,
      birth_date,
      social_links,
      skills,
      education,
      achievements,
      telegram,
      vk,
      parent_full_name,
      parent_phone,
      parent_email,
      consent_personal_data,
      consent_photo_publication,
      consent_event_participation,
      consent_agreement_date,
      charter_acceptance_date
    } = req.body;

    console.log(`📝 ОБНОВЛЕНИЕ ПРОФИЛЯ: userId=${userId}`);

    // Безопасная обработка дат
    const formatDate = (val) => {
      if (!val || val === '' || val === 'Invalid Date') return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    };

    // Обновляем только переданные поля
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const addField = (field, value) => {
      if (value !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    addField('full_name', full_name);
    addField('phone', phone);
    addField('school', school);
    addField('class_name', class_name);
    addField('interests', interests);
    addField('bio', bio);
    addField('city', city);
    addField('birth_date', formatDate(birth_date));
    addField('social_links', social_links);
    addField('skills', skills);
    addField('education', education);
    addField('achievements', achievements);
    addField('telegram', telegram);
    addField('vk', vk);
    addField('parent_full_name', parent_full_name);
    addField('parent_phone', parent_phone);
    addField('parent_email', parent_email);
    addField('charter_acceptance_date', formatDate(charter_acceptance_date));

    // ⚠️ consent_personal_data, consent_photo_publication и
    // consent_event_participation здесь больше НЕ принимаются.
    // Их ставил сам участник в своём профиле, а участники —
    // несовершеннолетние: согласие за них может дать только законный
    // представитель. Такое самосогласие юридически ничтожно.
    // Согласия оформляются через POST /api/consents родителем.
    if (consent_personal_data !== undefined ||
        consent_photo_publication !== undefined ||
        consent_event_participation !== undefined ||
        consent_agreement_date !== undefined) {
      return res.status(400).json({
        error: 'Согласия оформляются законным представителем в разделе «Согласия», а не в профиле',
        code: 'CONSENT_VIA_PROFILE_FORBIDDEN'
      });
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    values.push(userId);

    // ⚠️ Здесь было RETURNING *, то есть при каждом сохранении профиля
    // клиенту уезжал bcrypt-хеш пароля, а также login_attempts и
    // locked_until. Возвращаем только то, что фронт действительно рисует.
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, role, phone, school, class_name,
                birth_date, is_minor, registration_status, interests, bio, city,
                position, status, club_id, created_at, avatar_url, is_president,
                social_links, skills, education, achievements, telegram, vk,
                must_change_password,
                parent_full_name, parent_phone, parent_email,
                consent_personal_data, consent_photo_publication,
                consent_event_participation, consent_agreement_date,
                charter_acceptance_date
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log(`✅ Профиль обновлён`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО АДМИН)
// ============================================================
app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Нельзя удалить самого себя — иначе админ остаётся без доступа
    if (id === req.user.userId) {
      return res.status(400).json({
        error: 'Нельзя удалить собственную учётную запись',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // И нельзя удалить последнего администратора
    if (check.rows[0].role === 'admin') {
      const admins = await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'");
      if (admins.rows[0].n <= 1) {
        return res.status(400).json({
          error: 'Это последний администратор — удаление заблокировано',
          code: 'LAST_ADMIN'
        });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    invalidateUserCache(id);

    await logActivity(req.user.userId, 'USER_DELETED', 'user', id, {
      deleted_email: check.rows[0].email,
      deleted_role: check.rows[0].role
    });

    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    console.error('❌ Ошибка удаления пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// КЛУБЫ
// ============================================================
app.get('/api/clubs', authenticate, async (req, res) => {
  try {
    // Архивные клубы в списках не показываем: они остаются в базе, чтобы
    // не осиротить историю участников и мероприятий, но в работе мешают.
    const includeArchived = req.query.include_archived === 'true';
    const result = await pool.query(
      `SELECT c.*, 
              COUNT(DISTINCT cp.profile_id) as participants_count
       FROM clubs c
       LEFT JOIN club_participants cp ON c.id = cp.club_id AND cp.status = 'active'
       ${includeArchived ? '' : "WHERE COALESCE(c.status, 'active') <> 'archived'"}
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ДОСТИЖЕНИЯ — С ВАЛИДАЦИЕЙ
// ============================================================
app.get('/api/achievements', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;

    // ⚠️ Раньше здесь не было никакой фильтрации: любой авторизованный
    // получал достижения всех участников движения.
    let where = '';
    const params = [];

    if (role === 'participant') {
      where = 'WHERE a.participant_id = $1';
      params.push(userId);
    } else if (role === 'parent') {
      where = `WHERE a.participant_id IN (
                 SELECT child_id FROM child_parent
                 WHERE parent_id = $1 AND status = 'active'
               )`;
      params.push(userId);
    } else if (role === 'club_coordinator') {
      const clubIds = await getCoordinatorClubIds(userId);
      if (clubIds.length === 0) return res.json([]);
      where = 'WHERE u.club_id = ANY($1)';
      params.push(clubIds);
    } else if (role === 'tutor') {
      where = `WHERE a.participant_id IN (
                 SELECT ep.participant_id FROM event_participants ep
                 JOIN event_tutor_assignments eta ON eta.event_id = ep.event_id
                 WHERE eta.tutor_id = $1
               )`;
      params.push(userId);
    } else if (!MOVEMENT_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `SELECT a.*, u.full_name as participant_name
       FROM achievements a
       LEFT JOIN users u ON a.participant_id = u.id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/achievements', authenticate, validateBody(achievementSchema), async (req, res) => {
  try {
    const validatedData = req.validatedBody;
    const { participant_id, title, description, achievement_date } = validatedData;

    // ⚠️ Здесь стояла только authenticate: обычный участник мог выдать себе
    // сколько угодно наград, а они питают уровень и рейтинг клуба.
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Выдавать достижения могут только сотрудники' });
    }

    if (!participant_id || !title) {
      return res.status(400).json({ error: 'participant_id и title обязательны' });
    }

    if (!(await canViewParticipant(req.user, participant_id))) {
      return res.status(403).json({ error: 'Этот участник вне вашей зоны ответственности' });
    }

    const result = await pool.query(
      `INSERT INTO achievements (participant_id, title, description, achievement_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, participant_id, title, description, achievement_date, created_at`,
      [participant_id, title, description || '', achievement_date || new Date().toISOString().split('T')[0]]
    );

    await logActivity(req.user.userId, 'ACHIEVEMENT_CREATED', 'achievement', result.rows[0].id, {
      participant_id,
      title
    });

    await createNotification(
      participant_id,
      'achievement',
      '🏅 Новое достижение',
      `Вам присвоено достижение: ${title}`,
      '/my-achievements'
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/achievements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // ⚠️ Раньше любой авторизованный мог удалить достижение любого участника,
    // и это нигде не фиксировалось.
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const check = await pool.query(
      'SELECT id, participant_id, title FROM achievements WHERE id = $1',
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Достижение не найдено' });
    }

    const achievement = check.rows[0];

    if (!(await canViewParticipant(req.user, achievement.participant_id))) {
      return res.status(403).json({ error: 'Этот участник вне вашей зоны ответственности' });
    }

    await pool.query('DELETE FROM achievements WHERE id = $1', [id]);

    await logActivity(req.user.userId, 'ACHIEVEMENT_DELETED', 'achievement', id, {
      participant_id: achievement.participant_id,
      title: achievement.title
    });

    res.json({ message: 'Достижение удалено' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== СОБЫТИЯ ==========
// ============================================================

// 1. ПОЛУЧЕНИЕ СОБЫТИЙ
app.get('/api/events', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📋 ЗАПРОС СОБЫТИЙ:`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    let query = `
      SELECT e.*, 
             c.name as club_name,
             u.full_name as created_by_name,
             (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registrations_count,
             (SELECT json_agg(json_build_object('id', ect.club_id, 'name', clubs.name)) 
              FROM event_club_targets ect 
              LEFT JOIN clubs ON ect.club_id = clubs.id 
              WHERE ect.event_id = e.id) as target_clubs
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      console.log('  👑 Высокие права — видит всё');
    } 
    else if (userRole === 'club_coordinator') {
      let clubId = null;
      
      const userClub = await pool.query('SELECT club_id FROM users WHERE id = $1', [userId]);
      if (userClub.rows.length > 0 && userClub.rows[0].club_id) {
        clubId = userClub.rows[0].club_id;
        console.log(`  🏫 Клуб из профиля: ${clubId}`);
      }
      
      if (!clubId) {
        const coordResult = await pool.query(
          'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
          [userId]
        );
        if (coordResult.rows.length > 0) {
          clubId = coordResult.rows[0].club_id;
          console.log(`  🏫 Клуб из club_coordinators: ${clubId}`);
        }
      }
      
      if (clubId) {
        conditions.push(`
          (e.is_global = true 
           OR e.type IN ('outgoing', 'global_forum')
           OR e.club_id = $${params.length + 1}
           OR EXISTS (SELECT 1 FROM event_club_targets ect WHERE ect.event_id = e.id AND ect.club_id = $${params.length + 1})
          )
        `);
        params.push(clubId);
        console.log(`  ✅ Координатор видит: глобальные + клуб ${clubId} + выездные + отправленные ему`);
      } else {
        conditions.push(`(e.is_global = true OR e.type IN ('outgoing', 'global_forum'))`);
        console.log(`  ⚠️ Координатор без клуба — глобальные и выездные`);
      }
    } 
    else if (userRole === 'participant') {
      const user = await pool.query('SELECT club_id FROM users WHERE id = $1', [userId]);
      if (user.rows.length > 0 && user.rows[0].club_id) {
        const clubId = user.rows[0].club_id;
        conditions.push(`(e.club_id = $${params.length + 1} OR e.is_global = true)`);
        params.push(clubId);
        console.log(`  👤 Участник клуба ${clubId} + глобальные`);
      } else {
        conditions.push(`e.is_global = true`);
        console.log(`  ⚠️ Участник без клуба — только глобальные`);
      }
    } 
    else if (userRole === 'tutor') {
      const assignments = await pool.query(
        'SELECT event_id FROM event_tutor_assignments WHERE tutor_id = $1 AND status = $2',
        [userId, 'accepted']
      );
      if (assignments.rows.length > 0) {
        const eventIds = assignments.rows.map(r => r.event_id);
        conditions.push(`(e.id = ANY($${params.length + 1}::uuid[]) OR e.is_global = true)`);
        params.push(eventIds);
        console.log(`  📚 Тьютор — ${assignments.rows.length} назначений + глобальные`);
      } else {
        conditions.push(`e.is_global = true`);
        console.log(`  ⚠️ Тьютор без назначений — только глобальные`);
      }
    } 
    else if (userRole === 'parent') {
      const children = await pool.query(
        'SELECT child_id FROM child_parent WHERE parent_id = $1 AND status = $2',
        [userId, 'active']
      );
      if (children.rows.length > 0) {
        const childIds = children.rows.map(r => r.child_id);
        conditions.push(`(e.id IN (SELECT event_id FROM registrations WHERE user_id = ANY($${params.length + 1}::uuid[])) OR e.is_global = true)`);
        params.push(childIds);
        console.log(`  👨‍👩‍👦 Родитель — ${children.rows.length} детей`);
      } else {
        conditions.push(`e.is_global = true`);
        console.log(`  ⚠️ Родитель без детей — только глобальные`);
      }
    } 
    else {
      conditions.push(`e.is_global = true`);
      console.log(`  ⚠️ Другая роль — только глобальные`);
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }

    query += ' ORDER BY e.event_date ASC';

    console.log(`  📋 Условия: ${JSON.stringify(conditions)}`);
    console.log(`  📋 Параметры: ${JSON.stringify(params)}`);

    const result = await pool.query(query, params);
    
    console.log(`  ✅ Найдено ${result.rows.length} событий`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения событий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 2. СОЗДАНИЕ СОБЫТИЯ — С ВАЛИДАЦИЕЙ
app.post('/api/events', authenticate, validateBody(eventSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
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
      target_clubs
    } = validatedData;

    console.log(`📝 СОЗДАНИЕ СОБЫТИЯ:`);
    console.log(`  📌 Название: ${title}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);
    console.log(`  🏫 Клуб: ${club_id || 'не указан'}`);
    console.log(`  🌍 Глобальное: ${is_global || false}`);
    console.log(`  🎯 Целевые клубы: ${target_clubs?.length || 0}`);

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Название и дата обязательны' });
    }

    let finalIsGlobal = is_global || false;
    let finalTargetClubs = target_clubs || [];
    let finalClubId = club_id || null;

    if (finalIsGlobal) {
      finalTargetClubs = [];
      console.log(`  🌍 ГЛОБАЛЬНОЕ — видно всем`);
    }

    if (!finalIsGlobal && finalTargetClubs.length === 0) {
      if (userRole === 'club_coordinator') {
        const clubResult = await pool.query(
          'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
          [userId]
        );
        if (clubResult.rows.length > 0) {
          finalClubId = clubResult.rows[0].club_id;
          finalTargetClubs = [finalClubId];
          console.log(`  🏫 Клуб координатора: ${finalClubId}`);
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO events (
        title, description, location, event_date, end_date, start_time, end_time,
        type, capacity, club_id, form_url, is_global, is_club_event, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *`,
      [
        title.trim(), description || '', location || '', event_date,
        end_date || event_date, start_time || null, end_time || null,
        type || 'internal', capacity || 20, 
        finalIsGlobal ? null : finalClubId,
        form_url || null, finalIsGlobal, 
        !finalIsGlobal && finalTargetClubs.length > 0 ? true : false,
        userId
      ]
    );

    const event = result.rows[0];

    if (!finalIsGlobal && finalTargetClubs.length > 0) {
      console.log(`  📌 Сохраняем привязки к ${finalTargetClubs.length} клубам...`);
      for (const clubId of finalTargetClubs) {
        await pool.query(
          `INSERT INTO event_club_targets (event_id, club_id) 
           VALUES ($1, $2) ON CONFLICT (event_id, club_id) DO NOTHING`,
          [event.id, clubId]
        );
      }
      console.log(`  ✅ Привязано ${finalTargetClubs.length} клубов`);
    }

    console.log(`✅ Событие создано: ${event.id} - "${event.title}"`);
    res.status(201).json(event);
  } catch (error) {
    console.error('❌ Ошибка создания события:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 3. ОБНОВЛЕНИЕ СОБЫТИЯ
app.patch('/api/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { 
      title, description, location, event_date, end_date, 
      start_time, end_time, type, capacity, form_url,
      is_global, is_club_event, club_id
    } = req.body;

    console.log(`📝 ОБНОВЛЕНИЕ СОБЫТИЯ ${id}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    const check = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = check.rows[0];
    let canEdit = false;

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canEdit = true;
      console.log('  ✅ Высокие права — можно редактировать');
    } else if (userRole === 'club_coordinator') {
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

    let finalClubId = club_id !== undefined ? club_id : event.club_id;
    let finalIsGlobal = is_global !== undefined ? is_global : event.is_global;

    if (userRole === 'club_coordinator') {
      finalIsGlobal = false;
      console.log('  🔒 Координатор не может сделать событие глобальным');
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
           is_club_event = COALESCE($13, is_club_event)
       WHERE id = $14
       RETURNING *`,
      [title, description, location, event_date, end_date, 
       start_time, end_time, type, capacity, form_url,
       finalClubId, finalIsGlobal, is_club_event, id]
    );

    console.log(`✅ Событие ${id} обновлено`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления события:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 4. УДАЛЕНИЕ СОБЫТИЯ
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

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canDelete = true;
      console.log('  ✅ Высокие права — можно удалить');
    } else if (userRole === 'club_coordinator') {
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

    console.log(`  🗑️ Удаляем связанные данные...`);
    await pool.query('DELETE FROM event_participants WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM event_tutor_assignments WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM registrations WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM event_club_targets WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    console.log(`✅ Событие "${event.title}" удалено`);
    res.json({ message: 'Мероприятие удалено', deleted_event: event.title });
  } catch (error) {
    console.error('❌ Ошибка удаления мероприятия:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 5. МЕРОПРИЯТИЯ КЛУБА ПОЛЬЗОВАТЕЛЯ
app.get('/api/my-club-events', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📋 ЗАПРОС МЕРОПРИЯТИЙ КЛУБА:`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    let clubId = null;

    if (userRole === 'club_coordinator') {
      const clubResult = await pool.query(
        'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
        [userId]
      );
      if (clubResult.rows.length > 0) {
        clubId = clubResult.rows[0].club_id;
        console.log(`  🏫 Клуб координатора: ${clubId}`);
      }
    } else {
      const userCheck = await pool.query('SELECT club_id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length > 0) {
        clubId = userCheck.rows[0].club_id;
        console.log(`  🏫 Клуб пользователя: ${clubId}`);
      }
    }

    if (!clubId) {
      console.log(`  ❌ У пользователя нет клуба`);
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT e.*, c.name as club_name, u.full_name as proposed_by_name,
              (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registrations_count
       FROM events e
       LEFT JOIN clubs c ON e.club_id = c.id
       LEFT JOIN users u ON e.proposed_by = u.id
       WHERE e.club_id = $1
       ORDER BY e.event_date ASC`,
      [clubId]
    );

    console.log(`  ✅ Найдено ${result.rows.length} мероприятий клуба ${clubId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения мероприятий клуба:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// РЕГИСТРАЦИИ
// ============================================================
app.get('/api/registrations', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;

    // ⚠️ Раньше отдавались все регистрации движения любому авторизованному.
    let where = '';
    const params = [];

    if (role === 'participant') {
      where = 'WHERE r.user_id = $1';
      params.push(userId);
    } else if (role === 'parent') {
      where = `WHERE r.user_id IN (
                 SELECT child_id FROM child_parent
                 WHERE parent_id = $1 AND status = 'active'
               )`;
      params.push(userId);
    } else if (role === 'club_coordinator') {
      const clubIds = await getCoordinatorClubIds(userId);
      if (clubIds.length === 0) return res.json([]);
      where = 'WHERE u.club_id = ANY($1)';
      params.push(clubIds);
    } else if (role === 'tutor') {
      where = `WHERE r.event_id IN (
                 SELECT event_id FROM event_tutor_assignments WHERE tutor_id = $1
               )`;
      params.push(userId);
    } else if (!MOVEMENT_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `SELECT r.*, u.full_name as user_name, e.title as event_title
       FROM registrations r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN events e ON r.event_id = e.id
       ${where}
       ORDER BY r.registered_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/registrations', authenticate, validateBody(registrationSchema), async (req, res) => {
  try {
    const validatedData = req.validatedBody;
    const { user_id, event_id } = validatedData;

    if (!user_id || !event_id) {
      return res.status(400).json({ error: 'user_id и event_id обязательны' });
    }

    // ⚠️ Раньше любой авторизованный мог записать любого участника
    // на любое мероприятие.
    const isSelf = user_id === req.user.userId;
    if (!isSelf && !(await canViewParticipant(req.user, user_id))) {
      return res.status(403).json({ error: 'Нельзя записывать этого участника' });
    }
    if (!isSelf && !STAFF_ROLES.includes(req.user.role) && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `INSERT INTO registrations (user_id, event_id, status, registered_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING id, user_id, event_id, status, registered_at`,
      [user_id, event_id]
    );

    await logActivity(req.user.userId, 'REGISTRATION_CREATED', 'registration', result.rows[0].id, {
      user_id,
      event_id
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ОБРАЩЕНИЯ — С ВАЛИДАЦИЕЙ
// ============================================================

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

    if (userRole === 'club_coordinator') {
      query += ' AND a.coordinator_id = $1';
      params.push(userId);
    } else if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      query += ' AND 1 = 0';
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения обращений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/appeals', authenticate, validateBody(appealSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { subject, message, priority } = validatedData;

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

    const clubResult = await pool.query(
      'SELECT club_id FROM club_coordinators WHERE profile_id = $1',
      [userId]
    );
    
    if (clubResult.rows.length === 0) {
      return res.status(400).json({ error: 'Вы не привязаны ни к одному КЮДу' });
    }

    const clubId = clubResult.rows[0].club_id;
    
    const clubCheck = await pool.query(
      'SELECT id, name FROM clubs WHERE id = $1',
      [clubId]
    );
    
    if (clubCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Клуб не найден' });
    }

    console.log(`  🏫 Клуб: ${clubCheck.rows[0].name} (${clubId})`);

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

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

    await pool.query(
      `INSERT INTO appeal_replies (appeal_id, author_id, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, userId, message.trim()]
    );

    const newStatus = status || 'in_progress';
    const resolvedAt = newStatus === 'resolved' || newStatus === 'rejected' ? new Date() : null;
    
    await pool.query(
      `UPDATE appeals SET status = $1, resolved_by = $2, resolved_at = $3 WHERE id = $4`,
      [newStatus, userId, resolvedAt, id]
    );

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/appeals/:id/replies', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // ⚠️ Раньше проверки не было вообще: любой авторизованный читал
    // переписку по обращению любого КЮДа. Сверяем доступ так же, как это
    // уже делает GET /api/appeals.
    const appeal = await pool.query('SELECT coordinator_id FROM appeals WHERE id = $1', [id]);
    if (appeal.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const isAuthor = appeal.rows[0].coordinator_id === userId;
    if (!MOVEMENT_ROLES.includes(role) && !isAuthor) {
      return res.status(403).json({ error: 'Нет доступа к этому обращению' });
    }

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/appeals/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    console.log(`🗑️ УДАЛЕНИЕ ОБРАЩЕНИЯ ${id}`);

    const check = await pool.query('SELECT * FROM appeals WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const appeal = check.rows[0];

    let canDelete = false;
    if (userRole === 'admin' || userRole === 'movement_coordinator') {
      canDelete = true;
    } else if (userRole === 'club_coordinator' && appeal.coordinator_id === userId) {
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'У вас нет прав для удаления этого обращения' });
    }

    await pool.query('DELETE FROM appeal_replies WHERE appeal_id = $1', [id]);
    await pool.query('DELETE FROM appeals WHERE id = $1', [id]);

    console.log(`✅ Обращение ${id} удалено`);
    res.json({ message: 'Обращение удалено' });
  } catch (error) {
    console.error('❌ Ошибка удаления обращения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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

    // ⚠️ Проверялся только префикс 'data:image/', поэтому проходил, например,
    // data:image/svg+xml — а SVG это документ, который умеет исполнять скрипты.
    // Плюс split(',')[1] на строке без запятой ронял запрос в 500.
    const parsed = parseDataImage(avatar_base64, 500 * 1024);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/upload-news-image', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const { image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: 'Нет данных изображения' });
    }

    // Эндпоинт ничего не сохраняет — возвращает строку обратно, и фронт
    // кладёт её в поле image_url новости. Раз уж так, хотя бы проверяем,
    // что это действительно картинка допустимого типа и размера.
    const parsed = parseDataImage(image_base64, 2 * 1024 * 1024);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    res.json({ message: 'Изображение загружено', image_url: image_base64 });
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ИСТОРИЯ УЧАСТНИКА
// ============================================================
app.get('/api/participant-events/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // ⚠️ Раньше userId брался из адреса и ни с чем не сверялся: любой
    // авторизованный участник перебором мог читать историю мероприятий
    // любого другого ребёнка.
    if (!(await canViewParticipant(req.user, userId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этого участника' });
    }
    
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/participant-stats/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Та же дыра, что и в /api/participant-events: достижения, уровень и
    // посещаемость любого участника читались по одному подбору id.
    if (!(await canViewParticipant(req.user, userId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этого участника' });
    }
    
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ПРИВЯЗКА РЕБЁНКА К РОДИТЕЛЮ — УБРАНА
// ============================================================
// Раньше родитель привязывал ребёнка, вводя email и пароль ребёнка.
// Схема была плоха дважды. Во-первых, эндпоинт подсказывал, существует
// ли такой email, — это чинилось, но сама идея осталась: чтобы стать
// «законным представителем» в системе, достаточно было знать пароль
// ребёнка. Во-вторых, на практике это учит семью пользоваться одной
// учётной записью, и тогда запись «согласие дал законный представитель»
// не доказывает ничего — а ради этой записи всё и затевалось.
//
// Теперь приглашение выпускает руководитель КЮДа или сам участник, а
// родитель заводит собственный пароль: см. /api/parent-invitations/*.
// Маршрут оставлен, чтобы старые вкладки в браузере получали объяснение,
// а не молчаливую ошибку.
app.post('/api/parent-link-child', authenticate, (req, res) => {
  res.status(410).json({
    error: 'Привязка по паролю ребёнка больше не используется. Попросите руководителя КЮДа прислать ссылку-приглашение или введите код, который ребёнок видит в своём профиле.',
    code: 'LINK_BY_CHILD_PASSWORD_REMOVED'
  });
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

    // ⚠️ Ниже идут три UPDATE подряд, раньше — без транзакции. Сбой между
    // ними оставлял клуб либо с двумя президентами, либо с president_id на
    // пользователя, у которого снят флаг.
    if (!president_id) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET is_president = false WHERE club_id = $1 AND is_president = true', [clubId]);
        await client.query('UPDATE clubs SET president_id = NULL, updated_at = NOW() WHERE id = $1', [clubId]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      invalidateUserCache();
      await logActivity(userId, 'PRESIDENT_REMOVED', 'club', clubId, {});
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

    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET is_president = false WHERE club_id = $1 AND is_president = true', [clubId]);
      await client.query('UPDATE users SET is_president = true WHERE id = $1', [president_id]);
      result = await client.query('UPDATE clubs SET president_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [president_id, clubId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    invalidateUserCache();   // сменился президент — сбрасываем кэш целиком

    const president = await pool.query('SELECT id, full_name, email, avatar_url FROM users WHERE id = $1', [president_id]);

    await logActivity(userId, 'PRESIDENT_ASSIGNED', 'club', clubId, {
      president: candidate.full_name
    });

    await createNotification(
      president_id,
      'president',
      '👑 Вы назначены президентом клуба',
      `Вам присвоена должность президента КЮДа`,
      '/president-tasks'
    );

    res.json({ message: 'Президент назначен', club: result.rows[0], president: president.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка назначения президента:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// НОВОСТИ — С ВАЛИДАЦИЕЙ
// ============================================================
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM news ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения новостей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/news', authenticate, requireAdminOrCoordinator, validateBody(newsSchema), async (req, res) => {
  try {
    const validatedData = req.validatedBody;
    const { title, content, image_url } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/news/:id', authenticate, requireAdminOrCoordinator, validateBody(newsSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = req.validatedBody;
    const { title, content, image_url } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query('UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false', [userId]);
    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ЗАДАНИЯ ПРЕЗИДЕНТА — С ВАЛИДАЦИЕЙ
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/president-tasks', authenticate, validateBody(presidentTaskSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { title, description, priority, deadline, club_id, assigned_to, is_global } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ОТЧЁТЫ — С ВАЛИДАЦИЕЙ
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/reports', authenticate, validateBody(reportSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { club_id, report_month, report_text, events_count, participants_count } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ДОКУМЕНТЫ — С ВАЛИДАЦИЕЙ
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/documents', authenticate, validateBody(documentSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { title, content, category, document_type, is_public, club_id, tags } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// МАССОВЫЕ УВЕДОМЛЕНИЯ — С ВАЛИДАЦИЕЙ
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/mass-notifications', authenticate, validateBody(massNotificationSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { title, message, recipients, priority, scheduled_at } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ЦЕЛИ И KPI — С ВАЛИДАЦИЕЙ
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/goals', authenticate, validateBody(goalSchema), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { title, description, category, target_value, unit, start_date, end_date, assigned_to, club_id } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/goals/:id', authenticate, validateBody(goalSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    const validatedData = req.validatedBody;
    const { title, description, category, target_value, current_value, unit, status, start_date, end_date, assigned_to, club_id } = validatedData;

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Второй обработчик /api/my-club-events удалён: Express отдаёт запрос
// первому подходящему маршруту, поэтому этот код никогда не выполнялся,
// но при правках вводил в заблуждение — правили мёртвую копию.

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
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// РЕГИСТРАЦИЯ НА МЕРОПРИЯТИЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================================

// 1. ЗАПИСЬ НА МЕРОПРИЯТИЕ (POST /api/event-registrations)
app.post('/api/event-registrations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { event_id } = req.body;

    console.log(`📝 ЗАПИСЬ НА МЕРОПРИЯТИЕ:`);
    console.log(`  👤 Пользователь: ${userId}`);
    console.log(`  📅 Мероприятие: ${event_id}`);

    if (!event_id) {
      return res.status(400).json({ error: 'event_id обязателен' });
    }

    if (typeof event_id !== 'string' || event_id.length < 10) {
      return res.status(400).json({ error: 'Некорректный event_id' });
    }

    const eventCheck = await pool.query(
      'SELECT id, title, registration_deadline, max_participants, club_id, moderation_status FROM events WHERE id = $1',
      [event_id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];

    if (event.moderation_status !== 'approved') {
      return res.status(400).json({ error: 'Мероприятие ещё не одобрено' });
    }

    if (event.registration_deadline) {
      try {
        const now = new Date();
        const deadline = new Date(event.registration_deadline);
        if (!isNaN(deadline.getTime()) && now.getTime() > deadline.getTime()) {
          return res.status(400).json({ error: 'Регистрация закрыта' });
        }
      } catch (e) {
        console.warn('Ошибка парсинга дедлайна:', e);
      }
    }

    if (event.max_participants > 0) {
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = $1 AND status = $2',
        [event_id, 'confirmed']
      );
      const currentCount = parseInt(countResult.rows[0].count);
      if (currentCount >= event.max_participants) {
        return res.status(400).json({ error: 'Нет свободных мест' });
      }
    }

    const existing = await pool.query(
      'SELECT id, status FROM event_registrations WHERE event_id = $1 AND user_id = $2',
      [event_id, userId]
    );

    if (existing.rows.length > 0) {
      const status = existing.rows[0].status;
      if (status === 'pending') {
        return res.status(400).json({ error: 'Вы уже отправили заявку' });
      }
      if (status === 'confirmed') {
        return res.status(400).json({ error: 'Вы уже зарегистрированы' });
      }
      if (status === 'rejected') {
        return res.status(400).json({ error: 'Ваша заявка была отклонена' });
      }
    }

    const result = await pool.query(
      `INSERT INTO event_registrations (event_id, user_id, status, registered_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [event_id, userId]
    );

    console.log(`✅ Заявка создана: ${result.rows[0].id}`);

    if (event.club_id) {
      const coordinators = await pool.query(
        'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
        [event.club_id]
      );
      for (const coord of coordinators.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
           VALUES ($1, 'registration', '📝 Новая заявка на мероприятие', $2, '/events', 'high', NOW())`,
          [coord.profile_id, `Новая заявка на "${event.title}"`]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Заявка отправлена!',
      registration: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// 2. ОТПИСКА ОТ МЕРОПРИЯТИЯ (DELETE /api/event-registrations/:id)
app.delete('/api/event-registrations/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    console.log(`🗑️ ОТПИСКА ОТ МЕРОПРИЯТИЯ:`);
    console.log(`  📝 Регистрация: ${id}`);
    console.log(`  👤 Пользователь: ${userId}`);

    const check = await pool.query(
      'SELECT id, user_id, status FROM event_registrations WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const registration = check.rows[0];

    if (registration.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    if (registration.status === 'confirmed') {
      return res.status(400).json({ error: 'Вы не можете отписаться после подтверждения' });
    }

    await pool.query('DELETE FROM event_registrations WHERE id = $1', [id]);

    res.json({ message: 'Вы отписались от мероприятия' });
  } catch (error) {
    console.error('❌ Ошибка отписки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 3. ПОЛУЧИТЬ СПИСОК РЕГИСТРАЦИЙ (GET /api/events/:eventId/registrations)
app.get('/api/events/:eventId/registrations', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📋 ПОЛУЧЕНИЕ РЕГИСТРАЦИЙ:`);
    console.log(`  📅 Мероприятие: ${eventId}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    const eventCheck = await pool.query(
      'SELECT club_id, created_by FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];
    let canView = false;

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canView = true;
    } else if (userRole === 'club_coordinator') {
      const coordCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, event.club_id]
      );
      if (coordCheck.rows.length > 0) canView = true;
    }

    if (!canView) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const result = await pool.query(
      `SELECT r.*, 
              u.full_name, u.email, u.phone, u.school, u.class_name,
              u.avatar_url, c.name as club_name
       FROM event_registrations r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE r.event_id = $1
       ORDER BY r.registered_at ASC`,
      [eventId]
    );

    const stats = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM event_registrations 
       WHERE event_id = $1 
       GROUP BY status`,
      [eventId]
    );

    res.json({
      registrations: result.rows,
      stats: stats.rows
    });

  } catch (error) {
    console.error('❌ Ошибка получения регистраций:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 4. СТАТУС РЕГИСТРАЦИИ (GET /api/events/:eventId/registration-status)
app.get('/api/events/:eventId/registration-status', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    console.log(`🔍 ПРОВЕРКА СТАТУСА РЕГИСТРАЦИИ:`);
    console.log(`  📅 Мероприятие: ${eventId}`);
    console.log(`  👤 Пользователь: ${userId}`);

    const result = await pool.query(
      `SELECT id, status, registered_at, confirmed_at
       FROM event_registrations
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        status: null, 
        isRegistered: false 
      });
    }

    res.json({
      id: result.rows[0].id,
      status: result.rows[0].status,
      isRegistered: true,
      registered_at: result.rows[0].registered_at,
      confirmed_at: result.rows[0].confirmed_at
    });

  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 5. ИЗМЕНЕНИЕ СТАТУСА ЗАЯВКИ (PATCH /api/event-registrations/:id/status)
app.patch('/api/event-registrations/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📝 ИЗМЕНЕНИЕ СТАТУСА:`);
    console.log(`  📝 Регистрация: ${id}`);
    console.log(`  🔄 Новый статус: ${status}`);

    if (!['pending', 'confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус' });
    }

    const regCheck = await pool.query(
      `SELECT r.*, e.club_id, e.title 
       FROM event_registrations r
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [id]
    );

    if (regCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const registration = regCheck.rows[0];
    let canManage = false;

    if (['admin', 'movement_coordinator'].includes(userRole)) {
      canManage = true;
    } else if (userRole === 'club_coordinator') {
      const coordCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, registration.club_id]
      );
      if (coordCheck.rows.length > 0) canManage = true;
    }

    if (!canManage) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const result = await pool.query(
      `UPDATE event_registrations 
       SET status = $1, 
           confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json({
      message: `Заявка ${status === 'confirmed' ? 'подтверждена' : 'отклонена'}`,
      registration: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Ошибка изменения статуса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 6. МОИ РЕГИСТРАЦИИ (GET /api/my-registrations)
app.get('/api/my-registrations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT r.*, 
              e.title, e.event_date, e.location, e.type, e.is_global,
              c.name as club_name
       FROM event_registrations r
       LEFT JOIN events e ON r.event_id = e.id
       LEFT JOIN clubs c ON e.club_id = c.id
       WHERE r.user_id = $1
       ORDER BY e.event_date ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения регистраций:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 7. ОДОБРЕНИЕ ЗАЯВКИ КЛУБА (PATCH /api/event-registrations/:id/approve-club)
app.patch('/api/event-registrations/:id/approve-club', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`👑 ОДОБРЕНИЕ ЗАЯВКИ КЛУБА:`);
    console.log(`  📝 Заявка: ${id}`);
    console.log(`  🔄 Статус: ${status}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ 
        error: 'Только координатор движения может одобрять заявки клубов' 
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Статус должен быть "approved" или "rejected"' });
    }

    const regCheck = await pool.query(
      `SELECT r.*, e.title, e.club_id 
       FROM event_registrations r
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [id]
    );

    if (regCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const registration = regCheck.rows[0];

    const eventCheck = await pool.query(
      'SELECT type, is_global FROM events WHERE id = $1',
      [registration.event_id]
    );

    const event = eventCheck.rows[0];
    if (!['outgoing', 'global_forum'].includes(event.type) && !event.is_global) {
      return res.status(400).json({ 
        error: 'Это мероприятие не требует одобрения координатора движения' 
      });
    }

    const newStatus = status === 'approved' ? 'confirmed' : 'rejected';
    const confirmedAt = status === 'approved' ? new Date() : null;

    const result = await pool.query(
      `UPDATE event_registrations 
       SET status = $1, confirmed_at = $2
       WHERE id = $3
       RETURNING *`,
      [newStatus, confirmedAt, id]
    );

    if (status === 'approved') {
      await pool.query(
        `UPDATE events SET registrations_count = registrations_count + 1 WHERE id = $1`,
        [registration.event_id]
      );
    }

    const clubCoord = await pool.query(
      'SELECT profile_id FROM club_coordinators WHERE club_id = $1',
      [registration.club_id]
    );
    
    if (clubCoord.rows.length > 0) {
      const message = status === 'approved' 
        ? `✅ Заявка на "${registration.title}" одобрена!` 
        : `❌ Заявка на "${registration.title}" отклонена`;
      
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, priority, created_at)
         VALUES ($1, 'registration', '📝 Статус заявки обновлён', $2, '/events', 'high', NOW())`,
        [clubCoord.rows[0].profile_id, message]
      );
    }

    res.json({
      success: true,
      message: status === 'approved' ? 'Заявка клуба одобрена' : 'Заявка клуба отклонена',
      registration: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка одобрения заявки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// 8. ЭКСПОРТ В EXCEL (GET /api/events/:eventId/export)
app.get('/api/events/:eventId/export', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`📊 ЭКСПОРТ УЧАСТНИКОВ:`);
    console.log(`  📅 Мероприятие: ${eventId}`);
    console.log(`  👤 Пользователь: ${userId} (${userRole})`);

    const eventCheck = await pool.query(
      'SELECT club_id, created_by, title FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const event = eventCheck.rows[0];
    let canView = false;

    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userRole)) {
      canView = true;
    } else if (userRole === 'club_coordinator') {
      const coordCheck = await pool.query(
        'SELECT id FROM club_coordinators WHERE profile_id = $1 AND club_id = $2',
        [userId, event.club_id]
      );
      if (coordCheck.rows.length > 0) canView = true;
    }

    if (!canView) {
      return res.status(403).json({ error: 'У вас нет прав' });
    }

    const result = await pool.query(
      `SELECT r.status as registration_status, r.registered_at, r.confirmed_at,
              u.full_name, u.email, u.phone, u.school, u.class_name,
              u.birth_date, c.name as club_name
       FROM event_registrations r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE r.event_id = $1
       ORDER BY r.registered_at ASC`,
      [eventId]
    );

    const headers = [
      'ФИО', 'Email', 'Телефон', 'Школа', 'Класс', 'Клуб',
      'Статус', 'Дата регистрации', 'Дата подтверждения'
    ];

    let csv = headers.join(';') + '\n';
    
    const statusMap = {
      'pending': 'Ожидает',
      'confirmed': 'Подтверждён',
      'rejected': 'Отклонён'
    };

    for (const row of result.rows) {
      csv += [
        row.full_name || '',
        row.email || '',
        row.phone || '',
        row.school || '',
        row.class_name || '',
        row.club_name || '',
        statusMap[row.registration_status] || row.registration_status,
        row.registered_at ? new Date(row.registered_at).toLocaleString('ru-RU') : '',
        row.confirmed_at ? new Date(row.confirmed_at).toLocaleString('ru-RU') : ''
      ].join(';') + '\n';
    }

    const bom = '\uFEFF';
    const finalCsv = bom + csv;

    const fileName = `Ucastniki_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(finalCsv, 'utf8'));
    
    res.send(finalCsv);

  } catch (error) {
    console.error('❌ Ошибка экспорта:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// 1. ЗАМЕТКИ ОБ УЧАСТНИКЕ
// ============================================================

// Получить все заметки участника
app.get('/api/participant-notes/:participantId', authenticate, async (req, res) => {
  try {
    const { participantId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Проверяем права: координатор движения, администратор, координатор КЮДа, тьютор
    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // ⚠️ Роль проверялась, а клуб — нет: координатор одного КЮДа читал
    // внутренние заметки сотрудников о детях любого другого КЮДа.
    if (!(await canViewParticipant(req.user, participantId))) {
      return res.status(403).json({ error: 'Этот участник вне вашей зоны ответственности' });
    }

    let visibilityCondition = '';
    const params = [participantId];

    // Координатор КЮДа и тьютор видят только свои заметки и общие
    if (['club_coordinator', 'tutor'].includes(userRole)) {
      visibilityCondition = ' AND (visibility = $2 OR author_id = $3)';
      params.push('all_staff', userId);
    }

    const query = `
      SELECT n.*, 
             u.full_name as author_name, u.role as author_role,
             u.avatar_url as author_avatar
      FROM participant_notes n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.participant_id = $1
      ${visibilityCondition}
      ORDER BY n.pinned DESC, n.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения заметок:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Создать заметку об участнике
app.post('/api/participant-notes', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { participant_id, content, visibility = 'coordinator_only', pinned = false } = req.body;

    const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    if (!participant_id || !content) {
      return res.status(400).json({ error: 'participant_id и content обязательны' });
    }

    // Заметку тоже можно было написать о ком угодно, включая чужие КЮДы
    if (!(await canViewParticipant(req.user, participant_id))) {
      return res.status(403).json({ error: 'Этот участник вне вашей зоны ответственности' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO participant_notes (participant_id, author_id, content, visibility, pinned, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [participant_id, userId, content.trim(), visibility, pinned || false]
    );

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания заметки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// Обновить заметку
app.patch('/api/participant-notes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { content, visibility, pinned } = req.body;

    const check = await pool.query(
      'SELECT author_id FROM participant_notes WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Заметка не найдена' });
    }

    if (check.rows[0].author_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Вы можете редактировать только свои заметки' });
    }

    const result = await pool.query(
      `UPDATE participant_notes 
       SET content = COALESCE($1, content),
           visibility = COALESCE($2, visibility),
           pinned = COALESCE($3, pinned),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [content, visibility, pinned, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления заметки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Удалить заметку
app.delete('/api/participant-notes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const check = await pool.query(
      'SELECT author_id FROM participant_notes WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Заметка не найдена' });
    }

    if (check.rows[0].author_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Вы можете удалять только свои заметки' });
    }

    await pool.query('DELETE FROM participant_notes WHERE id = $1', [id]);

    res.json({ message: 'Заметка удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления заметки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// 2. МАССОВЫЕ ДЕЙСТВИЯ
// ============================================================

// Создать массовое действие
app.post('/api/bulk-actions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['admin', 'movement_coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const { action_type, target_ids, data } = req.body;

    if (!action_type || !target_ids || target_ids.length === 0) {
      return res.status(400).json({ error: 'action_type и target_ids обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO bulk_actions (action_type, target_ids, created_by, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING *`,
      [action_type, target_ids, userId]
    );

    // Запускаем обработку асинхронно
    processBulkAction(result.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания массового действия:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Получить статус массового действия
app.get('/api/bulk-actions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // ⚠️ Проверки прав здесь не было вообще: любой авторизованный читал
    // чужие массовые действия вместе со списком затронутых участников.
    if (!['admin', 'movement_coordinator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `SELECT id, action_type, target_ids, created_by, status, result, created_at, completed_at
       FROM bulk_actions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Действие не найдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Асинхронная обработка массового действия
// Раньше внутри цикла стояли пустые комментарии: «Присвоить клуб»,
// «Отправить уведомление», «Экспорт данных». Функция исправно считала
// обработанные записи, писала статус «выполнено» и не делала ничего.
// Массовое действие сообщало об успехе, которого не было.
async function processBulkAction(actionId) {
  try {
    const action = await pool.query('SELECT * FROM bulk_actions WHERE id = $1', [actionId]);
    if (action.rows.length === 0) return;

    const { action_type, target_ids, data, created_by } = action.rows[0];

    await pool.query('UPDATE bulk_actions SET status = $1 WHERE id = $2', ['processing', actionId]);

    const result = { processed: 0, failed: 0, details: [] };
    const payload = data || {};

    for (const targetId of target_ids) {
      try {
        if (action_type === 'assign_club') {
          if (!payload.club_id) throw new Error('Не указан клуб');
          const upd = await pool.query(
            `UPDATE users SET club_id = $1, updated_at = NOW()
             WHERE id = $2 AND role IN ('participant', 'club_coordinator', 'tutor')
             RETURNING id`,
            [payload.club_id, targetId]
          );
          if (upd.rows.length === 0) throw new Error('Пользователь не найден или роль не допускает привязку к клубу');
          invalidateUserCache(targetId);
        } else if (action_type === 'send_notification') {
          if (!payload.title || !payload.message) throw new Error('Не указан заголовок или текст');
          await createNotification(
            targetId,
            payload.type || 'system',
            payload.title,
            payload.message,
            payload.link || null,
            payload.priority || 'normal'
          );
        } else {
          // Неизвестное действие — это ошибка, а не повод отчитаться об успехе
          throw new Error(`Неизвестный вид массового действия: ${action_type}`);
        }
        result.processed++;
      } catch (err) {
        result.failed++;
        result.details.push({ id: targetId, error: err.message });
      }
    }

    await pool.query(
      `UPDATE bulk_actions SET status = $1, result = $2, completed_at = NOW() WHERE id = $3`,
      [result.failed > 0 && result.processed === 0 ? 'failed' : 'completed', result, actionId]
    );

    await logActivity(created_by, 'BULK_ACTION_DONE', 'user', null, {
      action_type,
      processed: result.processed,
      failed: result.failed
    });
  } catch (error) {
    console.error('❌ Ошибка обработки массового действия:', error);
    await pool.query(`UPDATE bulk_actions SET status = 'failed' WHERE id = $1`, [actionId]);
  }
}

// ============================================================
// 3. НАПОМИНАНИЯ
// ============================================================

// Создать напоминание
app.post('/api/reminders', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { event_id, user_id, type, title, message, remind_at } = req.body;

    if (!title || !remind_at) {
      return res.status(400).json({ error: 'title и remind_at обязательны' });
    }

    // ⚠️ Раньше любой авторизованный мог создать напоминание любому
    // пользователю — готовый канал для спама по всему движению.
    const targetId = user_id || userId;
    if (targetId !== userId && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Напоминание можно создать только себе' });
    }
    if (targetId !== userId && !(await canViewParticipant(req.user, targetId))) {
      return res.status(403).json({ error: 'Этот пользователь вне вашей зоны ответственности' });
    }

    // Напоминание «всем» (user_id = null) — только для координаторов движения
    if (!user_id && !MOVEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Общие напоминания может создавать только координатор движения' });
    }

    const result = await pool.query(
      `INSERT INTO reminders (event_id, user_id, type, title, message, remind_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [event_id || null, user_id || null, type || 'event', title.trim(), message || '', remind_at]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания напоминания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Получить мои напоминания
app.get('/api/reminders/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT r.*, 
              e.title as event_title,
              e.event_date
       FROM reminders r
       LEFT JOIN events e ON r.event_id = e.id
       WHERE (r.user_id = $1 OR r.user_id IS NULL)
         AND r.sent = false
         AND r.remind_at > NOW()
       ORDER BY r.remind_at ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения напоминаний:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Отметить напоминание как отправленное
app.patch('/api/reminders/:id/sent', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // ⚠️ Проверки владельца не было: любой мог пометить чужое напоминание
    // отправленным, то есть погасить его до того, как человек его увидит.
    const result = await pool.query(
      `UPDATE reminders 
       SET sent = true, sent_at = NOW()
       WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
       RETURNING *`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Напоминание не найдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== ЗАДАЧИ (ПЛАНИРОВЩИК) ==========
// ============================================================
// Таблица tasks и схема taskSchema существовали с самого начала, но
// обработчиков не было: страница «Планировщик задач» показывала форму,
// делала вид, что сохраняет, и теряла всё при обновлении.

app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Координаторы движения и админы видят все задачи, остальные —
    // свои: поставленные им либо созданные ими.
    let where = '';
    const params = [];
    if (!MOVEMENT_ROLES.includes(role)) {
      where = 'WHERE (t.assigned_to = $1 OR t.created_by = $1)';
      params.push(userId);
    }

    const result = await pool.query(
      `SELECT t.id, t.title, t.description, t.category, t.priority, t.status,
              t.due_date, t.assigned_to, t.created_by, t.recurrence,
              t.recurrence_end, t.completed_at, t.created_at, t.updated_at,
              a.full_name AS assigned_to_name,
              c.full_name AS created_by_name
       FROM tasks t
       LEFT JOIN users a ON t.assigned_to = a.id
       LEFT JOIN users c ON t.created_by = c.id
       ${where}
       ORDER BY
         CASE t.status WHEN 'completed' THEN 1 ELSE 0 END,
         CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.due_date NULLS LAST,
         t.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения задач:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/tasks', authenticate, validateBody(taskSchema), async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const d = req.validatedBody;

    const result = await pool.query(
      `INSERT INTO tasks (title, description, category, priority, status, due_date,
                          assigned_to, created_by, recurrence, recurrence_end,
                          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        d.title.trim(), d.description || '', d.category || 'general',
        d.priority || 'medium', d.status || 'pending', nullableDate(d.due_date),
        d.assigned_to || null, userId, d.recurrence || 'none', nullableDate(d.recurrence_end)
      ]
    );

    const task = result.rows[0];

    await logActivity(userId, 'TASK_CREATED', 'task', task.id, { title: task.title });

    if (task.assigned_to && task.assigned_to !== userId) {
      await createNotification(
        task.assigned_to,
        'task',
        '📋 Новая задача',
        `Вам поставлена задача: ${task.title}`,
        '/tasks-planner',
        task.priority === 'urgent' ? 'high' : 'normal'
      );
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('❌ Ошибка создания задачи:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/tasks/:id', authenticate, validateBody(taskSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const check = await pool.query('SELECT created_by, assigned_to, status FROM tasks WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    const task = check.rows[0];
    const canEdit = MOVEMENT_ROLES.includes(role) || task.created_by === userId || task.assigned_to === userId;
    if (!canEdit) {
      return res.status(403).json({ error: 'Можно менять только свои задачи' });
    }

    const d = req.validatedBody;

    // completed_at проставляется в момент, когда задача стала выполненной,
    // и снимается, если её вернули в работу
    const wasCompleted = task.status === 'completed';
    const isCompleted = d.status === 'completed';
    const completedAt = isCompleted ? (wasCompleted ? undefined : 'NOW()') : null;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, category = $3, priority = $4, status = $5,
           due_date = $6, assigned_to = $7, recurrence = $8, recurrence_end = $9,
           completed_at = ${completedAt === undefined ? 'completed_at' : (completedAt === null ? 'NULL' : 'NOW()')},
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        d.title.trim(), d.description || '', d.category || 'general',
        d.priority || 'medium', d.status || 'pending', nullableDate(d.due_date),
        d.assigned_to || null, d.recurrence || 'none', nullableDate(d.recurrence_end),
        id
      ]
    );

    await logActivity(userId, 'TASK_UPDATED', 'task', id, { title: d.title, status: d.status });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления задачи:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const check = await pool.query('SELECT created_by, title FROM tasks WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    if (!MOVEMENT_ROLES.includes(role) && check.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Удалять можно только свои задачи' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    await logActivity(userId, 'TASK_DELETED', 'task', id, { title: check.rows[0].title });

    res.json({ message: 'Задача удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления задачи:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== КАТЕГОРИИ ДОСТИЖЕНИЙ ==========
// ============================================================
// Таблица заполнена восемью категориями с баллами и цветами, но страница
// управления ими тоже ничего не сохраняла.

app.get('/api/achievement-categories', authenticate, async (req, res) => {
  try {
    // Читать может любой авторизованный: категории нужны, чтобы
    // показывать достижения в профиле участника
    const result = await pool.query(
      `SELECT id, name, description, icon, color, points, is_active, created_at
       FROM achievement_categories
       ORDER BY is_active DESC, points DESC, name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения категорий достижений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/achievement-categories', authenticate, requireAdminOrCoordinator, validateBody(achievementCategorySchema), async (req, res) => {
  try {
    const d = req.validatedBody;

    const exists = await pool.query('SELECT id FROM achievement_categories WHERE lower(name) = lower($1)', [d.name.trim()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Категория с таким названием уже есть', code: 'DUPLICATE_NAME' });
    }

    const result = await pool.query(
      `INSERT INTO achievement_categories (name, description, icon, color, points, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, description, icon, color, points, is_active, created_at`,
      [d.name.trim(), d.description || '', d.icon || '', d.color || '#0B1F3A', d.points ?? 0, d.is_active !== false]
    );

    await logActivity(req.user.userId, 'ACHIEVEMENT_CATEGORY_CREATED', 'achievement_category', result.rows[0].id, { name: d.name });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/achievement-categories/:id', authenticate, requireAdminOrCoordinator, validateBody(achievementCategorySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.validatedBody;

    const result = await pool.query(
      `UPDATE achievement_categories
       SET name = $1, description = $2, icon = $3, color = $4, points = $5, is_active = $6
       WHERE id = $7
       RETURNING id, name, description, icon, color, points, is_active, created_at`,
      [d.name.trim(), d.description || '', d.icon || '', d.color || '#0B1F3A', d.points ?? 0, d.is_active !== false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    await logActivity(req.user.userId, 'ACHIEVEMENT_CATEGORY_UPDATED', 'achievement_category', id, { name: d.name });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/achievement-categories/:id', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query('SELECT name FROM achievement_categories WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    // Если категорией уже пользовались, удалять нельзя: у участников
    // пропадут награды. Прячем её, а не стираем.
    const used = await pool.query('SELECT COUNT(*)::int AS n FROM achievements WHERE category_id = $1', [id]);
    if (used.rows[0].n > 0) {
      await pool.query('UPDATE achievement_categories SET is_active = false WHERE id = $1', [id]);
      await logActivity(req.user.userId, 'ACHIEVEMENT_CATEGORY_ARCHIVED', 'achievement_category', id, {
        name: check.rows[0].name,
        used_by: used.rows[0].n
      });
      return res.json({
        message: `Категория скрыта: она уже присвоена ${used.rows[0].n} достижениям, удалить её нельзя`,
        archived: true
      });
    }

    await pool.query('DELETE FROM achievement_categories WHERE id = $1', [id]);
    await logActivity(req.user.userId, 'ACHIEVEMENT_CATEGORY_DELETED', 'achievement_category', id, { name: check.rows[0].name });

    res.json({ message: 'Категория удалена', archived: false });
  } catch (error) {
    console.error('❌ Ошибка удаления категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== ПРИГЛАШЕНИЯ ТЬЮТОРОВ ==========
// ============================================================
// Страница вызывала четыре метода API, которых на сервере не было —
// все запросы отвечали 404.

app.get('/api/tutor-invitations', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;

    let where = '';
    const params = [];

    if (role === 'tutor') {
      where = 'WHERE ti.tutor_id = $1';
      params.push(userId);
    } else if (role === 'club_coordinator') {
      const clubIds = await getCoordinatorClubIds(userId);
      if (clubIds.length === 0) {
        where = 'WHERE ti.created_by = $1';
        params.push(userId);
      } else {
        where = 'WHERE (ti.created_by = $1 OR ti.club_id = ANY($2))';
        params.push(userId, clubIds);
      }
    } else if (!MOVEMENT_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `SELECT ti.id, ti.tutor_id, ti.event_id, ti.club_id, ti.created_by, ti.message,
              ti.role, ti.responsibilities, ti.start_date, ti.end_date, ti.status,
              ti.responded_at, ti.created_at,
              t.full_name AS tutor_name, t.email AS tutor_email,
              e.title AS event_title, e.event_date,
              c.name AS club_name,
              cr.full_name AS created_by_name
       FROM tutor_invitations ti
       LEFT JOIN users t ON ti.tutor_id = t.id
       LEFT JOIN events e ON ti.event_id = e.id
       LEFT JOIN clubs c ON ti.club_id = c.id
       LEFT JOIN users cr ON ti.created_by = cr.id
       ${where}
       ORDER BY ti.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения приглашений тьюторов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/tutor-invitations', authenticate, validateBody(tutorInvitationSchema), async (req, res) => {
  try {
    const { userId, role } = req.user;

    const allowed = [...MOVEMENT_ROLES, 'club_coordinator'];
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Приглашать тьюторов могут координаторы и администрация' });
    }

    const d = req.validatedBody;

    const tutor = await pool.query('SELECT id, full_name, role FROM users WHERE id = $1', [d.tutor_id]);
    if (tutor.rows.length === 0) {
      return res.status(404).json({ error: 'Тьютор не найден' });
    }
    if (tutor.rows[0].role !== 'tutor') {
      return res.status(400).json({ error: 'Приглашать можно только пользователя с ролью «тьютор»' });
    }

    // Координатор КЮДа приглашает только в свои клубы
    if (role === 'club_coordinator' && d.club_id) {
      const clubIds = await getCoordinatorClubIds(userId);
      if (!clubIds.includes(d.club_id)) {
        return res.status(403).json({ error: 'Этот КЮД вне вашей зоны ответственности' });
      }
    }

    let result;
    try {
      result = await pool.query(
        `INSERT INTO tutor_invitations (tutor_id, event_id, club_id, created_by, message,
                                        role, responsibilities, start_date, end_date,
                                        status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
         RETURNING *`,
        [
          d.tutor_id, d.event_id || null, d.club_id || null, userId, d.message || '',
          d.role || 'Тьютор', d.responsibilities || [], nullableDate(d.start_date), nullableDate(d.end_date)
        ]
      );
    } catch (error) {
      // В таблице есть UNIQUE (tutor_id, event_id)
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Этот тьютор уже приглашён на данное мероприятие',
          code: 'DUPLICATE_INVITATION'
        });
      }
      throw error;
    }

    const invitation = result.rows[0];

    await logActivity(userId, 'TUTOR_INVITED', 'tutor_invitation', invitation.id, {
      tutor: tutor.rows[0].full_name
    });

    await createNotification(
      d.tutor_id,
      'tutor_invitation',
      '📚 Приглашение к работе',
      `Вас приглашают в качестве тьютора${d.role && d.role !== 'Тьютор' ? ` (${d.role})` : ''}`,
      '/tutor-invitations',
      'high'
    );

    res.status(201).json(invitation);
  } catch (error) {
    console.error('❌ Ошибка создания приглашения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.patch('/api/tutor-invitations/:id/respond', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId } = req.user;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Ответ должен быть accepted или declined' });
    }

    const check = await pool.query(
      'SELECT tutor_id, created_by, status, event_id FROM tutor_invitations WHERE id = $1',
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Приглашение не найдено' });
    }

    // Отвечать может только сам приглашённый
    if (check.rows[0].tutor_id !== userId) {
      return res.status(403).json({ error: 'Отвечать на приглашение может только приглашённый тьютор' });
    }

    if (check.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'На это приглашение уже дан ответ', code: 'ALREADY_ANSWERED' });
    }

    const result = await pool.query(
      `UPDATE tutor_invitations
       SET status = $1, responded_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    await logActivity(userId, status === 'accepted' ? 'TUTOR_INVITATION_ACCEPTED' : 'TUTOR_INVITATION_DECLINED',
      'tutor_invitation', id, {});

    await createNotification(
      check.rows[0].created_by,
      'tutor_invitation',
      status === 'accepted' ? '✅ Приглашение принято' : '❌ Приглашение отклонено',
      `Тьютор ${status === 'accepted' ? 'принял' : 'отклонил'} ваше приглашение`,
      '/tutor-invitations'
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка ответа на приглашение:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/tutor-invitations/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const check = await pool.query('SELECT created_by, tutor_id FROM tutor_invitations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Приглашение не найдено' });
    }

    if (!MOVEMENT_ROLES.includes(role) && check.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Отзывать можно только свои приглашения' });
    }

    await pool.query('DELETE FROM tutor_invitations WHERE id = $1', [id]);
    await logActivity(userId, 'TUTOR_INVITATION_CANCELLED', 'tutor_invitation', id, {});

    res.json({ message: 'Приглашение отозвано' });
  } catch (error) {
    console.error('❌ Ошибка отзыва приглашения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== СОГЛАСИЯ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ ==========
// ============================================================
// Ключевое правило: за несовершеннолетнего согласие даёт только законный
// представитель. Сам ребёнок подтвердить его не может — такое согласие
// юридически ничтожно, и Роскомнадзор признаёт это нарушением.
//
// Каждое согласие — отдельный документ под свою цель. С 01.09.2025
// объединять разные цели в одном согласии нельзя.
//
// Вместе с согласием сохраняется редакция текста, которую человек видел,
// его адрес и браузер: при проверке предъявлять надо именно это.

const CONSENT_CODES = ['personal_data', 'data_distribution', 'event_participation'];

// Возраст на сегодня по дате рождения
function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function clientIp(req) {
  return (req.ip || req.connection?.remoteAddress || '').slice(0, 64);
}

// ============================================================
// ТЕКСТЫ СОГЛАСИЙ
// ============================================================

// Действующие редакции — их видит родитель перед подтверждением
app.get('/api/consent-documents', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, version, title, body, purpose, data_categories, retention,
              is_required, operator_name, operator_address, operator_inn, published_at
       FROM consent_documents
       WHERE is_current = true
       ORDER BY is_required DESC, code`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения текстов согласий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Все редакции, включая прошлые — для администратора и для проверок
app.get('/api/consent-documents/all', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.code, d.version, d.title, d.is_required, d.is_current,
              d.published_at, u.full_name AS created_by_name,
              (SELECT COUNT(*)::int FROM user_consents uc WHERE uc.document_id = d.id) AS used_count
       FROM consent_documents d
       LEFT JOIN users u ON d.created_by = u.id
       ORDER BY d.code, d.published_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения редакций согласий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Публикация новой редакции. Старая остаётся в базе навсегда: на неё
// ссылаются уже данные согласия.
app.post('/api/consent-documents', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      code, version, title, body, purpose, data_categories, retention,
      is_required = true, operator_name, operator_address, operator_inn
    } = req.body;

    if (!CONSENT_CODES.includes(code)) {
      return res.status(400).json({ error: `code должен быть одним из: ${CONSENT_CODES.join(', ')}` });
    }
    if (!version || !title || !body) {
      return res.status(400).json({ error: 'version, title и body обязательны' });
    }

    await client.query('BEGIN');

    // Снимаем признак «действующая» со старой редакции этого вида
    await client.query('UPDATE consent_documents SET is_current = false WHERE code = $1 AND is_current = true', [code]);

    const result = await client.query(
      `INSERT INTO consent_documents (code, version, title, body, purpose, data_categories,
                                      retention, is_required, operator_name, operator_address,
                                      operator_inn, is_current, published_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), $12)
       RETURNING *`,
      [code, version.trim(), title.trim(), body, purpose || null, data_categories || null,
       retention || null, is_required !== false, operator_name || null, operator_address || null,
       operator_inn || null, req.user.userId]
    );

    await client.query('COMMIT');

    await logActivity(req.user.userId, 'CONSENT_DOCUMENT_PUBLISHED', 'consent_document', result.rows[0].id, {
      code, version
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Такая версия этого согласия уже опубликована', code: 'DUPLICATE_VERSION' });
    }
    console.error('❌ Ошибка публикации редакции согласия:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ============================================================
// СОСТОЯНИЕ СОГЛАСИЙ КОНКРЕТНОГО ЧЕЛОВЕКА
// ============================================================
app.get('/api/consents/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!(await canViewParticipant(req.user, userId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этого участника' });
    }

    const current = await pool.query(
      `SELECT uc.consent_type, uc.given_at, uc.revoked_at, uc.version,
              uc.given_by, uc.given_by_relation, uc.given_by_full_name,
              d.title, d.version AS document_version, d.is_required
       FROM user_consents uc
       LEFT JOIN consent_documents d ON uc.document_id = d.id
       WHERE uc.user_id = $1`,
      [userId]
    );

    const history = await pool.query(
      `SELECT cl.consent_type, cl.status, cl.changed_at, cl.document_version,
              cl.given_by_relation, cl.ip_address, u.full_name AS changed_by_name
       FROM consent_logs cl
       LEFT JOIN users u ON cl.changed_by = u.id
       WHERE cl.user_id = $1
       ORDER BY cl.changed_at DESC`,
      [userId]
    );

    res.json({ current: current.rows, history: history.rows });
  } catch (error) {
    console.error('❌ Ошибка получения согласий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ПОДТВЕРЖДЕНИЕ СОГЛАСИЯ
// ============================================================
app.post('/api/consents', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { subject_id, code } = req.body;
    const actorId = req.user.userId;

    if (!subject_id || !code) {
      return res.status(400).json({ error: 'subject_id и code обязательны' });
    }
    if (!CONSENT_CODES.includes(code)) {
      return res.status(400).json({ error: 'Неизвестный вид согласия' });
    }

    const subject = await pool.query('SELECT id, full_name, birth_date FROM users WHERE id = $1', [subject_id]);
    if (subject.rows.length === 0) {
      return res.status(404).json({ error: 'Участник не найден' });
    }

    const age = ageFromBirthDate(subject.rows[0].birth_date);
    const isSelf = subject_id === actorId;

    // ⚠️ Главное правило: за несовершеннолетнего согласие даёт только
    // законный представитель. Проверяем это на сервере, а не в интерфейсе.
    let relation;
    if (isSelf) {
      if (age === null) {
        return res.status(400).json({
          error: 'Не указана дата рождения — невозможно определить, кто вправе дать согласие',
          code: 'BIRTH_DATE_REQUIRED'
        });
      }
      if (age < 18) {
        return res.status(403).json({
          error: 'Согласие за несовершеннолетнего может дать только родитель или опекун',
          code: 'MINOR_CANNOT_CONSENT'
        });
      }
      relation = 'self';
    } else {
      const link = await pool.query(
        `SELECT 1 FROM child_parent WHERE parent_id = $1 AND child_id = $2 AND status = 'active'`,
        [actorId, subject_id]
      );
      if (link.rows.length === 0) {
        return res.status(403).json({
          error: 'Давать согласие за участника может только привязанный к нему законный представитель',
          code: 'NOT_LEGAL_REPRESENTATIVE'
        });
      }
      relation = 'parent';
    }

    const doc = await pool.query(
      'SELECT id, code, version, title FROM consent_documents WHERE code = $1 AND is_current = true',
      [code]
    );
    if (doc.rows.length === 0) {
      return res.status(400).json({
        error: 'Текст этого согласия ещё не опубликован — обратитесь к администратору',
        code: 'NO_CURRENT_DOCUMENT'
      });
    }
    const document = doc.rows[0];

    const actor = await pool.query('SELECT full_name FROM users WHERE id = $1', [actorId]);

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO user_consents (user_id, consent_type, given_at, revoked_at, version,
                                  document_id, given_by, given_by_relation, given_by_full_name, updated_at)
       VALUES ($1, $2, NOW(), NULL, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, consent_type) DO UPDATE
       SET given_at = NOW(), revoked_at = NULL, version = EXCLUDED.version,
           document_id = EXCLUDED.document_id, given_by = EXCLUDED.given_by,
           given_by_relation = EXCLUDED.given_by_relation,
           given_by_full_name = EXCLUDED.given_by_full_name, updated_at = NOW()`,
      [subject_id, code, document.version, document.id, actorId, relation, actor.rows[0]?.full_name || null]
    );

    // Журнал только пополняется — историю не переписываем
    await client.query(
      `INSERT INTO consent_logs (user_id, consent_type, status, changed_by, changed_at,
                                 document_id, document_version, given_by_relation, ip_address, user_agent)
       VALUES ($1, $2, true, $3, NOW(), $4, $5, $6, $7, $8)`,
      [subject_id, code, actorId, document.id, document.version, relation,
       clientIp(req), (req.headers['user-agent'] || '').slice(0, 500)]
    );

    await client.query('COMMIT');

    await logActivity(actorId, 'CONSENT_GIVEN', 'user', subject_id, {
      consent_type: code,
      document_version: document.version,
      relation
    });

    res.status(201).json({
      message: 'Согласие зафиксировано',
      consent_type: code,
      document_version: document.version,
      subject: subject.rows[0].full_name
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка фиксации согласия:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ============================================================
// ОТЗЫВ СОГЛАСИЯ
// ============================================================
// Отзыв — право субъекта по закону, отказать в нём нельзя. Запись не
// удаляется: в журнале остаётся и выдача, и отзыв.
app.post('/api/consents/revoke', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { subject_id, code, reason } = req.body;
    const actorId = req.user.userId;

    if (!subject_id || !code) {
      return res.status(400).json({ error: 'subject_id и code обязательны' });
    }

    const isSelf = subject_id === actorId;
    let allowed = isSelf || MOVEMENT_ROLES.includes(req.user.role);

    if (!allowed) {
      const link = await pool.query(
        `SELECT 1 FROM child_parent WHERE parent_id = $1 AND child_id = $2 AND status = 'active'`,
        [actorId, subject_id]
      );
      allowed = link.rows.length > 0;
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Отозвать согласие может субъект, его законный представитель или администрация' });
    }

    const existing = await pool.query(
      'SELECT document_id, version FROM user_consents WHERE user_id = $1 AND consent_type = $2 AND revoked_at IS NULL',
      [subject_id, code]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Действующего согласия такого вида нет' });
    }

    await client.query('BEGIN');

    await client.query(
      'UPDATE user_consents SET revoked_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND consent_type = $2',
      [subject_id, code]
    );

    await client.query(
      `INSERT INTO consent_logs (user_id, consent_type, status, changed_by, changed_at,
                                 document_id, document_version, ip_address, user_agent)
       VALUES ($1, $2, false, $3, NOW(), $4, $5, $6, $7)`,
      [subject_id, code, actorId, existing.rows[0].document_id, existing.rows[0].version,
       clientIp(req), (req.headers['user-agent'] || '').slice(0, 500)]
    );

    await client.query('COMMIT');

    await logActivity(actorId, 'CONSENT_REVOKED', 'user', subject_id, { consent_type: code, reason: reason || null });

    // Администрации нужно узнать об отзыве: дальнейшая обработка данных
    // после отзыва — это уже нарушение
    const admins = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'movement_coordinator') AND status <> 'inactive'"
    );
    for (const a of admins.rows) {
      await createNotification(
        a.id,
        'consent',
        '⚠️ Отозвано согласие',
        `Отозвано согласие «${code}». Проверьте, что обработка данных прекращена.`,
        '/consents-management',
        'high'
      );
    }

    res.json({ message: 'Согласие отозвано' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка отзыва согласия:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ============================================================
// СВОДКА ПО СОГЛАСИЯМ (для координаторов)
// ============================================================
app.get('/api/consents-stats', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;
    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    let clubFilter = '';
    const params = [];

    if (req.query.club_id) {
      clubFilter = ' AND u.club_id = $1';
      params.push(req.query.club_id);
    } else if (role === 'club_coordinator') {
      const clubIds = await getCoordinatorClubIds(userId);
      if (clubIds.length === 0) {
        return res.json({ total: 0, complete: 0, incomplete: 0, by_type: [] });
      }
      clubFilter = ' AND u.club_id = ANY($1)';
      params.push(clubIds);
    }

    const required = await pool.query(
      "SELECT code FROM consent_documents WHERE is_current = true AND is_required = true"
    );
    const requiredCodes = required.rows.map((r) => r.code);

    const totals = await pool.query(
      `SELECT COUNT(*)::int AS total FROM users u WHERE u.role = 'participant'${clubFilter}`,
      params
    );

    const complete = requiredCodes.length === 0
      ? { rows: [{ n: 0 }] }
      : await pool.query(
          `SELECT COUNT(*)::int AS n FROM users u
           WHERE u.role = 'participant'${clubFilter}
             AND (
               SELECT COUNT(DISTINCT uc.consent_type) FROM user_consents uc
               WHERE uc.user_id = u.id AND uc.revoked_at IS NULL
                 AND uc.consent_type = ANY($${params.length + 1})
             ) = $${params.length + 2}`,
          [...params, requiredCodes, requiredCodes.length]
        );

    const byType = await pool.query(
      `SELECT d.code, d.title, d.is_required,
              (SELECT COUNT(*)::int FROM user_consents uc
               JOIN users u ON u.id = uc.user_id
               WHERE uc.consent_type = d.code AND uc.revoked_at IS NULL
                 AND u.role = 'participant'${clubFilter.replace(/\$(\d+)/g, (m, n) => '$' + n)}) AS given
       FROM consent_documents d WHERE d.is_current = true ORDER BY d.is_required DESC, d.code`,
      params
    );

    res.json({
      total: totals.rows[0].total,
      complete: complete.rows[0].n,
      incomplete: totals.rows[0].total - complete.rows[0].n,
      required_codes: requiredCodes,
      by_type: byType.rows
    });
  } catch (error) {
    console.error('❌ Ошибка сводки по согласиям:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// У КОГО НЕТ СОГЛАСИЙ
// ============================================================
app.get('/api/consents-missing', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;
    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    let clubFilter = '';
    const params = [];

    if (req.query.club_id) {
      clubFilter = ' AND u.club_id = $1';
      params.push(req.query.club_id);
    } else if (role === 'club_coordinator') {
      const clubIds = await getCoordinatorClubIds(userId);
      if (clubIds.length === 0) return res.json([]);
      clubFilter = ' AND u.club_id = ANY($1)';
      params.push(clubIds);
    }

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.birth_date, u.club_id, c.name AS club_name,
              EXISTS (SELECT 1 FROM child_parent cp WHERE cp.child_id = u.id AND cp.status = 'active') AS has_parent,
              ARRAY(
                SELECT d.code FROM consent_documents d
                WHERE d.is_current = true AND d.is_required = true
                  AND NOT EXISTS (
                    SELECT 1 FROM user_consents uc
                    WHERE uc.user_id = u.id AND uc.consent_type = d.code AND uc.revoked_at IS NULL
                  )
              ) AS missing
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.role = 'participant'${clubFilter}
       ORDER BY u.full_name`,
      params
    );

    // Отдаём только тех, у кого действительно чего-то не хватает
    res.json(result.rows.filter((r) => Array.isArray(r.missing) && r.missing.length > 0));
  } catch (error) {
    console.error('❌ Ошибка получения списка без согласий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== СОТРУДНИКИ КЮДА ==========
// ============================================================

// Список сотрудников клуба
app.get('/api/clubs/:clubId/staff', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;

    // Видеть состав может любой сотрудник этого клуба и движение
    if (!(await canInClub(req.user, clubId, 'view_participants'))) {
      return res.status(403).json({ error: 'Нет доступа к этому КЮДу' });
    }

    const result = await pool.query(
      `SELECT cs.id, cs.user_id, cs.position, cs.appointed_at, cs.comment,
              u.full_name, u.email, u.phone, u.avatar_url,
              a.full_name AS appointed_by_name
       FROM club_staff cs
       JOIN users u ON u.id = cs.user_id
       LEFT JOIN users a ON a.id = cs.appointed_by
       WHERE cs.club_id = $1 AND cs.removed_at IS NULL
       ORDER BY CASE cs.position
                  WHEN 'head' THEN 0 WHEN 'deputy' THEN 1
                  WHEN 'methodist' THEN 2 WHEN 'curator' THEN 3 ELSE 4 END,
                u.full_name`,
      [clubId]
    );

    res.json(result.rows.map((r) => ({ ...r, position_label: CLUB_POSITION_LABELS[r.position] })));
  } catch (error) {
    console.error('❌ Ошибка получения сотрудников клуба:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Назначить сотрудника
app.post('/api/clubs/:clubId/staff', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { user_id, position, comment } = req.body;

    if (!(await canInClub(req.user, clubId, 'manage_staff'))) {
      return res.status(403).json({ error: 'Управлять сотрудниками может руководитель КЮДа' });
    }

    if (!user_id || !CLUB_POSITIONS.includes(position)) {
      return res.status(400).json({
        error: `user_id обязателен, position — одно из: ${CLUB_POSITIONS.join(', ')}`
      });
    }

    // Руководителя назначаем только через передачу руководства: иначе
    // частичный уникальный индекс вернёт невнятную ошибку базы
    if (position === 'head') {
      return res.status(400).json({
        error: 'Руководитель назначается через передачу руководства',
        code: 'USE_TRANSFER_HEAD'
      });
    }

    const user = await pool.query('SELECT id, full_name, role FROM users WHERE id = $1', [user_id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (user.rows[0].role === 'participant' || user.rows[0].role === 'parent') {
      return res.status(400).json({
        error: 'Сотрудником клуба не может быть участник или родитель',
        code: 'WRONG_GLOBAL_ROLE'
      });
    }

    let result;
    try {
      result = await pool.query(
        `INSERT INTO club_staff (club_id, user_id, position, appointed_by, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, position, appointed_at`,
        [clubId, user_id, position, req.user.userId, comment || null]
      );
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Этот человек уже работает в клубе — смените ему должность',
          code: 'ALREADY_STAFF'
        });
      }
      throw error;
    }

    invalidateUserCache(user_id);
    await logActivity(req.user.userId, 'CLUB_STAFF_APPOINTED', 'club', clubId, {
      user: user.rows[0].full_name,
      position
    });
    await createNotification(
      user_id,
      'club_staff',
      '🏫 Назначение в КЮД',
      `Вы назначены: ${CLUB_POSITION_LABELS[position]}`,
      '/clubs'
    );

    res.status(201).json({ ...result.rows[0], position_label: CLUB_POSITION_LABELS[position] });
  } catch (error) {
    console.error('❌ Ошибка назначения сотрудника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Сменить должность
app.patch('/api/clubs/:clubId/staff/:userId', authenticate, async (req, res) => {
  try {
    const { clubId, userId } = req.params;
    const { position } = req.body;

    if (!(await canInClub(req.user, clubId, 'manage_staff'))) {
      return res.status(403).json({ error: 'Управлять сотрудниками может руководитель КЮДа' });
    }

    if (!CLUB_POSITIONS.includes(position)) {
      return res.status(400).json({ error: `position — одно из: ${CLUB_POSITIONS.join(', ')}` });
    }
    if (position === 'head') {
      return res.status(400).json({
        error: 'Руководитель назначается через передачу руководства',
        code: 'USE_TRANSFER_HEAD'
      });
    }

    const current = await pool.query(
      'SELECT position FROM club_staff WHERE club_id = $1 AND user_id = $2 AND removed_at IS NULL',
      [clubId, userId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Этот человек не работает в клубе' });
    }
    // Руководитель не может разжаловать сам себя — клуб останется без головы
    if (current.rows[0].position === 'head') {
      return res.status(400).json({
        error: 'Сначала передайте руководство другому сотруднику',
        code: 'USE_TRANSFER_HEAD'
      });
    }

    const result = await pool.query(
      `UPDATE club_staff SET position = $1
       WHERE club_id = $2 AND user_id = $3 AND removed_at IS NULL
       RETURNING id, user_id, position, appointed_at`,
      [position, clubId, userId]
    );

    invalidateUserCache(userId);
    await logActivity(req.user.userId, 'CLUB_STAFF_POSITION_CHANGED', 'club', clubId, {
      user_id: userId, from: current.rows[0].position, to: position
    });

    res.json({ ...result.rows[0], position_label: CLUB_POSITION_LABELS[position] });
  } catch (error) {
    console.error('❌ Ошибка смены должности:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Снять с должности. Мягко: строка остаётся для истории.
app.delete('/api/clubs/:clubId/staff/:userId', authenticate, async (req, res) => {
  try {
    const { clubId, userId } = req.params;

    if (!(await canInClub(req.user, clubId, 'manage_staff'))) {
      return res.status(403).json({ error: 'Управлять сотрудниками может руководитель КЮДа' });
    }

    const current = await pool.query(
      'SELECT position FROM club_staff WHERE club_id = $1 AND user_id = $2 AND removed_at IS NULL',
      [clubId, userId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Этот человек не работает в клубе' });
    }
    if (current.rows[0].position === 'head') {
      return res.status(400).json({
        error: 'Нельзя снять руководителя — сначала передайте руководство',
        code: 'USE_TRANSFER_HEAD'
      });
    }

    await pool.query(
      `UPDATE club_staff SET removed_at = NOW(), removed_by = $1
       WHERE club_id = $2 AND user_id = $3 AND removed_at IS NULL`,
      [req.user.userId, clubId, userId]
    );

    invalidateUserCache(userId);
    await logActivity(req.user.userId, 'CLUB_STAFF_REMOVED', 'club', clubId, {
      user_id: userId, position: current.rows[0].position
    });

    res.json({ message: 'Сотрудник снят с должности' });
  } catch (error) {
    console.error('❌ Ошибка снятия сотрудника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Передача руководства. Одной операцией, чтобы клуб не остался без головы.
app.post('/api/clubs/:clubId/transfer-head', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { clubId } = req.params;
    const { new_head_id, keep_as } = req.body;

    if (!(await canInClub(req.user, clubId, 'manage_staff'))) {
      return res.status(403).json({ error: 'Передать руководство может руководитель КЮДа или координатор движения' });
    }
    if (!new_head_id) {
      return res.status(400).json({ error: 'new_head_id обязателен' });
    }

    const keepPosition = keep_as && CLUB_POSITIONS.includes(keep_as) && keep_as !== 'head' ? keep_as : null;

    const candidate = await pool.query('SELECT id, full_name, role FROM users WHERE id = $1', [new_head_id]);
    if (candidate.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (['participant', 'parent'].includes(candidate.rows[0].role)) {
      return res.status(400).json({ error: 'Руководителем клуба не может быть участник или родитель' });
    }

    await client.query('BEGIN');

    const oldHead = await client.query(
      `SELECT user_id FROM club_staff
       WHERE club_id = $1 AND position = 'head' AND removed_at IS NULL`,
      [clubId]
    );

    // Старого руководителя либо оставляем в клубе на другой должности,
    // либо снимаем совсем
    if (oldHead.rows.length > 0) {
      if (keepPosition) {
        await client.query(
          `UPDATE club_staff SET position = $1
           WHERE club_id = $2 AND user_id = $3 AND removed_at IS NULL`,
          [keepPosition, clubId, oldHead.rows[0].user_id]
        );
      } else {
        await client.query(
          `UPDATE club_staff SET removed_at = NOW(), removed_by = $1
           WHERE club_id = $2 AND user_id = $3 AND removed_at IS NULL`,
          [req.user.userId, clubId, oldHead.rows[0].user_id]
        );
      }
    }

    // Новый руководитель мог уже работать в клубе на другой должности
    const existing = await client.query(
      'SELECT id FROM club_staff WHERE club_id = $1 AND user_id = $2 AND removed_at IS NULL',
      [clubId, new_head_id]
    );

    if (existing.rows.length > 0) {
      await client.query(`UPDATE club_staff SET position = 'head' WHERE id = $1`, [existing.rows[0].id]);
    } else {
      await client.query(
        `INSERT INTO club_staff (club_id, user_id, position, appointed_by)
         VALUES ($1, $2, 'head', $3)`,
        [clubId, new_head_id, req.user.userId]
      );
    }

    await client.query('COMMIT');

    invalidateUserCache();
    await logActivity(req.user.userId, 'CLUB_HEAD_TRANSFERRED', 'club', clubId, {
      from: oldHead.rows[0]?.user_id || null,
      to: new_head_id,
      old_head_kept_as: keepPosition
    });
    await createNotification(
      new_head_id,
      'club_staff',
      '🏫 Вы назначены руководителем КЮДа',
      'Вам передано руководство клубом',
      '/clubs',
      'high'
    );

    res.json({ message: 'Руководство передано', new_head: candidate.rows[0].full_name });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка передачи руководства:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// В каких клубах я работаю и кем
app.get('/api/my-clubs', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (MOVEMENT_ROLES.includes(role)) {
      const all = await pool.query(
        `SELECT c.id AS club_id, c.name AS club_name, NULL::varchar AS position,
                'Координатор движения'::varchar AS position_label
         FROM clubs c ORDER BY c.name`
      );
      return res.json({ movement_wide: true, clubs: all.rows, permissions: ALL_CLUB_PERMISSIONS });
    }

    const result = await pool.query(
      `SELECT cs.club_id, c.name AS club_name, cs.position, cs.appointed_at
       FROM club_staff cs
       JOIN clubs c ON c.id = cs.club_id
       WHERE cs.user_id = $1 AND cs.removed_at IS NULL
       ORDER BY c.name`,
      [userId]
    );

    res.json({
      movement_wide: false,
      clubs: result.rows.map((r) => ({
        ...r,
        position_label: CLUB_POSITION_LABELS[r.position],
        permissions: permissionsForPosition(r.position)
      }))
    });
  } catch (error) {
    console.error('❌ Ошибка получения моих клубов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ========== КОМАНДЫ КЛУБОВ НА ФОРУМЫ И ВЫЕЗДЫ ==========
// ============================================================

// Каких обязательных согласий не хватает участнику.
// Пустой массив — можно везти.
async function missingConsentsFor(participantId) {
  const r = await pool.query(
    `SELECT d.code, d.title
     FROM consent_documents d
     WHERE d.is_current = true AND d.is_required = true
       AND NOT EXISTS (
         SELECT 1 FROM user_consents uc
         WHERE uc.user_id = $1 AND uc.consent_type = d.code AND uc.revoked_at IS NULL
       )`,
    [participantId]
  );
  return r.rows;
}

// Заявку правит только клуб-автор и только пока она в работе
function submissionIsEditable(status) {
  return status === 'draft' || status === 'revision_requested';
}

// ============================================================
// ПРИГЛАШЕНИЕ КЛУБОВ НА МЕРОПРИЯТИЕ
// ============================================================
app.post('/api/events/:eventId/invite-clubs', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const { club_ids, deadline, quota, allow_escorts = false, message } = req.body;

    // Приглашать клубы и назначать квоту может координатор движения либо
    // тьютор, назначенный ответственным именно на это мероприятие
    let allowed = MOVEMENT_ROLES.includes(req.user.role);
    if (!allowed && req.user.role === 'tutor') {
      const assigned = await pool.query(
        `SELECT 1 FROM event_tutor_assignments
         WHERE event_id = $1 AND tutor_id = $2 AND status = 'accepted'`,
        [eventId, req.user.userId]
      );
      allowed = assigned.rows.length > 0;
    }
    if (!allowed) {
      return res.status(403).json({
        error: 'Приглашать клубы может координатор движения или тьютор, ответственный за это мероприятие'
      });
    }

    if (!Array.isArray(club_ids) || club_ids.length === 0) {
      return res.status(400).json({ error: 'club_ids обязателен и не может быть пустым' });
    }
    if (quota !== undefined && quota !== null && (!Number.isInteger(quota) || quota < 1)) {
      return res.status(400).json({ error: 'quota должна быть целым числом больше нуля либо не указана' });
    }

    const event = await pool.query('SELECT id, title, event_date FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    await client.query('BEGIN');

    for (const clubId of club_ids) {
      await client.query(
        `INSERT INTO event_club_targets (event_id, club_id, invited_by, invited_at, deadline, quota, allow_escorts, message)
         VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)
         ON CONFLICT (event_id, club_id) DO UPDATE
         SET deadline = EXCLUDED.deadline, quota = EXCLUDED.quota,
             allow_escorts = EXCLUDED.allow_escorts, message = EXCLUDED.message`,
        [eventId, clubId, req.user.userId, nullableDate(deadline), quota ?? null, allow_escorts === true, message || null]
      );
    }

    await client.query('COMMIT');

    // Уведомляем руководителей и заместителей приглашённых клубов
    const staff = await pool.query(
      `SELECT DISTINCT cs.user_id FROM club_staff cs
       WHERE cs.club_id = ANY($1) AND cs.removed_at IS NULL
         AND cs.position IN ('head', 'deputy')`,
      [club_ids]
    );
    for (const s of staff.rows) {
      await createNotification(
        s.user_id,
        'team_invitation',
        '📣 Приглашение на мероприятие',
        `Ваш КЮД приглашён на «${event.rows[0].title}». Сформируйте команду${deadline ? ` до ${new Date(deadline).toLocaleDateString('ru-RU')}` : ''}.`,
        '/my-invitations',
        'high'
      );
    }

    await logActivity(req.user.userId, 'EVENT_CLUBS_INVITED', 'event', eventId, {
      clubs: club_ids.length, quota: quota ?? null, deadline: deadline || null
    });

    res.json({ message: `Приглашено клубов: ${club_ids.length}`, event: event.rows[0].title });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка приглашения клубов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ============================================================
// МОИ ПРИГЛАШЕНИЯ
// ============================================================
app.get('/api/my-club-invitations', authenticate, async (req, res) => {
  try {
    const clubIds = MOVEMENT_ROLES.includes(req.user.role)
      ? null
      : await getCoordinatorClubIds(req.user.userId);

    if (clubIds && clubIds.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT ect.event_id, ect.club_id, ect.deadline, ect.quota, ect.allow_escorts, ect.message,
              ect.invited_at,
              e.title AS event_title, e.event_date, e.location, e.description,
              c.name AS club_name,
              ts.id AS submission_id, ts.status, ts.submitted_at, ts.review_comment,
              COALESCE((SELECT COUNT(*)::int FROM team_members tm WHERE tm.submission_id = ts.id), 0) AS members_count
       FROM event_club_targets ect
       JOIN events e ON e.id = ect.event_id
       JOIN clubs c ON c.id = ect.club_id
       LEFT JOIN team_submissions ts ON ts.event_id = ect.event_id AND ts.club_id = ect.club_id
       ${clubIds ? 'WHERE ect.club_id = ANY($1)' : ''}
       ORDER BY COALESCE(ect.deadline, e.event_date) NULLS LAST, e.event_date`,
      clubIds ? [clubIds] : []
    );

    res.json(result.rows.map((r) => ({
      ...r,
      status: r.status || 'not_started',
      is_overdue: r.deadline ? new Date(r.deadline) < new Date() && !r.submitted_at : false
    })));
  } catch (error) {
    console.error('❌ Ошибка получения приглашений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// СОЗДАНИЕ ЧЕРНОВИКА КОМАНДЫ
// ============================================================
app.post('/api/team-submissions', authenticate, async (req, res) => {
  try {
    const { event_id, club_id } = req.body;

    if (!event_id || !club_id) {
      return res.status(400).json({ error: 'event_id и club_id обязательны' });
    }
    if (!(await canInClub(req.user, club_id, 'form_team'))) {
      return res.status(403).json({ error: 'Формировать команду может руководитель КЮДа или его заместитель' });
    }

    const invited = await pool.query(
      'SELECT 1 FROM event_club_targets WHERE event_id = $1 AND club_id = $2',
      [event_id, club_id]
    );
    if (invited.rows.length === 0) {
      return res.status(403).json({ error: 'Ваш КЮД не приглашён на это мероприятие', code: 'NOT_INVITED' });
    }

    const result = await pool.query(
      `INSERT INTO team_submissions (event_id, club_id, status, created_by)
       VALUES ($1, $2, 'draft', $3)
       ON CONFLICT (event_id, club_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [event_id, club_id, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания команды:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// КОМАНДА С СОСТАВОМ
// ============================================================
app.get('/api/team-submissions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const sub = await pool.query(
      `SELECT ts.*, e.title AS event_title, e.event_date, c.name AS club_name,
              ect.quota, ect.deadline, ect.allow_escorts, ect.message AS invitation_message,
              cb.full_name AS created_by_name, sb.full_name AS submitted_by_name,
              rb.full_name AS reviewed_by_name
       FROM team_submissions ts
       JOIN events e ON e.id = ts.event_id
       JOIN clubs c ON c.id = ts.club_id
       LEFT JOIN event_club_targets ect ON ect.event_id = ts.event_id AND ect.club_id = ts.club_id
       LEFT JOIN users cb ON cb.id = ts.created_by
       LEFT JOIN users sb ON sb.id = ts.submitted_by
       LEFT JOIN users rb ON rb.id = ts.reviewed_by
       WHERE ts.id = $1`,
      [id]
    );
    if (sub.rows.length === 0) {
      return res.status(404).json({ error: 'Команда не найдена' });
    }

    const submission = sub.rows[0];

    if (!(await canInClub(req.user, submission.club_id, 'view_participants'))) {
      return res.status(403).json({ error: 'Нет доступа к этой команде' });
    }

    // Документы в состав НЕ подтягиваем: только признак, заполнен ли он
    const members = await pool.query(
      `SELECT tm.id, tm.participant_id, tm.role_in_team, tm.full_name, tm.birth_date,
              tm.city, tm.school_full_name, tm.class_name, tm.parent_full_name,
              tm.parent_phone, tm.participant_phone, tm.extra_program,
              tm.extra_program_ack, tm.comment, tm.created_at,
              (d.id IS NOT NULL AND d.purged_at IS NULL) AS has_document,
              d.document_type
       FROM team_members tm
       LEFT JOIN team_member_documents d ON d.member_id = tm.id
       WHERE tm.submission_id = $1
       ORDER BY CASE tm.role_in_team WHEN 'escort' THEN 1 ELSE 0 END, tm.full_name`,
      [id]
    );

    res.json({
      ...submission,
      editable: submissionIsEditable(submission.status),
      members: members.rows,
      members_count: members.rows.length
    });
  } catch (error) {
    console.error('❌ Ошибка получения команды:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ДОБАВЛЕНИЕ УЧАСТНИКА В КОМАНДУ
// ============================================================
app.post('/api/team-submissions/:id/members', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      participant_id, role_in_team = 'student',
      full_name, birth_date, city, school_full_name, class_name,
      parent_full_name, parent_phone, participant_phone,
      extra_program = false, extra_program_ack = false, comment,
      document
    } = req.body;

    const sub = await pool.query(
      `SELECT ts.*, ect.quota, ect.allow_escorts
       FROM team_submissions ts
       LEFT JOIN event_club_targets ect ON ect.event_id = ts.event_id AND ect.club_id = ts.club_id
       WHERE ts.id = $1`,
      [id]
    );
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });
    const submission = sub.rows[0];

    if (!(await canInClub(req.user, submission.club_id, 'form_team'))) {
      return res.status(403).json({ error: 'Формировать команду может руководитель КЮДа или его заместитель' });
    }
    if (!submissionIsEditable(submission.status)) {
      return res.status(400).json({
        error: 'Команда уже отправлена — чтобы изменить состав, попросите координатора вернуть её на доработку',
        code: 'NOT_EDITABLE'
      });
    }
    if (!['student', 'captain', 'escort'].includes(role_in_team)) {
      return res.status(400).json({ error: 'role_in_team: student, captain или escort' });
    }
    if (role_in_team === 'escort' && submission.allow_escorts !== true) {
      return res.status(400).json({
        error: 'На этом мероприятии сопровождающие не предусмотрены',
        code: 'ESCORTS_NOT_ALLOWED'
      });
    }

    // Квота считается только по детям: сопровождающие в неё не входят
    if (submission.quota && role_in_team !== 'escort') {
      const count = await pool.query(
        `SELECT COUNT(*)::int AS n FROM team_members
         WHERE submission_id = $1 AND role_in_team <> 'escort'`,
        [id]
      );
      if (count.rows[0].n >= submission.quota) {
        return res.status(400).json({
          error: `Квота исчерпана: от клуба можно заявить ${submission.quota} чел.`,
          code: 'QUOTA_EXCEEDED'
        });
      }
    }

    let snapshot = {
      full_name, birth_date, city, school_full_name, class_name,
      parent_full_name, parent_phone, participant_phone
    };

    // Участника выбирают из клуба — данные подтягиваем из карточки,
    // вручную вводят только сопровождающих
    if (participant_id) {
      const p = await pool.query(
        `SELECT u.id, u.full_name, u.birth_date, u.city, u.school, u.class_name,
                u.phone, u.parent_full_name, u.parent_phone, u.club_id
         FROM users u WHERE u.id = $1`,
        [participant_id]
      );
      if (p.rows.length === 0) return res.status(404).json({ error: 'Участник не найден' });

      const participant = p.rows[0];
      if (participant.club_id !== submission.club_id) {
        return res.status(400).json({ error: 'Этот участник не состоит в вашем КЮДе', code: 'WRONG_CLUB' });
      }

      // ⚠️ Главная проверка. Без согласий родителей ребёнка нельзя везти
      // на мероприятие, и ловить это надо здесь, а не когда автобус заказан.
      const missing = await missingConsentsFor(participant_id);
      if (missing.length > 0) {
        return res.status(400).json({
          error: 'У участника не оформлены согласия родителей',
          code: 'CONSENTS_MISSING',
          missing: missing.map((m) => m.title)
        });
      }

      snapshot = {
        full_name: full_name || participant.full_name,
        birth_date: birth_date || participant.birth_date,
        city: city || participant.city,
        school_full_name: school_full_name || participant.school,
        class_name: class_name || participant.class_name,
        parent_full_name: parent_full_name || participant.parent_full_name,
        parent_phone: parent_phone || participant.parent_phone,
        participant_phone: participant_phone || participant.phone
      };
    } else if (role_in_team !== 'escort') {
      return res.status(400).json({
        error: 'Участника нужно выбрать из списка клуба. Вручную вводятся только сопровождающие.',
        code: 'PARTICIPANT_REQUIRED'
      });
    }

    if (!snapshot.full_name) {
      return res.status(400).json({ error: 'ФИО обязательно' });
    }

    await client.query('BEGIN');

    let member;
    try {
      member = await client.query(
        `INSERT INTO team_members (submission_id, participant_id, role_in_team, full_name,
                                   birth_date, city, school_full_name, class_name,
                                   parent_full_name, parent_phone, participant_phone,
                                   extra_program, extra_program_ack, comment, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [id, participant_id || null, role_in_team, snapshot.full_name,
         nullableDate(snapshot.birth_date), snapshot.city || null, snapshot.school_full_name || null,
         snapshot.class_name || null, snapshot.parent_full_name || null, snapshot.parent_phone || null,
         snapshot.participant_phone || null, extra_program === true, extra_program_ack === true,
         comment || null, req.user.userId]
      );
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Этот участник уже в команде', code: 'ALREADY_IN_TEAM' });
      }
      throw error;
    }

    // Документ, удостоверяющий личность — в отдельную таблицу
    if (document && document.document_type) {
      if (!['passport', 'birth_certificate'].includes(document.document_type)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'document_type: passport или birth_certificate' });
      }
      await client.query(
        `INSERT INTO team_member_documents (member_id, document_type, series_number, issued_by, issued_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [member.rows[0].id, document.document_type, document.series_number || null,
         document.issued_by || null, nullableDate(document.issued_at), req.user.userId]
      );
    }

    await client.query('UPDATE team_submissions SET updated_at = NOW() WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.status(201).json(member.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка добавления в команду:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ============================================================
// ПРАВКА И УДАЛЕНИЕ УЧАСТНИКА КОМАНДЫ
// ============================================================
app.patch('/api/team-submissions/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const sub = await pool.query('SELECT club_id, status FROM team_submissions WHERE id = $1', [id]);
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });

    if (!(await canInClub(req.user, sub.rows[0].club_id, 'form_team'))) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    if (!submissionIsEditable(sub.rows[0].status)) {
      return res.status(400).json({ error: 'Команда уже отправлена', code: 'NOT_EDITABLE' });
    }

    const allowed = ['full_name', 'birth_date', 'city', 'school_full_name', 'class_name',
                     'parent_full_name', 'parent_phone', 'participant_phone',
                     'extra_program', 'extra_program_ack', 'comment', 'role_in_team'];
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(key === 'birth_date' ? nullableDate(req.body[key]) : req.body[key]);
        i++;
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });

    values.push(memberId, id);
    const result = await pool.query(
      `UPDATE team_members SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i} AND submission_id = $${i + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Участник команды не найден' });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка правки участника команды:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/team-submissions/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const sub = await pool.query('SELECT club_id, status FROM team_submissions WHERE id = $1', [id]);
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });

    if (!(await canInClub(req.user, sub.rows[0].club_id, 'form_team'))) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    if (!submissionIsEditable(sub.rows[0].status)) {
      return res.status(400).json({ error: 'Команда уже отправлена', code: 'NOT_EDITABLE' });
    }

    const r = await pool.query('DELETE FROM team_members WHERE id = $1 AND submission_id = $2', [memberId, id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Участник команды не найден' });

    res.json({ message: 'Участник убран из команды' });
  } catch (error) {
    console.error('❌ Ошибка удаления из команды:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ДАННЫЕ ДОКУМЕНТА — ОТДЕЛЬНЫМ ЗАПРОСОМ И ОТДЕЛЬНЫМ ПРАВОМ
// ============================================================
// В списках документы не показываются никогда. Смотреть их может
// руководитель КЮДа и координаторы движения — методисту и куратору
// паспортные данные детей не нужны.
app.get('/api/team-submissions/:id/members/:memberId/document', authenticate, async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const sub = await pool.query('SELECT club_id FROM team_submissions WHERE id = $1', [id]);
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });

    const position = await getClubPosition(req.user.userId, sub.rows[0].club_id);
    const allowed = MOVEMENT_ROLES.includes(req.user.role) || position === 'head';
    if (!allowed) {
      return res.status(403).json({
        error: 'Данные документов доступны руководителю КЮДа и координаторам движения',
        code: 'DOCUMENT_ACCESS_DENIED'
      });
    }

    const doc = await pool.query(
      `SELECT d.document_type, d.series_number, d.issued_by, d.issued_at, d.purged_at
       FROM team_member_documents d
       JOIN team_members tm ON tm.id = d.member_id
       WHERE d.member_id = $1 AND tm.submission_id = $2`,
      [memberId, id]
    );
    if (doc.rows.length === 0) return res.status(404).json({ error: 'Документ не заполнен' });
    if (doc.rows[0].purged_at) {
      return res.status(410).json({ error: 'Данные документа удалены после мероприятия', code: 'PURGED' });
    }

    await logActivity(req.user.userId, 'TEAM_DOCUMENT_VIEWED', 'team_member', memberId, {});

    res.json(doc.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка получения документа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Заполнить или изменить данные документа участника команды.
// Отдельным адресом и отдельной проверкой прав: паспортные данные детей
// не должны попадать в общие запросы состава.
app.put('/api/team-submissions/:id/members/:memberId/document', authenticate, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { document_type, series_number, issued_by, issued_at } = req.body;

    const sub = await pool.query('SELECT club_id, status FROM team_submissions WHERE id = $1', [id]);
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });

    const position = await getClubPosition(req.user.userId, sub.rows[0].club_id);
    const allowed = MOVEMENT_ROLES.includes(req.user.role) || position === 'head' || position === 'deputy';
    if (!allowed) {
      return res.status(403).json({
        error: 'Заполнять данные документов может руководитель КЮДа или его заместитель',
        code: 'DOCUMENT_ACCESS_DENIED'
      });
    }
    if (!submissionIsEditable(sub.rows[0].status)) {
      return res.status(400).json({ error: 'Команда уже отправлена', code: 'NOT_EDITABLE' });
    }
    if (!['passport', 'birth_certificate'].includes(document_type)) {
      return res.status(400).json({ error: 'document_type: passport или birth_certificate' });
    }

    const member = await pool.query(
      'SELECT id FROM team_members WHERE id = $1 AND submission_id = $2',
      [memberId, id]
    );
    if (member.rows.length === 0) return res.status(404).json({ error: 'Участник команды не найден' });

    await pool.query(
      `INSERT INTO team_member_documents (member_id, document_type, series_number, issued_by, issued_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (member_id) DO UPDATE
       SET document_type = EXCLUDED.document_type,
           series_number = EXCLUDED.series_number,
           issued_by = EXCLUDED.issued_by,
           issued_at = EXCLUDED.issued_at,
           purged_at = NULL,
           updated_at = NOW()`,
      [memberId, document_type, series_number || null, issued_by || null,
       nullableDate(issued_at), req.user.userId]
    );

    await logActivity(req.user.userId, 'TEAM_DOCUMENT_SAVED', 'team_member', memberId, { document_type });

    res.json({ message: 'Данные документа сохранены' });
  } catch (error) {
    console.error('❌ Ошибка сохранения документа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ОТПРАВКА КОМАНДЫ НА УТВЕРЖДЕНИЕ
// ============================================================
// Отправляет только руководитель КЮДа: это подпись под списком детей,
// которые поедут на выезд, и она должна быть персональной.
app.post('/api/team-submissions/:id/submit', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const sub = await pool.query(
      `SELECT ts.*, e.title AS event_title, c.name AS club_name
       FROM team_submissions ts
       JOIN events e ON e.id = ts.event_id
       JOIN clubs c ON c.id = ts.club_id
       WHERE ts.id = $1`,
      [id]
    );
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });
    const submission = sub.rows[0];

    const position = await getClubPosition(req.user.userId, submission.club_id);
    if (position !== 'head' && !MOVEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Отправить команду может только руководитель КЮДа',
        code: 'HEAD_ONLY'
      });
    }
    if (!submissionIsEditable(submission.status)) {
      return res.status(400).json({ error: 'Команда уже отправлена', code: 'ALREADY_SUBMITTED' });
    }

    const members = await pool.query(
      'SELECT id, participant_id, full_name, role_in_team FROM team_members WHERE submission_id = $1',
      [id]
    );
    if (members.rows.length === 0) {
      return res.status(400).json({ error: 'Команда пуста — добавьте участников', code: 'EMPTY_TEAM' });
    }

    // Перепроверяем согласия перед отправкой: с момента добавления
    // родитель мог отозвать согласие
    const problems = [];
    for (const m of members.rows) {
      if (!m.participant_id) continue;
      const missing = await missingConsentsFor(m.participant_id);
      if (missing.length > 0) {
        problems.push({ full_name: m.full_name, missing: missing.map((x) => x.title) });
      }
    }
    if (problems.length > 0) {
      return res.status(400).json({
        error: 'У части участников нет действующих согласий родителей',
        code: 'CONSENTS_MISSING',
        problems
      });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE team_submissions
       SET status = 'submitted', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.userId, id]
    );
    await client.query('COMMIT');

    await logActivity(req.user.userId, 'TEAM_SUBMITTED', 'team_submission', id, {
      event: submission.event_title, club: submission.club_name, members: members.rows.length
    });

    const coordinators = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'movement_coordinator') AND status IS DISTINCT FROM 'inactive'"
    );
    for (const c of coordinators.rows) {
      await createNotification(
        c.id,
        'team_submission',
        '📋 Команда на утверждение',
        `${submission.club_name} подал команду на «${submission.event_title}» — ${members.rows.length} чел.`,
        '/event-teams',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка отправки команды:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ============================================================
// УТВЕРЖДЕНИЕ ИЛИ ВОЗВРАТ НА ДОРАБОТКУ
// ============================================================
app.patch('/api/team-submissions/:id/review', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;

    if (!MOVEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Утверждать команды может координатор движения' });
    }
    if (!['approve', 'return'].includes(decision)) {
      return res.status(400).json({ error: 'decision: approve или return' });
    }
    if (decision === 'return' && !comment?.trim()) {
      return res.status(400).json({
        error: 'При возврате на доработку нужен комментарий — иначе руководитель не поймёт, что исправлять',
        code: 'COMMENT_REQUIRED'
      });
    }

    const sub = await pool.query(
      `SELECT ts.*, e.title AS event_title, c.name AS club_name
       FROM team_submissions ts
       JOIN events e ON e.id = ts.event_id
       JOIN clubs c ON c.id = ts.club_id
       WHERE ts.id = $1`,
      [id]
    );
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Команда не найдена' });
    if (sub.rows[0].status !== 'submitted') {
      return res.status(400).json({ error: 'Рассматривать можно только отправленную команду' });
    }

    const newStatus = decision === 'approve' ? 'approved' : 'revision_requested';
    const result = await pool.query(
      `UPDATE team_submissions
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_comment = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [newStatus, req.user.userId, comment?.trim() || null, id]
    );

    await logActivity(req.user.userId, decision === 'approve' ? 'TEAM_APPROVED' : 'TEAM_RETURNED',
      'team_submission', id, { club: sub.rows[0].club_name, event: sub.rows[0].event_title });

    const staff = await pool.query(
      `SELECT user_id FROM club_staff
       WHERE club_id = $1 AND removed_at IS NULL AND position IN ('head', 'deputy')`,
      [sub.rows[0].club_id]
    );
    for (const s of staff.rows) {
      await createNotification(
        s.user_id,
        'team_submission',
        decision === 'approve' ? '✅ Команда утверждена' : '↩️ Команда возвращена на доработку',
        decision === 'approve'
          ? `Команда на «${sub.rows[0].event_title}» утверждена`
          : `Команда на «${sub.rows[0].event_title}» возвращена: ${comment.trim()}`,
        '/my-invitations',
        'high'
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка рассмотрения команды:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ВСЕ КОМАНДЫ НА МЕРОПРИЯТИЕ
// ============================================================
app.get('/api/events/:eventId/teams', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!MOVEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const result = await pool.query(
      `SELECT ect.club_id, c.name AS club_name, ect.quota, ect.deadline, ect.allow_escorts,
              ts.id AS submission_id, ts.status, ts.submitted_at, ts.reviewed_at, ts.review_comment,
              sb.full_name AS submitted_by_name,
              COALESCE((SELECT COUNT(*)::int FROM team_members tm
                        WHERE tm.submission_id = ts.id AND tm.role_in_team <> 'escort'), 0) AS students_count,
              COALESCE((SELECT COUNT(*)::int FROM team_members tm
                        WHERE tm.submission_id = ts.id AND tm.role_in_team = 'escort'), 0) AS escorts_count
       FROM event_club_targets ect
       JOIN clubs c ON c.id = ect.club_id
       LEFT JOIN team_submissions ts ON ts.event_id = ect.event_id AND ts.club_id = ect.club_id
       LEFT JOIN users sb ON sb.id = ts.submitted_by
       WHERE ect.event_id = $1
       ORDER BY c.name`,
      [eventId]
    );

    const rows = result.rows.map((r) => ({ ...r, status: r.status || 'not_started' }));

    res.json({
      total_clubs: rows.length,
      submitted: rows.filter((r) => ['submitted', 'approved'].includes(r.status)).length,
      approved: rows.filter((r) => r.status === 'approved').length,
      waiting: rows.filter((r) => r.status === 'submitted').length,
      not_started: rows.filter((r) => r.status === 'not_started').length,
      total_participants: rows.reduce((s, r) => s + r.students_count + r.escorts_count, 0),
      clubs: rows
    });
  } catch (error) {
    console.error('❌ Ошибка получения команд:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ВЫГРУЗКА СВОДНОГО СПИСКА
// ============================================================
// Колонки повторяют прежнюю Google-форму, чтобы не пришлось переучиваться.
app.get('/api/events/:eventId/teams/export', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const withDocuments = req.query.documents === 'true';

    if (!MOVEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const event = await pool.query('SELECT title FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) return res.status(404).json({ error: 'Мероприятие не найдено' });

    const rows = await pool.query(
      `SELECT c.name AS club_name, ts.status,
              tm.role_in_team, tm.full_name, tm.birth_date, tm.city,
              tm.school_full_name, tm.class_name, tm.parent_full_name,
              tm.parent_phone, tm.participant_phone,
              tm.extra_program, tm.extra_program_ack,
              d.document_type, d.series_number, d.issued_by
       FROM team_submissions ts
       JOIN clubs c ON c.id = ts.club_id
       JOIN team_members tm ON tm.submission_id = ts.id
       LEFT JOIN team_member_documents d ON d.member_id = tm.id AND d.purged_at IS NULL
       WHERE ts.event_id = $1 AND ts.status IN ('submitted', 'approved')
       ORDER BY c.name, CASE tm.role_in_team WHEN 'escort' THEN 1 ELSE 0 END, tm.full_name`,
      [eventId]
    );

    const header = [
      'КЮД', 'Статус заявки', 'Сопровождающий или школьник', 'ФИО', 'Дата рождения',
      'Город', 'Учебное заведение', 'Класс', 'ФИО родителя', 'Телефон родителя',
      'Телефон школьника', 'Доп. программа', 'Ознакомлен с условиями доп. программы'
    ];
    if (withDocuments) header.push('Тип документа', 'Серия и номер', 'Кем выдан');

    const roleLabel = { student: 'Школьник', captain: 'Капитан команды', escort: 'Сопровождающий' };
    const statusLabel = { submitted: 'На утверждении', approved: 'Утверждена' };

    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [header.join(';')];
    for (const r of rows.rows) {
      const line = [
        r.club_name, statusLabel[r.status] || r.status, roleLabel[r.role_in_team] || r.role_in_team,
        r.full_name, r.birth_date ? new Date(r.birth_date).toLocaleDateString('ru-RU') : '',
        r.city, r.school_full_name, r.class_name, r.parent_full_name,
        r.parent_phone, r.participant_phone,
        r.extra_program ? 'Да' : 'Нет', r.extra_program_ack ? 'Да' : 'Нет'
      ];
      if (withDocuments) {
        line.push(
          r.document_type === 'passport' ? 'Паспорт РФ' : r.document_type === 'birth_certificate' ? 'Свидетельство о рождении' : '',
          r.series_number, r.issued_by
        );
      }
      lines.push(line.map(esc).join(';'));
    }

    await logActivity(req.user.userId, 'TEAMS_EXPORTED', 'event', eventId, {
      rows: rows.rows.length, with_documents: withDocuments
    });

    const fileName = `Komandy_${event.rows[0].title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send('﻿' + lines.join('\n'));
  } catch (error) {
    console.error('❌ Ошибка выгрузки команд:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// УДАЛЕНИЕ ДАННЫХ ДОКУМЕНТОВ ПОСЛЕ МЕРОПРИЯТИЯ
// ============================================================
// Паспортные данные нужны для проведения мероприятия, а не навсегда.
// Сам состав команды остаётся — удаляются только документы.
app.post('/api/events/:eventId/teams/purge-documents', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `UPDATE team_member_documents d
       SET series_number = NULL, issued_by = NULL, issued_at = NULL, purged_at = NOW()
       FROM team_members tm
       JOIN team_submissions ts ON ts.id = tm.submission_id
       WHERE d.member_id = tm.id AND ts.event_id = $1 AND d.purged_at IS NULL`,
      [eventId]
    );

    await logActivity(req.user.userId, 'TEAM_DOCUMENTS_PURGED', 'event', eventId, {
      purged: result.rowCount
    });

    res.json({ message: `Удалены данные документов: ${result.rowCount}`, purged: result.rowCount });
  } catch (error) {
    console.error('❌ Ошибка удаления документов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});


// ============================================================
// ПРИГЛАШЕНИЯ РОДИТЕЛЕЙ
// ============================================================
// Согласие за несовершеннолетнего даёт законный представитель, значит у
// родителя должна быть своя учётная запись. Раньше родитель привязывал
// ребёнка, вводя пароль ребёнка — то есть пароль ребёнка гулял по семье,
// а чаще родитель просто заходил под учёткой ребёнка, и запись «согласие
// дал законный представитель» ничего не значила.
//
// Теперь приглашение выпускает руководитель КЮДа из карточки участника
// либо сам участник — коротким кодом для родителя. Родитель заводит свой
// пароль. Пароль ребёнка не участвует нигде.
//
// Токен в базе лежит только хешем: утечка таблицы не даёт принять
// приглашение. Ссылку собирает фронтенд из своего адреса — серверу не
// нужно знать, на каком домене он опубликован.

const PARENT_INVITE_TTL_HOURS = 72;   // приглашение от сотрудника
const PARENT_CODE_TTL_HOURS = 24;     // код, выданный самим участником

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// Токен для ссылки: длинный, из него нельзя угадать соседний
function generateInviteToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// Код для диктовки голосом: без похожих символов, группами по 4
function generateParentCode() {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) out += '-';
  }
  return out;
}

// Приглашение выпускает тот, кто вправе вести участников этого КЮДа
async function canInviteParentFor(requester, childId) {
  const child = await pool.query(
    'SELECT id, full_name, role, club_id, birth_date FROM users WHERE id = $1',
    [childId]
  );
  if (child.rows.length === 0) return { ok: false, status: 404, error: 'Участник не найден' };
  const row = child.rows[0];
  if (row.role !== 'participant') {
    return { ok: false, status: 400, error: 'Приглашать родителя можно только для участника' };
  }
  if (MOVEMENT_ROLES.includes(requester.role)) return { ok: true, child: row };
  if (!row.club_id) {
    return { ok: false, status: 403, error: 'Участник не привязан к КЮДу' };
  }
  if (await canInClub(requester, row.club_id, 'manage_participants')) return { ok: true, child: row };
  return { ok: false, status: 403, error: 'Нет права приглашать родителей этого участника' };
}

// Выпуск приглашения. Прежнее действующее приглашение того же вида
// отзывается: две живые ссылки на одного ребёнка — это лишний риск.
async function issueParentInvitation({ childId, source, token, ttlHours, createdBy, hints = {} }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE parent_invitations
       SET revoked_at = NOW(), revoked_by = $3
       WHERE child_id = $1 AND source = $2 AND used_at IS NULL AND revoked_at IS NULL`,
      [childId, source, createdBy]
    );
    const result = await client.query(
      `INSERT INTO parent_invitations
         (child_id, token_hash, source, parent_full_name, parent_email, parent_phone,
          created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + ($8 || ' hours')::interval)
       RETURNING id, created_at, expires_at`,
      [childId, hashInviteToken(token), source,
       hints.full_name || null, hints.email || null, hints.phone || null,
       createdBy, String(ttlHours)]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ===== Сотрудник КЮДа выпускает приглашение из карточки участника =====
app.post('/api/participants/:id/parent-invitation', authenticate, async (req, res) => {
  try {
    const childId = req.params.id;
    const access = await canInviteParentFor(req.user, childId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const existingLink = await pool.query(
      `SELECT u.full_name FROM child_parent cp
       JOIN users u ON u.id = cp.parent_id
       WHERE cp.child_id = $1 AND cp.status = 'active'`,
      [childId]
    );
    if (existingLink.rows.length > 0) {
      return res.status(400).json({
        error: `К участнику уже привязан законный представитель: ${existingLink.rows[0].full_name}`,
        code: 'PARENT_ALREADY_LINKED'
      });
    }

    // Подсказки из карточки — чтобы родителю не пришлось вводить ФИО заново
    const card = await pool.query(
      'SELECT parent_full_name, parent_email, parent_phone FROM users WHERE id = $1',
      [childId]
    );

    const token = generateInviteToken();
    const invitation = await issueParentInvitation({
      childId,
      source: 'staff',
      token,
      ttlHours: PARENT_INVITE_TTL_HOURS,
      createdBy: req.user.userId,
      hints: {
        full_name: card.rows[0]?.parent_full_name,
        email: card.rows[0]?.parent_email,
        phone: card.rows[0]?.parent_phone
      }
    });

    await logActivity(req.user.userId, 'PARENT_INVITATION_CREATED', 'user', childId, {
      invitation_id: invitation.id,
      source: 'staff'
    });

    res.status(201).json({
      message: 'Приглашение создано',
      invitation_id: invitation.id,
      token,                                   // показывается один раз
      path: `/parent-join?token=${token}`,     // ссылку собирает фронтенд
      expires_at: invitation.expires_at,
      child_name: access.child.full_name,
      parent_hint: card.rows[0] || null
    });
  } catch (error) {
    console.error('❌ Ошибка создания приглашения родителя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ===== Состояние приглашений по участнику (без токенов) =====
app.get('/api/participants/:id/parent-invitations', authenticate, async (req, res) => {
  try {
    const childId = req.params.id;
    if (!(await canViewParticipant(req.user, childId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этого участника' });
    }

    const result = await pool.query(
      `SELECT pi.id, pi.source, pi.created_at, pi.expires_at, pi.used_at, pi.revoked_at,
              c.full_name AS created_by_name, p.full_name AS used_by_name,
              (pi.used_at IS NULL AND pi.revoked_at IS NULL AND pi.expires_at > NOW()) AS is_active
       FROM parent_invitations pi
       LEFT JOIN users c ON c.id = pi.created_by
       LEFT JOIN users p ON p.id = pi.used_by
       WHERE pi.child_id = $1
       ORDER BY pi.created_at DESC`,
      [childId]
    );

    const parents = await pool.query(
      `SELECT u.id, u.full_name, u.email, cp.created_at
       FROM child_parent cp JOIN users u ON u.id = cp.parent_id
       WHERE cp.child_id = $1 AND cp.status = 'active'`,
      [childId]
    );

    res.json({ invitations: result.rows, parents: parents.rows });
  } catch (error) {
    console.error('❌ Ошибка получения приглашений родителя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ===== Отзыв приглашения =====
app.post('/api/parent-invitations/:id/revoke', authenticate, async (req, res) => {
  try {
    const found = await pool.query('SELECT id, child_id, used_at FROM parent_invitations WHERE id = $1', [req.params.id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Приглашение не найдено' });
    if (found.rows[0].used_at) {
      return res.status(400).json({ error: 'Приглашение уже использовано — отзывать нечего' });
    }

    const access = await canInviteParentFor(req.user, found.rows[0].child_id);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    await pool.query(
      'UPDATE parent_invitations SET revoked_at = NOW(), revoked_by = $2 WHERE id = $1 AND revoked_at IS NULL',
      [req.params.id, req.user.userId]
    );
    await logActivity(req.user.userId, 'PARENT_INVITATION_REVOKED', 'user', found.rows[0].child_id, {
      invitation_id: req.params.id
    });
    res.json({ message: 'Приглашение отозвано' });
  } catch (error) {
    console.error('❌ Ошибка отзыва приглашения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ===== Участник получает код для своего родителя =====
// Запасной путь на случай, когда руководитель КЮДа недоступен.
app.post('/api/my-parent-code', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ error: 'Код для родителя выдаётся участнику' });
    }

    const linked = await pool.query(
      `SELECT 1 FROM child_parent WHERE child_id = $1 AND status = 'active'`,
      [req.user.userId]
    );
    if (linked.rows.length > 0) {
      return res.status(400).json({
        error: 'К вам уже привязан законный представитель',
        code: 'PARENT_ALREADY_LINKED'
      });
    }

    const code = generateParentCode();
    const invitation = await issueParentInvitation({
      childId: req.user.userId,
      source: 'child',
      token: code,
      ttlHours: PARENT_CODE_TTL_HOURS,
      createdBy: req.user.userId
    });

    await logActivity(req.user.userId, 'PARENT_CODE_CREATED', 'user', req.user.userId, {
      invitation_id: invitation.id
    });

    res.status(201).json({
      message: 'Код для родителя создан',
      code,
      expires_at: invitation.expires_at
    });
  } catch (error) {
    console.error('❌ Ошибка выдачи кода для родителя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Действующий код, если он уже выдан (сам код не возвращаем — его знает
// только тот, кому он показался при выпуске)
app.get('/api/my-parent-code', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ error: 'Код для родителя выдаётся участнику' });
    }
    const result = await pool.query(
      `SELECT created_at, expires_at FROM parent_invitations
       WHERE child_id = $1 AND source = 'child' AND used_at IS NULL
         AND revoked_at IS NULL AND expires_at > NOW()`,
      [req.user.userId]
    );
    const parent = await pool.query(
      `SELECT u.full_name FROM child_parent cp JOIN users u ON u.id = cp.parent_id
       WHERE cp.child_id = $1 AND cp.status = 'active'`,
      [req.user.userId]
    );
    res.json({
      active: result.rows[0] || null,
      parent_name: parent.rows[0]?.full_name || null
    });
  } catch (error) {
    console.error('❌ Ошибка получения кода для родителя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ===== Проверка приглашения родителем (без авторизации) =====
// Родитель должен увидеть, чьё приглашение открыл, до того как заведёт
// пароль. Возвращаем имя ребёнка и подсказки — ничего больше.
app.get('/api/parent-invitations/check', linkChildLimiter, async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Код приглашения не указан', code: 'INVALID_INVITATION' });

    const result = await pool.query(
      `SELECT pi.id, pi.expires_at, pi.used_at, pi.revoked_at,
              pi.parent_full_name, pi.parent_email, pi.parent_phone,
              u.full_name AS child_name, cl.name AS club_name
       FROM parent_invitations pi
       JOIN users u ON u.id = pi.child_id
       LEFT JOIN clubs cl ON cl.id = u.club_id
       WHERE pi.token_hash = $1`,
      [hashInviteToken(token)]
    );

    const row = result.rows[0];
    if (!row || row.revoked_at || row.used_at || new Date(row.expires_at) <= new Date()) {
      // Один ответ на все случаи: перебирать коды бессмысленно
      return res.status(404).json({
        error: 'Приглашение не найдено, уже использовано или истекло',
        code: 'INVALID_INVITATION'
      });
    }

    res.json({
      child_name: row.child_name,
      club_name: row.club_name,
      expires_at: row.expires_at,
      parent_hint: {
        full_name: row.parent_full_name,
        email: row.parent_email,
        phone: row.parent_phone
      }
    });
  } catch (error) {
    console.error('❌ Ошибка проверки приглашения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ===== Родитель уже в системе и добавляет второго ребёнка =====
app.post('/api/parent-invitations/claim', authenticate, linkChildLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Принять приглашение может только родитель' });
    }
    const cleanToken = String(req.body?.token || '').trim();
    if (!cleanToken) return res.status(400).json({ error: 'Код приглашения не указан' });

    const invitation = await pool.query(
      `SELECT pi.id, pi.child_id, pi.expires_at, pi.used_at, pi.revoked_at, pi.source,
              u.full_name AS child_name
       FROM parent_invitations pi
       JOIN users u ON u.id = pi.child_id
       WHERE pi.token_hash = $1`,
      [hashInviteToken(cleanToken)]
    );
    const inv = invitation.rows[0];
    if (!inv || inv.revoked_at || inv.used_at || new Date(inv.expires_at) <= new Date()) {
      return res.status(404).json({
        error: 'Приглашение не найдено, уже использовано или истекло',
        code: 'INVALID_INVITATION'
      });
    }

    const linked = await pool.query(
      `SELECT parent_id FROM child_parent WHERE child_id = $1 AND status = 'active'`,
      [inv.child_id]
    );
    if (linked.rows.length > 0) {
      const mine = linked.rows[0].parent_id === req.user.userId;
      return res.status(400).json({
        error: mine ? 'Этот ребёнок уже привязан к вам' : 'К участнику уже привязан законный представитель',
        code: 'PARENT_ALREADY_LINKED'
      });
    }

    await client.query('BEGIN');
    await client.query(
      `INSERT INTO child_parent (parent_id, child_id, status, created_at)
       VALUES ($1, $2, 'active', NOW())`,
      [req.user.userId, inv.child_id]
    );
    const marked = await client.query(
      `UPDATE parent_invitations SET used_at = NOW(), used_by = $2
       WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
       RETURNING id`,
      [inv.id, req.user.userId]
    );
    if (marked.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Приглашение только что было использовано', code: 'INVALID_INVITATION' });
    }
    await client.query('COMMIT');

    await logActivity(req.user.userId, 'PARENT_INVITATION_ACCEPTED', 'user', inv.child_id, {
      invitation_id: inv.id,
      source: inv.source
    });

    res.status(201).json({ message: `Участник ${inv.child_name} привязан`, child_name: inv.child_name });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка приёма приглашения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ===== Приём приглашения: родитель заводит себе учётную запись =====
app.post('/api/parent-invitations/accept', linkChildLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, full_name, email, password, phone } = req.body || {};
    const cleanToken = String(token || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(full_name || '').trim();

    if (!cleanToken || !cleanName || !cleanEmail || !password) {
      return res.status(400).json({ error: 'Заполните ФИО, электронную почту и пароль' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 8 символов', code: 'WEAK_PASSWORD' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Проверьте адрес электронной почты' });
    }

    const invitation = await pool.query(
      `SELECT pi.id, pi.child_id, pi.expires_at, pi.used_at, pi.revoked_at, pi.source,
              u.full_name AS child_name
       FROM parent_invitations pi
       JOIN users u ON u.id = pi.child_id
       WHERE pi.token_hash = $1`,
      [hashInviteToken(cleanToken)]
    );
    const inv = invitation.rows[0];
    if (!inv || inv.revoked_at || inv.used_at || new Date(inv.expires_at) <= new Date()) {
      return res.status(404).json({
        error: 'Приглашение не найдено, уже использовано или истекло',
        code: 'INVALID_INVITATION'
      });
    }

    // Ребёнок мог получить представителя, пока приглашение лежало в чате
    const linked = await pool.query(
      `SELECT 1 FROM child_parent WHERE child_id = $1 AND status = 'active'`,
      [inv.child_id]
    );
    if (linked.rows.length > 0) {
      return res.status(400).json({
        error: 'К участнику уже привязан законный представитель',
        code: 'PARENT_ALREADY_LINKED'
      });
    }

    const existing = await pool.query(
      'SELECT id, role, password_hash FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    await client.query('BEGIN');

    let parentId;
    if (existing.rows.length > 0) {
      // Такой адрес уже есть. Привязываем только если это учётная запись
      // родителя и пароль от неё введён верно — иначе приглашение стало бы
      // способом захватить чужой аккаунт.
      const account = existing.rows[0];
      const samePassword = await bcrypt.compare(String(password), account.password_hash);
      if (account.role !== 'parent' || !samePassword) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Этот адрес уже зарегистрирован. Войдите под ним и примите приглашение из личного кабинета.',
          code: 'EMAIL_ALREADY_USED'
        });
      }
      parentId = account.id;
      await client.query(
        'UPDATE users SET full_name = $2, phone = COALESCE(NULLIF($3, \'\'), phone) WHERE id = $1',
        [parentId, cleanName, String(phone || '').trim()]
      );
    } else {
      const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
      const created = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, phone, status,
                            must_change_password, created_at)
         VALUES ($1, $2, $3, 'parent', $4, 'active', false, NOW())
         RETURNING id`,
        [cleanEmail, passwordHash, cleanName, String(phone || '').trim()]
      );
      parentId = created.rows[0].id;
    }

    await client.query(
      `INSERT INTO child_parent (parent_id, child_id, status, created_at)
       VALUES ($1, $2, 'active', NOW())`,
      [parentId, inv.child_id]
    );

    const marked = await client.query(
      `UPDATE parent_invitations SET used_at = NOW(), used_by = $2
       WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
       RETURNING id`,
      [inv.id, parentId]
    );
    if (marked.rows.length === 0) {
      // Кто-то принял это же приглашение, пока шла транзакция
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Приглашение только что было использовано',
        code: 'INVALID_INVITATION'
      });
    }

    await client.query('COMMIT');

    await logActivity(parentId, 'PARENT_INVITATION_ACCEPTED', 'user', inv.child_id, {
      invitation_id: inv.id,
      source: inv.source
    });

    const token_jwt = jwt.sign(
      { userId: parentId, email: cleanEmail, role: 'parent' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Учётная запись создана',
      token: token_jwt,
      user: { id: parentId, email: cleanEmail, full_name: cleanName, role: 'parent' },
      child_name: inv.child_name
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'Этот адрес уже зарегистрирован', code: 'EMAIL_ALREADY_USED' });
    }
    console.error('❌ Ошибка приёма приглашения родителя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});


// ============================================================
// МАССОВАЯ ВЫДАЧА ВРЕМЕННЫХ ПАРОЛЕЙ
// ============================================================
// Почты у движения нет, поэтому доступы раздаются списком: координатор
// выгружает файл и передаёт логины руководителям КЮДов, те — участникам.
//
// Безопасность держится на трёх вещах, и все три уже есть в платформе:
// пароль генерируется crypto.randomBytes, в базе лежит только его bcrypt-хеш,
// а флаг must_change_password заставляет сменить пароль при первом входе —
// то есть выданный пароль одноразовый и после первого входа бесполезен.
//
// Сам пароль возвращается ровно один раз, в ответе на этот запрос.
// Повторно его не покажет никто, включая администратора: восстановить
// его из базы невозможно. Потерялся — выдать заново.
app.post('/api/users/issue-credentials', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const ids = Array.isArray(req.body?.user_ids) ? req.body.user_ids : [];

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Не выбран ни один пользователь' });
    }
    // Ограничение сверху, чтобы одним запросом нельзя было сбросить пароли
    // всей платформе по ошибке или по злому умыслу
    if (ids.length > 300) {
      return res.status(400).json({
        error: 'За один раз можно выдать не больше 300 доступов',
        code: 'TOO_MANY_USERS'
      });
    }

    const found = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.must_change_password,
              c.name AS club_name
       FROM users u
       LEFT JOIN clubs c ON c.id = u.club_id
       WHERE u.id = ANY($1)`,
      [ids]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователи не найдены' });
    }

    // Себе пароль не сбрасываем: администратор выйдет из системы и не
    // сможет вернуться, потому что новый пароль он увидит в ответе, но
    // текущая сессия уже будет считаться временной
    const targets = found.rows.filter((u) => u.id !== req.user.userId);
    if (targets.length === 0) {
      return res.status(400).json({ error: 'Нельзя выдать временный пароль самому себе' });
    }

    await client.query('BEGIN');

    const issued = [];
    for (const user of targets) {
      const password = generatePassword();
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await client.query(
        `UPDATE users
         SET password_hash = $1, must_change_password = true,
             last_password_change = NOW(), login_attempts = 0, locked_until = NULL
         WHERE id = $2`,
        [hash, user.id]
      );
      issued.push({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        club_name: user.club_name,
        status: user.status,
        password
      });
    }

    await client.query('COMMIT');

    // Пароли в журнал не попадают — только кому и сколько выдали
    await logActivity(req.user.userId, 'CREDENTIALS_ISSUED', 'user', null, {
      count: issued.length,
      user_ids: issued.map((u) => u.id)
    });

    // Кэш профилей в middleware/auth держит роль и статус до 30 секунд;
    // пароля он не касается, поэтому сбрасывать его здесь не нужно.
    res.status(201).json({
      message: `Временные пароли выданы: ${issued.length}`,
      issued,
      skipped_self: found.rows.length - targets.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка выдачи временных паролей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});


// ============================================================
// СОЗДАНИЕ, ПРАВКА И АРХИВАЦИЯ КЮДА
// ============================================================
// Экран «Управление КЮДами» до этого только делал вид, что работает:
// внутри стоял setTimeout на полсекунды, после которого клуб появлялся
// в списке на экране и исчезал при первом же обновлении страницы.
// Ни создания, ни правки, ни удаления на сервере не существовало —
// все сорок четыре клуба заводились напрямую в базе.

app.post('/api/clubs', authenticate, requireAdminOrCoordinator, validateBody(clubSchema), async (req, res) => {
  try {
    const { name, description, city, school, leader_name, contact_email, contact_phone } = req.body;

    // Клубы называются по городу, и одинаковые имена в списке из сорока
    // четырёх строк означают, что кто-то завёл второй по ошибке
    const clash = await pool.query(
      'SELECT id FROM clubs WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
      [name]
    );
    if (clash.rows.length > 0) {
      return res.status(409).json({
        error: 'КЮД с таким названием уже есть',
        code: 'CLUB_NAME_TAKEN'
      });
    }

    const result = await pool.query(
      `INSERT INTO clubs (name, description, city, school, leader_name,
                          contact_email, contact_phone, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
       RETURNING *`,
      [String(name).trim(), description || '', city || '', school || '',
       leader_name || '', contact_email || '', contact_phone || '']
    );

    const club = result.rows[0];
    await logActivity(req.user.userId, 'CLUB_CREATED', 'club', club.id, { name: club.name });

    res.status(201).json({ message: 'КЮД создан', club });
  } catch (error) {
    console.error('❌ Ошибка создания КЮДа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.patch('/api/clubs/:id', authenticate, requireAdminOrCoordinator, validateBody(clubSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, city, school, leader_name, contact_email, contact_phone } = req.body;

    const existing = await pool.query('SELECT id, name FROM clubs WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'КЮД не найден' });
    }

    const clash = await pool.query(
      'SELECT id FROM clubs WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id <> $2',
      [name, id]
    );
    if (clash.rows.length > 0) {
      return res.status(409).json({ error: 'КЮД с таким названием уже есть', code: 'CLUB_NAME_TAKEN' });
    }

    const result = await pool.query(
      `UPDATE clubs
       SET name = $1, description = $2, city = $3, school = $4,
           leader_name = $5, contact_email = $6, contact_phone = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [String(name).trim(), description || '', city || '', school || '',
       leader_name || '', contact_email || '', contact_phone || '', id]
    );

    await logActivity(req.user.userId, 'CLUB_UPDATED', 'club', id, {
      name: result.rows[0].name,
      previous_name: existing.rows[0].name
    });

    res.json({ message: 'КЮД обновлён', club: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка обновления КЮДа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Удаления как такового нет: на клуб ссылаются участники, мероприятия,
// отчёты и достижения. Удалить строку — значит осиротить их историю.
// Клуб уходит в архив: пропадает из списков, но всё, что было, остаётся.
app.delete('/api/clubs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const club = await pool.query('SELECT id, name, status FROM clubs WHERE id = $1', [id]);
    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'КЮД не найден' });
    }
    if (club.rows[0].status === 'archived') {
      return res.status(400).json({ error: 'КЮД уже в архиве' });
    }

    const members = await pool.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE club_id = $1 AND status = 'active'`,
      [id]
    );
    if (members.rows[0].n > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        error: `В КЮДе ещё числится людей: ${members.rows[0].n}. Переведите их в другой клуб или подтвердите архивацию.`,
        code: 'CLUB_NOT_EMPTY',
        members_count: members.rows[0].n
      });
    }

    await pool.query(
      `UPDATE clubs SET status = 'archived', archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logActivity(req.user.userId, 'CLUB_ARCHIVED', 'club', id, {
      name: club.rows[0].name,
      members_count: members.rows[0].n
    });

    res.json({ message: 'КЮД перенесён в архив', archived: true });
  } catch (error) {
    console.error('❌ Ошибка архивации КЮДа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// Вернуть из архива
app.post('/api/clubs/:id/restore', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE clubs SET status = 'active', archived_at = NULL, updated_at = NOW()
       WHERE id = $1 AND status = 'archived'
       RETURNING id, name`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'КЮД не найден или не в архиве' });
    }
    await logActivity(req.user.userId, 'CLUB_RESTORED', 'club', id, { name: result.rows[0].name });
    res.json({ message: 'КЮД возвращён из архива' });
  } catch (error) {
    console.error('❌ Ошибка возврата КЮДа из архива:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});


// ============================================================
// НАПОМИНАНИЕ О НЕОФОРМЛЕННЫХ СОГЛАСИЯХ
// ============================================================
// Кнопка «Напомнить всем» на экране согласий раньше ждала секунду и
// писала «напоминания отправлены». Не отправлялось ничего.
//
// Писем платформа не шлёт — почтового модуля нет. Поэтому напоминание
// приходит уведомлением внутрь платформы, и адресат выбирается по смыслу:
//   — есть законный представитель → напоминаем ему, он и оформляет;
//   — представителя нет → напоминаем руководителю КЮДа, потому что
//     оформлять некому и сначала нужно пригласить родителя.
// Тем, кому напомнить некому, платформа честно говорит об этом числом.
app.post('/api/consents/remind', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;
    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const ids = Array.isArray(req.body?.participant_ids) ? req.body.participant_ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Не выбран ни один участник' });
    }
    if (ids.length > 500) {
      return res.status(400).json({ error: 'За один раз можно напомнить не больше чем по 500 участникам' });
    }

    // Руководитель КЮДа напоминает только по своим клубам
    let allowed = ids;
    if (role === 'club_coordinator') {
      const clubIds = await getCoordinatorClubIds(userId);
      if (clubIds.length === 0) {
        return res.status(403).json({ error: 'К вам не привязан ни один КЮД' });
      }
      const mine = await pool.query(
        `SELECT id FROM users WHERE id = ANY($1) AND club_id = ANY($2)`,
        [ids, clubIds]
      );
      allowed = mine.rows.map((r) => r.id);
      if (allowed.length === 0) {
        return res.status(403).json({ error: 'Выбранные участники не из вашего КЮДа' });
      }
    }

    const rows = await pool.query(
      `SELECT u.id, u.full_name, u.club_id, c.name AS club_name,
              (SELECT cp.parent_id FROM child_parent cp
                WHERE cp.child_id = u.id AND cp.status = 'active' LIMIT 1) AS parent_id,
              ARRAY(
                SELECT d.title FROM consent_documents d
                WHERE d.is_current = true AND d.is_required = true
                  AND NOT EXISTS (
                    SELECT 1 FROM user_consents uc
                    WHERE uc.user_id = u.id AND uc.consent_type = d.code AND uc.revoked_at IS NULL
                  )
              ) AS missing
       FROM users u
       LEFT JOIN clubs c ON c.id = u.club_id
       WHERE u.id = ANY($1) AND u.role = 'participant' AND u.status = 'active'`,
      [allowed]
    );

    let toParents = 0;
    let toStaff = 0;
    let nobody = 0;
    const staffBuckets = new Map();   // club_id -> [имена участников без представителя]

    for (const p of rows.rows) {
      if (!p.missing || p.missing.length === 0) continue;   // у этого всё оформлено

      if (p.parent_id) {
        await createNotification(
          p.parent_id,
          'consent',
          'Нужно оформить согласия',
          `Для участия ${p.full_name} в мероприятиях движения не хватает согласий: ${p.missing.join(', ')}.`,
          '/parent-consents',
          'high'
        );
        toParents++;
      } else if (p.club_id) {
        const list = staffBuckets.get(p.club_id) || [];
        list.push(p.full_name);
        staffBuckets.set(p.club_id, list);
      } else {
        nobody++;
      }
    }

    // Руководителям — по одному письму на клуб, а не по одному на ребёнка
    for (const [clubId, names] of staffBuckets.entries()) {
      const heads = await pool.query(
        `SELECT user_id FROM club_staff
         WHERE club_id = $1 AND removed_at IS NULL AND position IN ('head', 'deputy')`,
        [clubId]
      );
      if (heads.rows.length === 0) {
        nobody += names.length;
        continue;
      }
      for (const head of heads.rows) {
        await createNotification(
          head.user_id,
          'consent',
          'Участники без законного представителя',
          `Согласия не оформлены, и оформить их некому — к участникам не привязан родитель: ${names.join(', ')}. ` +
          'Пригласите родителей из карточки участника.',
          '/participants',
          'high'
        );
        toStaff++;
      }
    }

    await logActivity(userId, 'CONSENT_REMINDERS_SENT', 'user', null, {
      participants: rows.rows.length,
      to_parents: toParents,
      to_staff: toStaff,
      nobody
    });

    res.json({
      message: 'Напоминания отправлены',
      to_parents: toParents,
      to_staff: toStaff,
      nobody
    });
  } catch (error) {
    console.error('❌ Ошибка отправки напоминаний о согласиях:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});


// ============================================================
// НАЗНАЧЕНИЕ СОТРУДНИКА НА МЕРОПРИЯТИЕ
// ============================================================
// Экран «Сотрудники» писал «Сотрудник назначен!» и не делал ничего:
// на месте запроса стоял комментарий «TODO: добавить API». Назначения
// существовали только в таблице, куда их писали вручную.
app.post('/api/event-tutor-assignments', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const { event_id, tutor_id, role, notes } = req.body || {};

    if (!event_id || !tutor_id) {
      return res.status(400).json({ error: 'Нужно выбрать мероприятие и сотрудника' });
    }

    const event = await pool.query('SELECT id, title, event_date FROM events WHERE id = $1', [event_id]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const staff = await pool.query(
      `SELECT id, full_name, role, status FROM users WHERE id = $1`,
      [tutor_id]
    );
    if (staff.rows.length === 0) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }
    if (BLOCKED_STATUSES.includes(staff.rows[0].status)) {
      return res.status(400).json({ error: 'Учётная запись сотрудника заблокирована' });
    }

    const existing = await pool.query(
      'SELECT id FROM event_tutor_assignments WHERE event_id = $1 AND tutor_id = $2',
      [event_id, tutor_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `${staff.rows[0].full_name} уже назначен на это мероприятие`,
        code: 'ALREADY_ASSIGNED'
      });
    }

    const result = await pool.query(
      `INSERT INTO event_tutor_assignments (event_id, tutor_id, role, status, assigned_by, notes, assigned_at, updated_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, NOW(), NOW())
       RETURNING *`,
      [event_id, tutor_id, role || 'tutor', req.user.userId, notes || null]
    );

    // Сотрудник должен узнать о назначении, а не обнаружить его случайно
    await createNotification(
      tutor_id,
      'assignment',
      'Вас назначили на мероприятие',
      `${event.rows[0].title}${event.rows[0].event_date ? ' — ' + new Date(event.rows[0].event_date).toLocaleDateString('ru-RU') : ''}.`,
      '/tutor-assignments',
      'high'
    );

    await logActivity(req.user.userId, 'TUTOR_ASSIGNED', 'event', event_id, {
      tutor: staff.rows[0].full_name,
      role: role || 'tutor'
    });

    res.status(201).json({ message: 'Сотрудник назначен', assignment: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка назначения сотрудника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

app.delete('/api/event-tutor-assignments/:id', authenticate, requireAdminOrCoordinator, async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT a.id, a.event_id, a.tutor_id, u.full_name, e.title
       FROM event_tutor_assignments a
       LEFT JOIN users u ON u.id = a.tutor_id
       LEFT JOIN events e ON e.id = a.event_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Назначение не найдено' });
    }

    await pool.query('DELETE FROM event_tutor_assignments WHERE id = $1', [req.params.id]);

    await createNotification(
      found.rows[0].tutor_id,
      'assignment',
      'Назначение отменено',
      `Вы больше не назначены на мероприятие «${found.rows[0].title || ''}».`,
      '/tutor-assignments',
      'normal'
    );

    await logActivity(req.user.userId, 'TUTOR_UNASSIGNED', 'event', found.rows[0].event_id, {
      tutor: found.rows[0].full_name
    });

    res.json({ message: 'Назначение отменено' });
  } catch (error) {
    console.error('❌ Ошибка отмены назначения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});


// ============================================================
// ПРИГЛАШЕНИЯ РОДИТЕЛЯМ — СРАЗУ ПО ВСЕМУ КЮДУ
// ============================================================
// По одному приглашению на участника — это двадцать ссылок руками в
// клубе средней величины и больше девятисот по всему движению. Здесь
// они выпускаются пачкой, и руководитель получает готовый список
// «ФИО ребёнка → ссылка для родителя», который можно разослать или
// распечатать.
//
// Те, у кого представитель уже привязан, пропускаются: выпускать им
// приглашение незачем.
app.post('/api/clubs/:clubId/parent-invitations', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;

    if (!MOVEMENT_ROLES.includes(req.user.role) &&
        !(await canInClub(req.user, clubId, 'manage_participants'))) {
      return res.status(403).json({ error: 'Нет права приглашать родителей в этом КЮДе' });
    }

    const club = await pool.query('SELECT id, name FROM clubs WHERE id = $1', [clubId]);
    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'КЮД не найден' });
    }

    const participants = await pool.query(
      `SELECT u.id, u.full_name, u.parent_full_name, u.parent_email, u.parent_phone,
              EXISTS (SELECT 1 FROM child_parent cp
                       WHERE cp.child_id = u.id AND cp.status = 'active') AS has_parent
       FROM users u
       WHERE u.club_id = $1 AND u.role = 'participant' AND u.status = 'active'
       ORDER BY u.full_name`,
      [clubId]
    );

    const issued = [];
    const skipped = [];

    for (const p of participants.rows) {
      if (p.has_parent) {
        skipped.push({ id: p.id, full_name: p.full_name, reason: 'представитель уже привязан' });
        continue;
      }
      const token = generateInviteToken();
      const invitation = await issueParentInvitation({
        childId: p.id,
        source: 'staff',
        token,
        ttlHours: PARENT_INVITE_TTL_HOURS,
        createdBy: req.user.userId,
        hints: {
          full_name: p.parent_full_name,
          email: p.parent_email,
          phone: p.parent_phone
        }
      });
      issued.push({
        participant_id: p.id,
        child_name: p.full_name,
        parent_hint: p.parent_full_name || null,
        parent_phone: p.parent_phone || null,
        token,
        path: `/parent-join?token=${token}`,
        expires_at: invitation.expires_at
      });
    }

    await logActivity(req.user.userId, 'PARENT_INVITATIONS_BULK', 'club', clubId, {
      club: club.rows[0].name,
      issued: issued.length,
      skipped: skipped.length
    });

    res.status(201).json({
      message: `Выпущено приглашений: ${issued.length}`,
      club_name: club.rows[0].name,
      issued,
      skipped
    });
  } catch (error) {
    console.error('❌ Ошибка массового выпуска приглашений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================
// ОБРАБОТКА ОШИБОК CORS
// ============================================================
// Раньше отклонённый по CORS запрос уходил в стандартный обработчик Express
// и клиент получал HTML-страницу со стектрейсом.
app.use((err, req, res, next) => {
  if (err && err.code === 'CORS_DENIED') {
    return res.status(403).json({
      error: 'Источник запроса не разрешён',
      code: 'CORS_DENIED'
    });
  }
  return next(err);
});

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔐 JWT_SECRET: задан (${JWT_SECRET.length} символов), токен живёт ${JWT_EXPIRES_IN}`);
  console.log(`✅ ВСЕ API ЗАГРУЖЕНЫ!`);
});