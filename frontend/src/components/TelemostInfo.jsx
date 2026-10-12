// frontend/src/components/TelemostInfo.jsx
//
// Отметка «можно подключиться по Телемосту» в карточке мероприятия.
// Один компонент на все места, где показываются мероприятия, чтобы
// отметка выглядела одинаково и проверка ссылки была одна.

import Icon from './Icon';

// Показываем ссылкой только https-адрес. Всё остальное (в том числе
// javascript:...) — не ссылка: так через поле нельзя подсунуть
// вредоносный адрес, даже если он как-то попал в базу в обход сервера.
const isSafeUrl = (url) => typeof url === 'string' && /^https:\/\/\S+$/.test(url.trim());

export default function TelemostInfo({ event, style = {} }) {
  if (!event?.telemost_allowed) return null;

  const hasLink = isSafeUrl(event.telemost_url);

  return (
    <div
      className="telemost-info"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px',
        padding: '6px 12px',
        borderRadius: '6px',
        background: 'var(--color-gray-50)',
        border: '1px solid var(--color-gray-200)',
        fontSize: '13px',
        color: 'var(--color-primary-dark)',
        ...style
      }}
    >
      <Icon name="video" size={16} />
      {hasLink ? (
        <>
          <span>Можно подключиться по Телемосту:</span>
          <a href={event.telemost_url.trim()} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
            подключиться
          </a>
        </>
      ) : (
        <span>Можно подключиться по Телемосту — ссылка появится позже</span>
      )}
    </div>
  );
}
