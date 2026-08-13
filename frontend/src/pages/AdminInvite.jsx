// frontend/src/pages/AdminInvite.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function AdminInvite() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [clubs, setClubs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'club_coordinator',
    club_id: '',
    password: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      // ============================================================
      // ТОЛЬКО АДМИН И КООРДИНАТОР ДВИЖЕНИЯ
      // ============================================================
      if (userData.role !== 'admin' && userData.role !== 'movement_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      // TODO: добавить API для получения приглашений
      setInvitations([]);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSending(true);

    try {
      const password = form.password || generatePassword();

      const result = await api.createUser({
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        club_id: form.club_id || '',
        phone: '',
        school: '',
        class_name: ''
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Копируем данные в буфер обмена
      const inviteText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏛️ ДОД «Дипломаты будущего»
  Приглашение в систему
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Уважаемый(ая) ${form.full_name}!

Вас приглашают присоединиться к платформе 
Детского общественного движения «Дипломаты будущего».

Ваши данные для входа:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📧 Email: ${form.email}
  🔒 Пароль: ${password}
  👤 Роль: ${getRoleLabel(form.role)}
  ${form.club_id ? `🏫 Клуб: ${clubs.find(c => c.id === form.club_id)?.name || '—'}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Для входа перейдите по ссылке:
https://dod-frontend.relaxdev.ru/login

С уважением,
Команда ДОД «Дипломаты будущего»
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;

      await navigator.clipboard.writeText(inviteText);
      setMessage(`✅ Приглашение для "${form.full_name}" создано! Данные скопированы в буфер обмена.`);
      setMessageType('success');
      setForm({
        full_name: '',
        email: '',
        role: 'club_coordinator',
        club_id: '',
        password: ''
      });
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      'club_coordinator': '🏫 Координатор КЮДа',
      'tutor': '📚 Тьютор',
      'movement_coordinator': '⭐ Координатор движения',
      'admin': '🔧 Администратор'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>🎫</span>
          <div>
            <h1>Приглашения</h1>
            <p>Создавайте приглашения для сотрудников</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📝 Создать приглашение
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>ФИО приглашаемого *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="ivan@example.com"
                />
              </div>

              <div className="form-group">
                <label>Роль *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  required
                >
                  <option value="club_coordinator">🏫 Координатор КЮДа</option>
                  <option value="tutor">📚 Тьютор</option>
                  <option value="movement_coordinator">⭐ Координатор движения</option>
                  <option value="admin">🔧 Администратор</option>
                </select>
              </div>

              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Оставьте пустым для генерации"
                />
              </div>

              {form.role === 'club_coordinator' && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Клуб</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={sending}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {sending ? '⏳ Создание...' : '🎫 Создать приглашение'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}