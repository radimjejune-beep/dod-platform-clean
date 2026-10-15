// frontend/src/lib/events.js
//
// Общие мелочи для мероприятий: даты для полей ввода и статус карточки.

// Сервер отдаёт колонку date как '2026-10-15T00:00:00.000Z', а поле
// <input type="date"> принимает только '2026-10-15'. С полным значением
// поле показывалось пустым, и при правке мероприятия даты приходилось
// вводить заново — иначе сохранение падало на проверке даты.
export function toDateInput(value) {
  if (!value) return '';
  const text = String(value);
  // Уже «год-месяц-день» — отдаём как есть
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  // Со временем: берём день по часовому поясу браузера, а не первые 10
  // символов. Полночь сервера в UTC или в Москве — это один и тот же день
  // для человека, а первые 10 символов в одном из случаев дают вчера.
  const d = new Date(text);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Статус карточки. Раньше одни страницы читали events.status (в базе у
// него по умолчанию «на модерации»), другие — moderation_status (по
// умолчанию «одобрено»). Из-за этого в блоке клуба всё висело «на
// модерации» навсегда. Источник один: moderation_status.
export function eventStatus(event) {
  if (event?.is_completed) return 'completed';
  return event?.moderation_status || 'approved';
}

export const EVENT_STATUS_BADGES = {
  pending: { label: 'Ждёт одобрения', color: 'var(--color-gold-dark)', bg: 'var(--color-gold-pale)' },
  approved: { label: 'Одобрено', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  rejected: { label: 'Отклонено', color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
  completed: { label: 'Завершено', color: 'var(--color-gray-500)', bg: 'var(--color-gray-100)' }
};

// Сегодняшний день «год-месяц-день» по часовому поясу браузера
function todayInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Прошло ли мероприятие: завершено вручную или последний день уже позади
export function isPastEvent(event) {
  if (!event) return false;
  if (event.is_completed) return true;
  const last = toDateInput(event.end_date || event.event_date);
  return Boolean(last) && last < todayInput();
}

// «Приём заявок до 20.10» — это весь день 20.10 включительно
export function isDeadlinePassed(event) {
  const deadline = toDateInput(event?.registration_deadline);
  return Boolean(deadline) && deadline < todayInput();
}
