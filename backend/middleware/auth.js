// backend/middleware/auth.js

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dod-platform-2024';

// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================
export const authenticate = (req, res, next) => {
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

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
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