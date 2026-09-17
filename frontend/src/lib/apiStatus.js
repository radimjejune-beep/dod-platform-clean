// frontend/src/lib/apiStatus.js
//
// Канал отказов сервера.
//
// В api.js почти полсотни функций написаны так:
//
//     if (!response.ok) return [];
//
// Пустой массив уходит на экран, и сломанный запрос выглядит ровно так
// же, как честно пустой список. Именно поэтому месяцами жили: тьютор,
// который «не видит своих детей», руководитель, у которого «пустой
// клуб», дашборд с нулями. Ни одна страница ни разу не сказала, что
// сервер ответил ошибкой.
//
// Переписывать полсотни вызовов на исключения нельзя: их ловят не
// везде, и вместо пустого списка человек увидит белый экран — мы это
// уже проходили на «Достижениях». Поэтому пустое значение возвращается
// по-прежнему, но об отказе теперь узнаёт общий канал, а показывает его
// одна полоса внизу экрана.

const listeners = new Set();

// Один и тот же отказ прилетает по нескольку раз: страница грузит
// список, потом перезагружает его после действия. Повторы в пределах
// десяти секунд не показываем — иначе полоса мигает.
const recent = new Map();
const REPEAT_MS = 10000;

export function subscribeApiFailures(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyApiFailure(failure) {
  const key = `${failure.status}:${failure.url}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < REPEAT_MS) return;
  recent.set(key, now);

  for (const listener of listeners) {
    try {
      listener(failure);
    } catch {
      // Слушатель не должен мешать запросу, который его вызвал
    }
  }
}

// Человеческое название того, что не загрузилось. Без него сообщение
// звучит как «ошибка 500» и не говорит ничего.
const LABELS = [
  ['event-tutor-assignments', 'назначения тьюторов'],
  ['tutor-invitations', 'приглашения тьюторов'],
  ['tutor-requests', 'запросы тьюторов'],
  ['team-submissions', 'команды на выезд'],
  ['club-sessions', 'занятия клуба'],
  ['my-delegations', 'делегации'],
  ['delegations', 'делегации'],
  ['my-trips', 'выезды'],
  ['participants', 'список участников'],
  ['achievements', 'достижения'],
  ['attachments', 'файлы'],
  ['notifications', 'уведомления'],
  ['consents', 'согласия'],
  ['documents', 'документы'],
  ['appeals', 'обращения'],
  ['reports', 'отчёты'],
  ['events', 'мероприятия'],
  ['clubs', 'список КЮДов'],
  ['users', 'пользователей'],
  ['search', 'результаты поиска'],
  ['news', 'новости'],
  ['goals', 'цели'],
  ['tasks', 'задачи'],
];

export function labelForUrl(url) {
  const path = String(url || '');
  for (const [part, label] of LABELS) {
    if (path.includes(`/${part}`)) return label;
  }
  return 'данные';
}
