// backend/scripts/make-password-sql.js
//
// Готовит SQL для установки пароля пользователю. Подключение к базе НЕ нужно —
// скрипт только считает bcrypt-хеш и печатает запрос, который нужно выполнить
// в консоли базы данных (панель RelaxDev → проект → «База данных»).
//
// Нужен, когда база доступна только изнутри сети хостинга.
//
// Запуск из папки backend:
//   node scripts/make-password-sql.js почта@пример.ру
//   node scripts/make-password-sql.js почта@пример.ру МойПароль123

import crypto from 'crypto';
import bcrypt from 'bcrypt';

const [, , email, providedPassword] = process.argv;

if (!email) {
  console.error('❌ Не указана почта.');
  console.error('   node scripts/make-password-sql.js почта@пример.ру');
  process.exit(1);
}

// Пароль должен пройти проверку сервера: минимум 8 символов,
// заглавная, строчная и цифра. Без спецсимволов — их неудобно диктовать.
function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const bytes = crypto.randomBytes(16);

  let password = upper[bytes[0] % upper.length] + lower[bytes[1] % lower.length] + digits[bytes[2] % digits.length];
  for (let i = 3; i < 16; i++) password += all[bytes[i] % all.length];
  return password;
}

const password = providedPassword || generatePassword();
const hash = await bcrypt.hash(password, 12);
const safeEmail = email.replace(/'/g, "''");

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ШАГ 1. Проверить, есть ли такой пользователь.
Выполните в консоли базы:

SELECT id, email, full_name, role, status FROM users WHERE email ILIKE '%${safeEmail.split('@')[0]}%';

Если в списке адрес отличается от '${safeEmail}' (сервер мог дописать
цифры к занятой почте) — запустите этот скрипт заново с тем адресом.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ШАГ 2. Установить пароль. Выполните в консоли базы:

UPDATE users
SET password_hash = '${hash}',
    must_change_password = false,
    status = 'active',
    login_attempts = 0,
    locked_until = NULL,
    last_password_change = NOW()
WHERE lower(email) = lower('${safeEmail}');

Должно ответить UPDATE 1. Если UPDATE 0 — адрес не совпал, вернитесь к шагу 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ШАГ 3. Входить с этими данными:

   Логин:  ${email}
   Пароль: ${password}

Менять пароль при входе не потребуется.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
