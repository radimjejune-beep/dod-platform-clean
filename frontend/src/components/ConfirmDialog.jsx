// frontend/src/components/ConfirmDialog.jsx
//
// Подтверждение действия окном платформы, а не окном браузера.
//
// По проекту рассыпано около полусотни вызовов confirm() и prompt().
// Это плохо по трём причинам:
//   * окно браузера выглядит чужим и обрывает оформление платформы;
//   * в нём нельзя объяснить последствия — только одна строка;
//   * prompt() для комментария координатора особенно неудачен: самое
//     важное сообщение клубу набирается в серой системной строке, где
//     не видно ни отчёта, ни того, что уже написано.
//
// commentLabel превращает диалог в форму с полем: так «вернуть на
// доработку» и «отклонить» получают нормальный текст причины.

import { useEffect, useState } from 'react';

export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  tone = 'primary',
  commentLabel = null,
  commentPlaceholder = '',
  commentRequired = false,
  busy = false,
  onConfirm,
  onCancel
}) {
  const [comment, setComment] = useState('');

  // Поле очищается при каждом открытии: иначе прошлая причина отказа
  // подставится следующему клубу
  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const blocked = busy || (commentRequired && !comment.trim());

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(7, 20, 38, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '470px', width: '100%', padding: '24px' }}
      >
        <h3 style={{
          margin: '0 0 8px 0', fontSize: '19px',
          color: 'var(--color-primary-dark)'
        }}>
          {title}
        </h3>

        {text && (
          <p style={{
            margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.6,
            color: 'var(--color-gray-600)'
          }}>
            {text}
          </p>
        )}

        {commentLabel && (
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">
              {commentLabel}{commentRequired && ' *'}
            </label>
            <textarea
              className="form-input"
              rows="4"
              autoFocus
              value={comment}
              placeholder={commentPlaceholder}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            disabled={blocked}
            onClick={() => onConfirm?.(comment.trim())}
          >
            {busy ? 'Выполняем…' : confirmLabel}
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
