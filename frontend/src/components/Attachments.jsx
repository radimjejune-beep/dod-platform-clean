// frontend/src/components/Attachments.jsx
//
// Файлы, приложенные к записи: к документу движения, к обращению.
//
// До этого загрузить в платформу можно было только аватар и картинку к
// новости. Методичку, положение или скан приложить было некуда — и разговор
// уходил в мессенджер вместе со всем остальным.
//
// Компонент один на все виды записей: ownerType говорит серверу, к чему
// привязан файл, права проверяются по самой записи.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import Icon from './Icon';

const MAX_BYTES = 15 * 1024 * 1024;

// Что вообще можно загрузить — список тот же, что проверяет сервер
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.rtf,'
  + '.txt,.csv,.jpg,.jpeg,.png,.webp,.heic,.zip';

function humanSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

// Иконка по расширению: таблицу и архив видно до того, как
// человек дочитает имя файла
function iconFor(fileName) {
  const ext = String(fileName || '').split('.').pop().toLowerCase();
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'chart';
  if (ext === 'zip') return 'archive';
  return 'document';
}

export default function Attachments({ ownerType, ownerId, canManage = true, compact = false }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    if (ownerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId]);

  const load = async () => {
    setFiles(await api.getAttachments(ownerType, ownerId));
  };

  const pick = async (event) => {
    const chosen = Array.from(event.target.files || []);
    event.target.value = '';
    if (chosen.length === 0) return;

    setError('');
    setBusy(true);
    try {
      for (const file of chosen) {
        // Проверяем размер до отправки: иначе человек ждёт загрузку
        // пятидесяти мегабайт ради отказа сервера
        if (file.size > MAX_BYTES) {
          setError(`«${file.name}» больше 15 МБ — такой файл загрузить нельзя`);
          continue;
        }
        await api.uploadAttachment(ownerType, ownerId, file);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Не удалось загрузить файл');
    } finally {
      setBusy(false);
    }
  };

  const download = async (file) => {
    try {
      await api.downloadAttachment(file.id, file.file_name);
    } catch (err) {
      setError(err.message || 'Не удалось скачать файл');
    }
  };

  const remove = async () => {
    if (!confirmRemove) return;
    setBusy(true);
    try {
      await api.deleteAttachment(confirmRemove.id);
      setConfirmRemove(null);
      await load();
    } catch (err) {
      setError(err.message || 'Не удалось удалить файл');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: compact ? '10px' : '16px' }}>
      {!compact && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', marginBottom: '10px', flexWrap: 'wrap'
        }}>
          <h4 style={{
            margin: 0, fontSize: '15px', fontWeight: 600,
            color: 'var(--color-primary-dark)'
          }}>
            Файлы {files.length > 0 && <span style={{ color: 'var(--color-gray-500)' }}>({files.length})</span>}
          </h4>
          {canManage && (
            <label className="btn-secondary btn-sm"
              style={{ cursor: busy ? 'wait' : 'pointer', margin: 0, flexShrink: 0 }}>
              {busy ? 'Загружаем…' : 'Прикрепить файл'}
              <input type="file" multiple accept={ACCEPT} onChange={pick} disabled={busy}
                style={{ display: 'none' }} />
            </label>
          )}
        </div>
      )}

      {error && (
        <div className="message-error" style={{ marginBottom: '10px' }}>{error}</div>
      )}

      {files.length === 0 && (
        <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
          {canManage
            ? 'Файлов пока нет. Подойдут PDF, Word, Excel, PowerPoint, картинки и архивы — до 15 МБ.'
            : 'Файлов нет.'}
        </div>
      )}

      {files.map((file) => (
        <div key={file.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '9px 12px', marginBottom: '6px',
          background: 'var(--color-gray-50)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <span style={{ color: 'var(--color-gray-500)', display: 'flex', marginTop: '2px', flexShrink: 0 }}>
            <Icon name={iconFor(file.file_name)} size={16} />
          </span>

          <button
            type="button"
            onClick={() => download(file)}
            title="Скачать"
            style={{
              flex: 1, minWidth: 0, textAlign: 'left', background: 'none',
              border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '13.5px', lineHeight: 1.45,
              color: 'var(--color-primary-light)', textDecoration: 'underline',
              // Имена методичек длинные и с подчёркиваниями: переносим,
              // а не режем — по обрезку файл не узнать
              whiteSpace: 'normal', overflowWrap: 'anywhere'
            }}
          >
            {file.file_name}
          </button>

          <span style={{
            fontSize: '12px', color: 'var(--color-gray-500)',
            whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px'
          }}>
            {humanSize(file.byte_size)}
          </span>

          {canManage && file.can_delete !== false && (
            <button
              type="button"
              onClick={() => setConfirmRemove(file)}
              title="Удалить файл"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-gray-400)', display: 'flex',
                padding: '2px', flexShrink: 0
              }}
            >
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
      ))}

      {compact && canManage && (
        <label className="btn-secondary btn-sm" style={{ cursor: busy ? 'wait' : 'pointer', marginTop: '6px' }}>
          {busy ? 'Загружаем…' : 'Прикрепить файл'}
          <input type="file" multiple accept={ACCEPT} onChange={pick} disabled={busy}
            style={{ display: 'none' }} />
        </label>
      )}

      {/* Подтверждение своё, а не window.confirm: системное окно
          блокирует страницу и выглядит чужим */}
      {confirmRemove && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7, 20, 38, 0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '22px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Удалить файл?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', marginBottom: '18px' }}>
              «{confirmRemove.file_name}» будет удалён без возможности восстановить.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-danger" onClick={remove} disabled={busy}>Удалить</button>
              <button className="btn-secondary" onClick={() => setConfirmRemove(null)} disabled={busy}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
