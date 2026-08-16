// backend/lib/logger.js

import { Pool } from 'pg';

// Используем тот же pool, что и в server.js
// Поэтому будем передавать его через функцию

let poolInstance = null;

export const initLogger = (pool) => {
  poolInstance = pool;
};

// ============================================================
// ЛОГИРОВАНИЕ ДЕЙСТВИЯ
// ============================================================
export const logActivity = async (userId, action, entityType, entityId = null, details = {}) => {
  if (!poolInstance) {
    console.error('❌ Логгер не инициализирован');
    return;
  }

  try {
    await poolInstance.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, entityType, entityId, details]
    );
  } catch (error) {
    console.error('❌ Ошибка логирования:', error.message);
  }
};

// ============================================================
// ПОЛУЧЕНИЕ ЛОГОВ (для админа)
// ============================================================
export const getActivityLogs = async (userId = null, entityType = null, limit = 100, offset = 0) => {
  if (!poolInstance) {
    throw new Error('Логгер не инициализирован');
  }

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

  if (userId) {
    query += ` AND al.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (entityType) {
    query += ` AND al.entity_type = $${paramIndex}`;
    params.push(entityType);
    paramIndex++;
  }

  query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await poolInstance.query(query, params);
  return result.rows;
};