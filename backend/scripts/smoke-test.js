// backend/scripts/smoke-test.js
//
// Проверяет, что сервер отвечает на все основные адреса. Никаких данных
// не меняет — только читает.
//
// Запуск из папки backend:
//   node scripts/smoke-test.js ваша@почта.ру 'ВашПароль'
//
// Кавычки вокруг пароля обязательны, если в нём есть спецсимволы.

const API = process.env.API_URL || 'https://dod-backend.relaxdev.ru/api';
const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('❌ Укажите почту и пароль:');
  console.error("   node scripts/smoke-test.js ваша@почта.ру 'ВашПароль'");
  process.exit(1);
}

if (typeof fetch !== 'function') {
  console.error('❌ Нужен Node.js версии 18 или новее. Проверьте: node -v');
  process.exit(1);
}

const ok = (s) => s >= 200 && s < 300;
let passed = 0;
let failed = 0;
let token = null;

async function check(label, path, { method = 'GET', expect = [200], auth = true } = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const good = expect.includes(res.status);
    let extra = '';

    if (good && ok(res.status)) {
      try {
        const data = await res.json();
        if (Array.isArray(data)) extra = `${data.length} записей`;
        else if (data && typeof data === 'object') {
          if (typeof data.total_clubs === 'number') extra = `клубов: ${data.total_clubs}`;
          else if (Array.isArray(data.clubs)) extra = `клубов: ${data.clubs.length}`;
          else if (Array.isArray(data.current)) extra = `согласий: ${data.current.length}`;
        }
      } catch { /* не JSON — не страшно */ }
    } else if (!good) {
      try {
        const body = await res.json();
        extra = body.error || '';
      } catch { /* пусто */ }
    }

    console.log(
      `${good ? '✅' : '❌'} ${String(res.status).padEnd(4)} ${label.padEnd(42)} ${extra}`
    );
    good ? passed++ : failed++;
  } catch (error) {
    console.log(`❌ ---  ${label.padEnd(42)} ${error.message}`);
    failed++;
  }
}

async function main() {
  console.log(`\nПроверяю ${API}\n`);

  // ---------- Сервер вообще жив ----------
  await check('Сервер отвечает', '/test', { auth: false });

  // ---------- Вход ----------
  const login = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginData = await login.json().catch(() => ({}));

  if (!login.ok || !loginData.token) {
    console.log(`❌ ${login.status}  Вход — ${loginData.error || 'не удалось'}\n`);
    console.log('Дальше проверять нечего: без входа остальное недоступно.\n');
    process.exit(1);
  }

  token = loginData.token;
  console.log(`✅ 200  Вход — ${loginData.user.full_name}, роль ${loginData.user.role}\n`);
  passed++;

  console.log('── Разделы, сделанные раньше ──────────────────────────────────');
  await check('Мой профиль', '/me');
  await check('Пользователи', '/users');
  await check('Клубы', '/clubs');
  await check('Мероприятия', '/events');
  await check('Задачи (планировщик)', '/tasks');
  await check('Категории достижений', '/achievement-categories');
  await check('Приглашения тьюторов', '/tutor-invitations');

  console.log('\n── Согласия (миграции 003 и 004) ──────────────────────────────');
  await check('Тексты согласий', '/consent-documents');
  await check('Сводка по согласиям', '/consents-stats');
  await check('У кого нет согласий', '/consents-missing');
  await check('Мои согласия', `/consents/${loginData.user.id}`);

  console.log('\n── Сотрудники КЮДа (миграция 005) ─────────────────────────────');
  await check('Где я работаю и кем', '/my-clubs');

  console.log('\n── Команды на форумы (миграция 006) ───────────────────────────');
  await check('Мои приглашения на мероприятия', '/my-club-invitations');

  console.log('\n── Закрытые дыры: так и должно быть ───────────────────────────');
  await check('Создание админа без пароля закрыто', '/create-test-user',
    { method: 'POST', expect: [404], auth: false });

  console.log(`\n${'─'.repeat(62)}`);
  console.log(`Успешно: ${passed}   Ошибок: ${failed}\n`);

  if (failed > 0) {
    console.log('Если ошибки в разделах про согласия, сотрудников или команды —');
    console.log('скорее всего не применены миграции 003–006 в Adminer.\n');
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\n❌ Непредвиденная ошибка:', e.message, '\n');
  process.exit(1);
});
