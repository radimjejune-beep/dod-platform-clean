// frontend/src/pages/ParentJoin.jsx
//
// Приём приглашения родителем. Страница открыта без авторизации: сюда
// приходят по ссылке из мессенджера.
//
// Почему именно так. Согласие за несовершеннолетнего вправе дать только
// законный представитель — значит, у родителя должна быть собственная
// учётная запись, а не общая с ребёнком. Раньше родитель «привязывал»
// ребёнка, вводя пароль ребёнка; теперь родитель заводит свой пароль, а
// связь с участником берётся из приглашения.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Icon from '../components/Icon';
import logo from '../assets/Image.png';

export default function ParentJoin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Токен приходит ссылкой; если человек открыл страницу руками —
  // он вводит код, который ему продиктовал ребёнок
  const [token, setToken] = useState(params.get('token') || '');
  const [checked, setChecked] = useState(null);
  const [checking, setChecking] = useState(Boolean(params.get('token')));
  const [error, setError] = useState('');

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', repeat: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.get('token')) verify(params.get('token'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (value) => {
    const clean = String(value || '').trim();
    if (!clean) {
      setError('Введите код приглашения');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const result = await api.checkParentInvitation(clean);
      if (result?.error) {
        setChecked(null);
        setError(result.error);
      } else {
        setChecked(result);
        setToken(clean);
        setForm((f) => ({
          ...f,
          full_name: f.full_name || result.parent_hint?.full_name || '',
          email: f.email || result.parent_hint?.email || '',
          phone: f.phone || result.parent_hint?.phone || ''
        }));
      }
    } catch (err) {
      console.error('❌ Ошибка проверки приглашения:', err);
      setError('Не удалось проверить приглашение. Проверьте соединение.');
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }
    if (form.password !== form.repeat) {
      setError('Пароли не совпадают');
      return;
    }

    setSaving(true);
    try {
      const result = await api.acceptParentInvitation({
        token,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password
      });
      if (result?.error) {
        setError(api.describeApiError(result, 'Не удалось создать учётную запись'));
      } else {
        // Сервер вернул токен — сразу ведём туда, ради чего всё затевалось
        navigate('/parent-consents');
      }
    } catch (err) {
      console.error('❌ Ошибка приёма приглашения:', err);
      setError('Не удалось создать учётную запись');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src={logo} alt="Дипломаты будущего" style={{ height: '56px' }} />
        </div>

        <div className="card">
          <h1 className="page-title" style={{ fontSize: '22px', marginBottom: '8px' }}>
            Кабинет законного представителя
          </h1>
          <p className="page-subtitle" style={{ marginBottom: '20px' }}>
            Согласие на обработку данных несовершеннолетнего вправе дать только его
            родитель или опекун. Для этого нужна отдельная учётная запись — её вы
            сейчас и создаёте.
          </p>

          {error && <div className="message message-error">{error}</div>}

          {/* ===== Шаг 1: проверить приглашение ===== */}
          {!checked && (
            <>
              <div className="form-group">
                <label className="form-label">Код приглашения</label>
                <input
                  className="form-control"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Например, ABCD-2345"
                  autoFocus
                />
                <span className="form-hint">
                  Код или ссылку присылает руководитель КЮДа. Если его нет под рукой,
                  код можно взять у ребёнка в его профиле.
                </span>
              </div>
              <button className="btn-primary w-full" disabled={checking} onClick={() => verify(token)}>
                {checking ? 'Проверяем...' : 'Продолжить'}
              </button>
            </>
          )}

          {/* ===== Шаг 2: завести учётную запись ===== */}
          {checked && (
            <form onSubmit={submit}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '14px',
                marginBottom: '20px',
                background: 'var(--color-info-bg)',
                border: '1px solid rgba(23, 74, 126, 0.18)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <span style={{ display: 'inline-flex', color: 'var(--color-info)' }}>
                  <Icon name="user" size={20} />
                </span>
                <div style={{ fontSize: '14px', color: 'var(--color-gray-700)', lineHeight: 1.5 }}>
                  Вы становитесь законным представителем участника{' '}
                  <strong>{checked.child_name}</strong>
                  {checked.club_name ? `, ${checked.club_name}` : ''}.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ваши фамилия, имя и отчество<span className="required">*</span></label>
                <input
                  className="form-control"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  placeholder="Иванова Мария Петровна"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Электронная почта<span className="required">*</span></label>
                <input
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="mail@example.ru"
                />
                <span className="form-hint">По этому адресу вы будете входить в кабинет.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Телефон</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+7 900 000-00-00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Пароль<span className="required">*</span></label>
                <input
                  className="form-control"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <span className="form-hint">Не короче 8 символов. Это ваш пароль, не пароль ребёнка.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Повторите пароль<span className="required">*</span></label>
                <input
                  className="form-control"
                  type="password"
                  value={form.repeat}
                  onChange={(e) => setForm({ ...form, repeat: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button className="btn-primary w-full" type="submit" disabled={saving}>
                {saving ? 'Создаём кабинет...' : 'Создать кабинет и перейти к согласиям'}
              </button>
            </form>
          )}

          <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px' }}>
            <Link to="/login" className="btn-link">Уже есть учётная запись — войти</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
