// frontend/src/components/ApiFailureBanner.jsx
//
// Полоса внизу экрана: сервер ответил ошибкой, и то, что вы видите на
// странице, — неполное. Одна на всё приложение.
//
// Тон намеренно спокойный и без технических подробностей: человеку
// важно знать, что пустой список — это не «никого нет», а «не
// загрузилось». Код ответа оставлен мелким шрифтом: с ним можно прийти
// к тому, кто чинит.

import { useEffect, useState } from 'react';
import { subscribeApiFailures } from '../lib/apiStatus';
import Icon from './Icon';

export default function ApiFailureBanner() {
  const [failure, setFailure] = useState(null);

  useEffect(() => subscribeApiFailures(setFailure), []);

  if (!failure) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: '16px', right: '16px', bottom: '16px',
        zIndex: 1200, maxWidth: '560px', margin: '0 auto',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        padding: '14px 16px',
        background: 'var(--color-white, #fff)',
        border: '1px solid var(--color-error, #B3261E)',
        borderLeft: '4px solid var(--color-error, #B3261E)',
        borderRadius: 'var(--radius-sm, 8px)',
        boxShadow: '0 6px 24px rgba(7, 20, 38, 0.18)'
      }}
    >
      <span style={{ color: 'var(--color-error, #B3261E)', display: 'flex', marginTop: '1px' }}>
        <Icon name="warning" size={18} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
          Не удалось загрузить {failure.label}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', marginTop: '3px' }}>
          {failure.detail
            ? failure.detail
            : 'Сервер ответил ошибкой, поэтому на странице может быть пусто или неполно.'}
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-light)',
              textDecoration: 'underline'
            }}
          >
            Обновить страницу
          </button>
          <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
            ошибка {failure.status}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFailure(null)}
        aria-label="Скрыть"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-gray-400)', display: 'flex', padding: '2px'
        }}
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
