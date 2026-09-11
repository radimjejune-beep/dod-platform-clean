// frontend/src/components/ParentCodeCard.jsx
//
// Код, который участник передаёт своему родителю.
//
// Основной путь — приглашение от руководителя КЮДа. Этот код нужен на
// случай, когда руководитель недоступен: участник открывает профиль,
// нажимает кнопку и диктует родителю восемь символов. Код живёт сутки и
// становится недействительным сразу после того, как им воспользовались.
//
// Пароль участника родителю не нужен и никогда не передаётся.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import Icon from './Icon';

export default function ParentCodeCard() {
  const [state, setState] = useState({ active: null, parent_name: null });
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setState(await api.getMyParentCode());
    } catch (err) {
      console.error('❌ Ошибка получения кода для родителя:', err);
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api.createMyParentCode();
      if (result?.error) setMessage(api.describeApiError(result, 'Не удалось создать код'));
      else { setCode(result); setCopied(false); await load(); }
    } catch (err) {
      console.error('❌ Ошибка создания кода:', err);
      setMessage('Не удалось создать код');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage('Скопируйте код вручную — он показан выше');
    }
  };

  if (loading) return null;

  if (state.parent_name) {
    return (
      <div className="info-box" style={{ marginTop: '16px' }}>
        <Icon name="success" size={16} /> Ваш законный представитель{' '}
        <strong>{state.parent_name}</strong> уже привязан — согласия оформляет он.
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div className="card-header">
        <h3 className="card-title">Код для родителя</h3>
        {!code && (
          <button className="btn-outline btn-sm" onClick={create} disabled={busy}>
            <Icon name="key" size={14} />
            {state.active ? 'Выпустить новый код' : 'Получить код'}
          </button>
        )}
      </div>

      {message && <div className="message message-error">{message}</div>}

      <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', lineHeight: 1.6, margin: 0 }}>
        Согласия на обработку ваших данных вправе дать только родитель или опекун.
        Передайте ему этот код — он заведёт свой кабинет и оформит согласия.
        Свой пароль сообщать не нужно.
      </p>

      {code && (
        <div style={{
          marginTop: '14px',
          padding: '16px',
          background: 'var(--color-gold-pale)',
          border: '1px solid var(--color-gold-light)',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '26px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--color-primary)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}>
            {code.code}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: '8px' }}>
            Действует до {new Date(code.expires_at).toLocaleString('ru-RU')}.
            Родитель вводит его на странице «Кабинет законного представителя».
          </div>
          <button className="btn-outline btn-sm" style={{ marginTop: '12px' }} onClick={copy}>
            <Icon name={copied ? 'check' : 'save'} size={14} />
            {copied ? 'Скопировано' : 'Скопировать код'}
          </button>
        </div>
      )}

      {!code && state.active && (
        <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '12px', lineHeight: 1.5 }}>
          Код уже выпущен {new Date(state.active.created_at).toLocaleString('ru-RU')} и действует до{' '}
          {new Date(state.active.expires_at).toLocaleString('ru-RU')}. Показать его повторно нельзя —
          в базе хранится только отпечаток. Если код потерялся, выпустите новый.
        </div>
      )}
    </div>
  );
}
