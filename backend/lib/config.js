// backend/lib/config.js
// Единая точка загрузки окружения и проверки обязательных переменных.
// Импортируется первым — до того, как любой другой модуль обратится к process.env.

import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// ПРОВЕРКА ОБЯЗАТЕЛЬНЫХ ПЕРЕМЕННЫХ
// ============================================================
function required(name, { minLength = 0 } = {}) {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    console.error(`❌ Переменная окружения ${name} не задана. Запуск невозможен.`);
    console.error(`   Задайте её в панели RelaxDev или в backend/.env`);
    process.exit(1);
  }

  if (minLength && value.length < minLength) {
    console.error(`❌ ${name} короче ${minLength} символов — это небезопасно. Запуск невозможен.`);
    console.error(`   Сгенерировать новый: openssl rand -base64 48`);
    process.exit(1);
  }

  return value;
}

// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================

// ⚠️ Без fallback: раньше здесь был захардкоженный ключ, что позволяло
// любому, кто видел исходники, подписать себе токен с ролью admin.
export const JWT_SECRET = required('JWT_SECRET', { minLength: 32 });

export const DATABASE_URL = required('DATABASE_URL');

export const PORT = parseInt(process.env.PORT, 10) || 8080;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Срок жизни токена. Раньше было 7 дней — слишком долго для системы,
// где роль пользователя может измениться в любой момент.
//
// ⚠️ Значение уходит прямо в jwt.sign(), и мусор в переменной ломает ВХОД
// в систему целиком (jwt.sign бросает исключение, /api/login отдаёт 500).
// Поэтому проверяем формат и при непонятном значении откатываемся на 24h,
// громко предупреждая в лог, — сломанная переменная окружения не должна
// класть авторизацию.
function parseExpiresIn(raw) {
  const DEFAULT = '24h';
  if (!raw || raw.trim() === '') return DEFAULT;

  const value = raw.trim();
  // Допустимо: число секунд ('3600') или таймспан ('60s', '30m', '24h', '7d')
  const isValid = /^\d+$/.test(value) || /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y)$/i.test(value);

  if (!isValid) {
    console.warn(`⚠️  JWT_EXPIRES_IN содержит недопустимое значение: "${value}"`);
    console.warn(`   Допустимые примеры: 24h, 12h, 7d, 3600. Использую ${DEFAULT}.`);
    console.warn(`   Исправьте переменную в панели RelaxDev.`);
    return DEFAULT;
  }

  return value;
}

export const JWT_EXPIRES_IN = parseExpiresIn(process.env.JWT_EXPIRES_IN);

// Сколько прокси стоит перед приложением (RelaxDev — обычно один).
export const TRUST_PROXY_HOPS = parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1;

// Стоимость bcrypt. 12 — разумный минимум на 2026 год.
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// Шифрование соединения с базой. На RelaxDev TLS у базы нет — она доступна
// только из внутренней сети, и панель прямо предписывает ssl: false.
// Включать только если база переедет туда, где TLS есть.
export const DB_SSL = process.env.DB_SSL === 'true';

console.log('✅ Конфигурация загружена');
