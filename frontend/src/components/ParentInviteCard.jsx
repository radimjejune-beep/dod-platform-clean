// frontend/src/components/ParentInviteCard.jsx
//
// Блок «Законный представитель» в карточке участника.
//
// Руководитель КЮДа видит, привязан ли к участнику родитель, и может
// выпустить приглашение. Ссылка показывается один раз — в базе лежит
// только хеш токена, восстановить её нельзя, можно выпустить новую.
//
// Почтовой рассылки в платформе нет, поэтому ссылку руководитель
// отправляет сам: копирует кнопкой и шлёт родителю в мессенджер.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import Icon from './Icon';

export default function ParentInviteCard({ participantId, participantName }) {
  const [data, setData] = useState({ invitations: [], parents: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);   // выпущенная ссылка, показывается один раз
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => { load(); }, [participantId]);

  const load = async () => {
    try {
      const result = await api.getParentInvitations(participantId);
      setData({
        invitations: Array.isArray(result?.invitations) ? result.invitations : [],
        parents: Array.isArray(result?.parents) ? result.parents : []
      });
    } catch (err) {
      console.error('❌ Ошибка загрузки приглашений родителя:', err);
    } finally {
      setLoading(false);
    }
  };

  const show = (text, type = 'success') => { setMessage(text); setMessageType(type); };

  const invite = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api.createParentInvitation(participantId);
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось создать приглашение'), 'error');
      } else {
        // Ссылку собираем из адреса, на котором открыт фронтенд
        setIssued({
          url: `${window.location.origin}${result.path}`,
          code: result.token,
          expires_at: result.expires_at
        });
        setCopied(false);
        await load();
      }
    } catch (err) {
      console.error('❌ Ошибка создания приглашения:', err);
      show('Не удалось создать приглашение', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    setBusy(true);
    try {
      const result = await api.revokeParentInvitation(id);
      if (result?.error) show(api.describeApiError(result, 'Не удалось отозвать'), 'error');
      else { show('Приглашение отозвано'); setIssued(null); await load(); }
    } catch (err) {
      console.error('❌ Ошибка отзыва приглашения:', err);
      show('Не удалось отозвать приглашение', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // В некоторых браузерах буфер обмена недоступен — ссылка и так на экране
      show('Скопируйте ссылку вручную — она показана выше', 'error');
    }
  };

  if (loading) return null;

  const parent = data.parents[0] || null;
  const active = data.invitations.find((i) => i.is_active) || null;

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3 className="card-title">Законный представитель</h3>
        {!parent && !active && (
          <button className="btn-primary btn-sm" onClick={invite} disabled={busy}>
            <Icon name="mail" size={14} />
            Пригласить родителя
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${messageType === 'error' ? 'message-error' : 'message-success'}`}>
          {message}
        </div>
      )}

      {parent && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', color: 'var(--color-success)' }}>
            <Icon name="success" size={20} />
          </span>
          <div style={{ fontSize: '14px', color: 'var(--color-gray-700)', lineHeight: 1.5 }}>
            <strong>{parent.full_name}</strong>
            <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
              {parent.email} · привязан {new Date(parent.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
        </div>
      )}

      {!parent && !active && !issued && (
        <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', lineHeight: 1.6, margin: 0 }}>
          Родитель не привязан, поэтому согласия за участника дать некому и
          {participantName ? ` ${participantName}` : ' участник'} не сможет поехать на мероприятия.
          Нажмите «Пригласить родителя» — система выдаст ссылку, её нужно отправить
          родителю в мессенджере.
        </p>
      )}

      {issued && (
        <div style={{
          marginTop: '12px',
          padding: '14px',
          background: 'var(--color-gold-pale)',
          border: '1px solid var(--color-gold-light)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-gray-700)', marginBottom: '10px', lineHeight: 1.5 }}>
            Отправьте эту ссылку родителю. Она показывается один раз и действует до{' '}
            {new Date(issued.expires_at).toLocaleString('ru-RU')}.
          </div>
          <div style={{
            padding: '10px 12px',
            background: 'var(--color-white)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            wordBreak: 'break-all',
            color: 'var(--color-gray-700)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}>
            {issued.url}
          </div>
          <div className="btn-group" style={{ marginTop: '10px' }}>
            <button className="btn-outline btn-sm" onClick={copy}>
              <Icon name={copied ? 'check' : 'save'} size={14} />
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </button>
          </div>
        </div>
      )}

      {!parent && active && !issued && (
        <div style={{ marginTop: '4px' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
            Приглашение отправлено {new Date(active.created_at).toLocaleDateString('ru-RU')}
            {active.created_by_name ? ` (${active.created_by_name})` : ''} и действует до{' '}
            {new Date(active.expires_at).toLocaleString('ru-RU')}. Родитель им ещё не воспользовался.
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '6px' }}>
            Саму ссылку показать повторно нельзя — в базе хранится только её отпечаток.
            Если ссылка потерялась, отзовите приглашение и выпустите новое.
          </div>
          <div className="btn-group" style={{ marginTop: '12px' }}>
            <button className="btn-danger-soft btn-sm" onClick={() => revoke(active.id)} disabled={busy}>
              Отозвать и выпустить новое
            </button>
          </div>
        </div>
      )}

      {data.invitations.length > 0 && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{ fontSize: '13px', color: 'var(--color-gray-500)', cursor: 'pointer' }}>
            История приглашений ({data.invitations.length})
          </summary>
          <div className="table-wrapper" style={{ marginTop: '10px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Выпущено</th>
                  <th>Кем</th>
                  <th>Источник</th>
                  <th>Состояние</th>
                </tr>
              </thead>
              <tbody>
                {data.invitations.map((i) => (
                  <tr key={i.id}>
                    <td>{new Date(i.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>{i.created_by_name || '—'}</td>
                    <td>{i.source === 'child' ? 'код от участника' : 'руководитель КЮДа'}</td>
                    <td>
                      {i.used_at
                        ? <span className="badge badge-success badge-dot">принято{i.used_by_name ? `: ${i.used_by_name}` : ''}</span>
                        : i.revoked_at
                          ? <span className="badge badge-neutral">отозвано</span>
                          : i.is_active
                            ? <span className="badge badge-warning badge-dot">ждёт родителя</span>
                            : <span className="badge badge-neutral">истекло</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
