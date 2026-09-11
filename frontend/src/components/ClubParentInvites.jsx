// frontend/src/components/ClubParentInvites.jsx
//
// Выпуск приглашений родителям сразу по всему КЮДу.
//
// По одному приглашению на участника — это два десятка ссылок руками в
// клубе средней величины и около девятисот по всему движению. Здесь
// руководитель получает готовый список «ребёнок → ссылка для родителя»:
// его можно выгрузить в Excel, скопировать или распечатать и раздать.
//
// Ссылки показываются один раз: в базе лежит только их отпечаток.

import { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import Icon from './Icon';

export default function ClubParentInvites({ clubId, clubName, onDone }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const issue = async () => {
    if (!window.confirm(
      `Выпустить приглашения родителям всех участников КЮДа${clubName ? ` «${clubName}»` : ''}?\n\n` +
      'Тем, у кого законный представитель уже привязан, приглашение не выпускается.'
    )) return;

    setBusy(true);
    setMessage('');
    try {
      const data = await api.createClubParentInvitations(clubId);
      if (data?.error) {
        setMessage(api.describeApiError(data, 'Не удалось выпустить приглашения'));
        setMessageType('error');
      } else {
        setResult(data);
        setMessage(
          data.issued?.length
            ? `Выпущено приглашений: ${data.issued.length}. Сохраните список — ссылки показываются один раз.`
            : 'Выпускать нечего: у всех участников уже привязан законный представитель.'
        );
        setMessageType(data.issued?.length ? 'success' : 'error');
        if (onDone) onDone();
      }
    } catch (err) {
      console.error('❌ Ошибка выпуска приглашений:', err);
      setMessage('Не удалось выпустить приглашения');
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  };

  const toExcel = () => {
    if (!result?.issued?.length) return;
    const rows = result.issued.map((i) => ({
      'Участник': i.child_name,
      'Родитель (из карточки)': i.parent_hint || '—',
      'Телефон родителя': i.parent_phone || '—',
      'Ссылка для родителя': `${origin}${i.path}`,
      'Действует до': new Date(i.expires_at).toLocaleString('ru-RU')
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 32 }, { wch: 30 }, { wch: 20 }, { wch: 70 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Приглашения');
    const safeName = (result.club_name || 'КЮД').replace(/[\\/:*?"<>|]/g, '');
    XLSX.writeFile(wb, `Приглашения родителям — ${safeName}.xlsx`);
  };

  const copyAll = async () => {
    if (!result?.issued?.length) return;
    const text = result.issued
      .map((i) => `${i.child_name}\n${origin}${i.path}\n`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Список скопирован');
      setMessageType('success');
    } catch {
      setMessage('Буфер обмена недоступен — выгрузите файл', 'error');
      setMessageType('error');
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3 className="card-title">Приглашения родителям</h3>
        <button className="btn-primary btn-sm" onClick={issue} disabled={busy}>
          <Icon name="mail" size={14} />
          {busy ? 'Выпускаем...' : 'Выпустить на весь КЮД'}
        </button>
      </div>

      {message && (
        <div className={`message ${messageType === 'error' ? 'message-error' : 'message-success'}`}>
          {message}
        </div>
      )}

      {!result && (
        <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', lineHeight: 1.6, margin: 0 }}>
          Согласия за участников оформляют их родители, и для этого у каждого должен быть
          свой вход. Кнопка выпустит ссылки сразу на всех, у кого представитель ещё не
          привязан, — останется разослать список. Почты платформа не отправляет, поэтому
          ссылки передаются вручную.
        </p>
      )}

      {result?.issued?.length > 0 && (
        <>
          <div className="btn-group" style={{ marginBottom: '14px' }}>
            <button className="btn-gold" onClick={toExcel}>
              <Icon name="download" size={15} />
              Выгрузить в Excel
            </button>
            <button className="btn-outline" onClick={copyAll}>Скопировать списком</button>
          </div>

          <div className="message message-warning">
            Ссылки показываются один раз — в базе хранится только их отпечаток. Если список
            потеряется, приглашения выпускаются заново, это нормально.
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Участник</th>
                  <th>Родитель из карточки</th>
                  <th>Ссылка</th>
                </tr>
              </thead>
              <tbody>
                {result.issued.map((i) => (
                  <tr key={i.participant_id}>
                    <td>{i.child_name}</td>
                    <td>{i.parent_hint || '—'}</td>
                    <td style={{
                      fontSize: '12px',
                      wordBreak: 'break-all',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                    }}>
                      {origin}{i.path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {result?.skipped?.length > 0 && (
        <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '12px', lineHeight: 1.6 }}>
          Пропущено — представитель уже привязан: {result.skipped.map((s) => s.full_name).join(', ')}.
        </div>
      )}
    </div>
  );
}
