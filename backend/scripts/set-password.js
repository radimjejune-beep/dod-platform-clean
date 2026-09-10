// backend/scripts/set-password.js
//
// Ставит пользователю известный пароль напрямую в базе, минуя интерфейс.
// Нужен, когда интерфейс показывает неверный пароль и войти невозможно.
//
// Запуск из папки backend:
//   DATABASE_URL="строка_подключения" node scripts/set-password.js почта@пример.ру
//
// Пароль будет сгенерирован и показан. Можно задать свой вторым аргументом:
//   DATABASE_URL="..." node scripts/set-password.js почта@пример.ру МойПароль123

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const [, , email, providedPassword] = process.argv;

if (!process.env.DATABASE_URL) {
  console.error('❌ Не задана DATABASE_URL.');
  console.error('   DATABASE_URL="postgresql://..." node scripts/set-password.js почта@пример.ру');
  process.exit(1);
}

if (!email) {
  console.error('❌ Не указана почта.');
  console.error('   DATABASE_URL="..." node scripts/set-password.js почта@пример.ру');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

async function main() {
  const found = await pool.query(
    'SELECT id, email, full_name, role, status FROM users WHERE lower(email) = lower($1)',
    [email]
  );

  if (found.rows.length === 0) {
    console.log(`❌ Пользователь с почтой ${email} не найден.\n`);

    // Сервер дописывает к занятому адресу случайные цифры — покажем похожие
    const base = email.split('@')[0].replace(/\d+$/, '');
    const similar = await pool.query(
      `SELECT email, full_name, role FROM users
       WHERE email ILIKE $1 ORDER BY created_at DESC LIMIT 10`,
      [`${base}%`]
    );

    if (similar.rows.length > 0) {
      console.log('   Похожие адреса в базе — возможно, нужен один из них:');
      for (const u of similar.rows) {
        console.log(`   • ${u.email.padEnd(38)} ${u.role.padEnd(22)} ${u.full_name}`);
      }
      console.log('\n   Запустите скрипт заново с нужным адресом.\n');
    }
    return;
  }

  const user = found.rows[0];
  const password = providedPassword || generatePassword();
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         must_change_password = false,
         status = 'active',
         login_attempts = 0,
         locked_until = NULL,
         last_password_change = NOW()
     WHERE id = $2`,
    [hash, user.id]
  );

  console.log('\n✅ Пароль установлен.\n');
  console.log(`   Пользователь: ${user.full_name}`);
  console.log(`   Роль:         ${user.role}`);
  console.log(`   Логин:        ${user.email}`);
  console.log(`   Пароль:       ${password}`);
  console.log('\n   Входите с этими данными. Менять пароль при входе не потребуется.\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
