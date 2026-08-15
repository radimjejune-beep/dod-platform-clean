// frontend/src/pages/MassNotifications.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function MassNotifications() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [stats, setStats] = useState({
    totalUsers: 0,
    participants: 0,
    coordinators: 0,
    tutors: 0,
    admins: 0
  });
  const [form, setForm] = useState({
    recipients: 'all',
    title: '',
    message: '',
    priority: 'normal',
    send_now: true,
    schedule_date: ''
  });
  const [showPreview, setShowPreview] = useState(false);
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

      if (userData.role !== 'movement_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const users = await api.getUsers();
      setStats({
        totalUsers: users.length,
        participants: users.filter(u => u.role === 'participant').length,
        coordinators: users.filter(u => u.role === 'club_coordinator').length,
        tutors: users.filter(u => u.role === 'tutor').length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'movement_coordinator').length
      });

    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title.trim() || !form.message.trim()) {
      setMessage('❌ Заполните заголовок и текст уведомления');
      setMessageType('error');
      return;
    }

    const recipientCount = getRecipientCount();
    if (recipientCount === 0) {
      setMessage('❌ Нет получателей для выбранной группы');
      setMessageType('error');
      return;
    }

    if (!confirm(`Отправить уведомление ${recipientCount} получателям?`)) return;

    setSending(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Нет авторизации');
      }

      console.log('📤 Отправка массового уведомления:', {
        title: form.title.trim(),
        message: form.message.trim(),
        recipients: form.recipients,
        priority: form.priority,
        scheduled_at: form.send_now ? null : form.schedule_date
      });

      const response = await fetch('https://dod-backend.relaxdev.ru/api/mass-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          recipients: form.recipients,
          priority: form.priority,
          scheduled_at: form.send_now ? null : form.schedule_date
        })
      });

      const data = await response.json();
      console.log('📥 Ответ сервера:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      setMessage(`✅ Уведомление отправлено ${data.sent_count || recipientCount} получателям!`);
      setMessageType('success');
      setForm({
        recipients: 'all',
        title: '',
        message: '',
        priority: 'normal',
        send_now: true,
        schedule_date: ''
      });
      setShowPreview(false);
      
      // Обновляем статистику
      const users = await api.getUsers();
      setStats({
        totalUsers: users.length,
        participants: users.filter(u => u.role === 'participant').length,
        coordinators: users.filter(u => u.role === 'club_coordinator').length,
        tutors: users.filter(u => u.role === 'tutor').length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'movement_coordinator').length
      });
      
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  const getRecipientCount = () => {
    const counts = {
      'all': stats.totalUsers,
      'participants': stats.participants,
      'coordinators': stats.coordinators,
      'tutors': stats.tutors,
      'admins': stats.admins
    };
    return counts[form.recipients] || 0;
  };

  const getRecipientLabel = () => {
    const labels = {
      'all': 'Все пользователи',
      'participants': '👤 Участники',
      'coordinators': '🏫 Координаторы КЮДов',
      'tutors': '📚 Тьюторы',
      'admins': '🔧 Администраторы'
    };
    return labels[form.recipients] || form.recipients;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': '🟢 Низкий',
      'normal': '🟡 Обычный',
      'high': '🔴 Высокий',
      'urgent': '🔥 Срочный'
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  const recipientCount = getRecipientCount();

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📨</span>
          <div>
            <h1>Массовые уведомления</h1>
            <p>Отправка уведомлений группам пользователей</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="number">{stats.totalUsers}</div>
            <div className="label">👥 Всего пользователей</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="number">{stats.participants}</div>
            <div className="label">👤 Участников</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="number">{stats.coordinators}</div>
            <div className="label">🏫 Координаторов</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="number">{stats.tutors}</div>
            <div className="label">📚 Тьюторов</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            📝 Создать уведомление
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Получатели *</label>
              <select
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                required
              >
                <option value="all">Все пользователи ({stats.totalUsers})</option>
                <option value="participants">👤 Участники ({stats.participants})</option>
                <option value="coordinators">🏫 Координаторы КЮДов ({stats.coordinators})</option>
                <option value="tutors">📚 Тьюторы ({stats.tutors})</option>
                <option value="admins">🔧 Администраторы ({stats.admins})</option>
              </select>
              <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                📊 Будет отправлено <strong>{recipientCount}</strong> получателям
              </div>
            </div>

            <div className="form-group">
              <label>Заголовок *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Заголовок уведомления"
              />
            </div>

            <div className="form-group">
              <label>Текст сообщения *</label>
              <textarea
                rows="6"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                placeholder="Введите текст уведомления..."
              />
              <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                {form.message.length} символов
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Приоритет</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">🟢 Низкий</option>
                  <option value="normal">🟡 Обычный</option>
                  <option value="high">🔴 Высокий</option>
                  <option value="urgent">🔥 Срочный</option>
                </select>
              </div>

              <div className="form-group">
                <label>Отправить</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={form.send_now}
                      onChange={() => setForm({ ...form, send_now: true, schedule_date: '' })}
                    />
                    <span>Сейчас</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!form.send_now}
                      onChange={() => setForm({ ...form, send_now: false })}
                    />
                    <span>По расписанию</span>
                  </label>
                </div>
                {!form.send_now && (
                  <input
                    type="datetime-local"
                    value={form.schedule_date}
                    onChange={(e) => setForm({ ...form, schedule_date: e.target.value })}
                    style={{ marginTop: '8px', width: '100%' }}
                    required
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn-success"
                disabled={sending || recipientCount === 0}
              >
                {sending ? '⏳ Отправка...' : `📤 Отправить (${recipientCount})`}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPreview(!showPreview)}
              >
                👁️ {showPreview ? 'Скрыть' : 'Предпросмотр'}
              </button>
            </div>
          </form>

          {showPreview && form.title && form.message && (
            <div style={{
              marginTop: '16px',
              padding: '20px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E7EF'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#0B1F3A' }}>
                👁️ Предпросмотр уведомления
              </h4>
              <div style={{
                padding: '16px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #E2E7EF'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#0B1F3A' }}>{form.title}</h4>
                  <span className="tag" style={{
                    background: form.priority === 'urgent' ? '#FCEBEC' :
                              form.priority === 'high' ? '#FCEBEC' :
                              form.priority === 'normal' ? '#FBF4DC' : '#F4F6F9',
                    color: form.priority === 'urgent' ? '#B3262E' :
                           form.priority === 'high' ? '#B3262E' :
                           form.priority === 'normal' ? '#8A6A00' : '#667085'
                  }}>
                    {getPriorityLabel(form.priority)}
                  </span>
                </div>
                <p style={{ color: '#475467', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {form.message}
                </p>
                <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '8px' }}>
                  📤 Получатели: {getRecipientLabel()} ({recipientCount} чел.)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}