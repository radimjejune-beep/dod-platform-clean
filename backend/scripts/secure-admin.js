// backend/scripts/secure-admin.js
//
// Разовый скрипт. Делает две вещи:
//   1. Показывает все учётные записи с админскими правами
//   2. Обезвреживает тестового администратора newadmin@dod.ru, который
//      раньше создавался открытым эндпоинтом /api/create-test-user
//      с паролем 123456
//
// Запуск из папки backend:
//   DATABASE_URL="строка_подключения" node scripts/secure-admin.js
//
// По умолчанию только показывает, что найдено, и ничего не меняет.
// Чтобы применить изменения, добавьте --apply:
//   DATABASE_URL="..." node scripts/secure-admin.js --apply

import crypto from 'crypto';
import { Pool } from 'pg';

const APPLY = process.argv.includes('--apply');
const TEST_ADMIN_EMAIL = 'newadmin@dod.ru';

if (!process.env.DATABASE_URL) {
  console.error('❌ Не задана DATABASE_URL.');
  console.error('   Возьмите строку подключения в панели RelaxDev и запустите так:');
  console.error('   DATABASE_URL="postgresql://..." node scripts/secure-admin.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function randomPassword(length = 20) {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

async function main() {
  console.log(APPLY ? '⚙️  РЕЖИМ: применяю изменения\n' : '👀 РЕЖИМ: только смотрю, ничего не меняю\n');

  // ---------- 1. Кто имеет админские права ----------
  const admins = await pool.query(
    `SELECT id, email, full_name, role, status, created_at
     FROM users
     WHERE role IN ('admin', 'movement_coordinator')
     ORDER BY role, created_at`
  );

  console.log(`🔑 Учётных записей с админскими правами: ${admins.rows.length}`);
  for (const u of admins.rows) {
    const created = new Date(u.created_at).toLocaleDateString('ru-RU');
    console.log(`   • ${u.email.padEnd(32)} ${u.role.padEnd(22)} ${u.status || '—'}   создан ${created}   ${u.full_name}`);
  }
  console.log('\n   Проверьте список: если тут есть кто-то незнакомый — это след взлома.\n');

  // ---------- 2. Тестовый администратор ----------
  const test = await pool.query(
    'SELECT id, email, full_name, status FROM users WHERE email = $1',
    [TEST_ADMIN_EMAIL]
  );

  if (test.rows.length === 0) {
    console.log(`✅ Учётной записи ${TEST_ADMIN_EMAIL} в базе нет — обезвреживать нечего.`);
  } else {
    const user = test.rows[0];
    console.log(`⚠️  Найдена тестовая учётная запись ${TEST_ADMIN_EMAIL} (${user.full_name}), статус: ${user.status || '—'}`);
    console.log('   У неё был известный пароль 123456 и полные права администратора.');

    if (!APPLY) {
      console.log('\n   Чтобы заблокировать её и сменить пароль, запустите ту же команду с --apply\n');
    } else {
      const bcrypt = (await import('bcrypt')).default;
      const newPassword = randomPassword();
      const hash = await bcrypt.hash(newPassword, 12);

      await pool.query(
        `UPDATE users
         SET password_hash = $1,
             must_change_password = true,
             status = 'inactive',
             login_attempts = 0,
             locked_until = NULL,
             last_password_change = NOW()
         WHERE id = $2`,
        [hash, user.id]
      );

      console.log('\n   ✅ Учётная запись заблокирована (status = inactive), пароль заменён на случайный.');
      console.log(`   Новый пароль (запишите, если планируете ей пользоваться): ${newPassword}`);
      console.log('   Если она не нужна вообще — удалите её через интерфейс: Админ → Пользователи.\n');
    }
  }

  // ---------- 3. Следы использования открытого эндпоинта ----------
  try {
    const logs = await pool.query(
      `SELECT al.action, al.created_at, u.email
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE u.email = $1
       ORDER BY al.created_at DESC
       LIMIT 20`,
      [TEST_ADMIN_EMAIL]
    );

    if (logs.rows.length === 0) {
      console.log('✅ В журнале действий нет ни одной записи под этой учётной записью.');
      console.log('   Похоже, ею никто не пользовался.');
    } else {
      console.log(`🚨 В журнале ${logs.rows.length} действий под ${TEST_ADMIN_EMAIL} — покажите этот список разработчику:`);
      for (const l of logs.rows) {
        console.log(`   • ${new Date(l.created_at).toLocaleString('ru-RU')}  ${l.action}`);
      }
    }
  } catch (error) {
    console.log('ℹ️  Не удалось прочитать журнал действий:', error.message);
  }

  console.log('');
}

main()
  .catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
