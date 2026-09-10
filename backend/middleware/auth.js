// backend/middleware/auth.js

import jwt from 'jsonwebtoken';

// ⚠️ Раньше здесь был fallback на захардкоженный ключ. Хуже того, этот
// модуль читал process.env ДО того, как server.js вызывал dotenv.config(),
// поэтому значение из backend/.env сюда вообще не доходило и всегда
// использовался ключ из исходников. Теперь ключ приходит из lib/config.js,
// который сам загружает окружение и падает, если ключа нет.
import { JWT_SECRET } from '../lib/config.js';

// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================
// ============================================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ (как в lib/logger.js)
// ============================================================
let poolInstance = null;

export const initAuth = (pool) => {
  poolInstance = pool;
};

// Статусы, при которых доступ закрыт. Список намеренно перечисляет
// блокирующие значения, а не требует status === 'active': у части
// пользователей поле может быть пустым или 'pending', и такие люди
// не должны внезапно лишиться доступа.
export const BLOCKED_STATUSES = ['inactive', 'blocked', 'banned', 'deleted', 'archived'];

// ============================================================
// КЭШ АКТУАЛЬНЫХ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// ============================================================
// Роль и статус читаются из базы на каждый запрос, но не чаще раза в
// 30 секунд на пользователя — иначе получаем лишний запрос к базе на
// каждый вызов API.
const CACHE_TTL_MS = 30 * 1000;
const userCache = new Map();

export const invalidateUserCache = (userId) => {
  if (userId) userCache.delete(userId);
  else userCache.clear();
};

async function getFreshUser(userId) {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.user;

  const result = await poolInstance.query(
    'SELECT id, role, club_id, is_president, status FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0] || null;
  userCache.set(userId, { user, at: Date.now() });
  return user;
}

// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Требуется авторизация',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Неверный формат токена',
      code: 'INVALID_TOKEN_FORMAT'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Сессия истекла. Войдите заново.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      error: 'Неверный токен',
      code: 'INVALID_TOKEN'
    });
  }

  // ⚠️ Раньше req.user = decoded, то есть роль, клуб и признак президента
  // брались прямо из токена. Токен живёт сутки и не отзывается: разжаловали
  // координатора — он оставался координатором до конца срока, уволили
  // сотрудника — доступ жил дальше, перевели участника в другой КЮД — он
  // продолжал видеть старый. Берём актуальные данные из базы.
  if (!poolInstance) {
    console.error('❌ authenticate: база не подключена, вызовите initAuth(pool)');
    return res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }

  try {
    const fresh = await getFreshUser(decoded.userId);

    if (!fresh) {
      return res.status(401).json({
        error: 'Учётная запись не найдена',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    if (BLOCKED_STATUSES.includes(fresh.status)) {
      return res.status(403).json({
        error: 'Учётная запись отключена. Обратитесь к администратору.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    req.user = {
      ...decoded,
      userId: fresh.id,
      role: fresh.role,
      club_id: fresh.club_id,
      is_president: fresh.is_president || false,
      status: fresh.status
    };

    next();
  } catch (error) {
    console.error('❌ Ошибка проверки пользователя:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' });
  }
};

// ============================================================
// ПРОВЕРКА РОЛИ
// ============================================================
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Недостаточно прав. Требуется: ${allowedRoles.join(', ')}`,
        code: 'FORBIDDEN',
        your_role: req.user.role
      });
    }
    
    next();
  };
};

// ============================================================
// ТОЛЬКО АДМИН
// ============================================================
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Требуется авторизация',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Требуются права администратора',
      code: 'ADMIN_REQUIRED',
      your_role: req.user.role
    });
  }
  
  next();
};

// ============================================================
// АДМИН ИЛИ КООРДИНАТОР ДВИЖЕНИЯ
// ============================================================
export const requireAdminOrCoordinator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Требуется авторизация',
      code: 'UNAUTHORIZED'
    });
  }
  
  const allowedRoles = ['admin', 'movement_coordinator'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Требуются права администратора или координатора движения',
      code: 'ADMIN_OR_COORDINATOR_REQUIRED',
      your_role: req.user.role
    });
  }
  
  next();
};