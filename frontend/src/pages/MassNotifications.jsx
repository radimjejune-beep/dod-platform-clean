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
  const [recentNotifications, setRecentNotifications] = useState([]);
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

      // Загружаем последние уведомления
      const notifications = await api.getMassNotifications();
      setRecentNotifications(notifications.slice(0, 5) || []);

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
      
      const users = await api.getUsers();
      setStats({
        totalUsers: users.length,
        participants: users.filter(u => u.role === 'participant').length,
        coordinators: users.filter(u => u.role === 'club_coordinator').length,
        tutors: users.filter(u => u.role === 'tutor').length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'movement_coordinator').length
      });

      const notifications = await api.getMassNotifications();
      setRecentNotifications(notifications.slice(0, 5) || []);
      
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

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#16845B',
      'normal': '#C9A227',
      'high': '#B3262E',
      'urgent': '#B3262E'
    };
    return colors[priority] || '#667085';
  };

  const getPriorityBg = (priority) => {
    const colors = {
      'low': '#E8F5EF',
      'normal': '#FBF4DC',
      'high': '#FCEBEC',
      'urgent': '#FCEBEC'
    };
    return colors[priority] || '#F4F6F9';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        {/* ЗАГОЛОВОК */}
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

        {/* СТАТИСТИКА */}
        <div className="stats-grid">
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">👥 Всего пользователей</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="stat-number">{stats.participants}</div>
            <div className="stat-label">👤 Участников</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="stat-number">{stats.coordinators}</div>
            <div className="stat-label">🏫 Координаторов</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="stat-number">{stats.tutors}</div>
            <div className="stat-label">📚 Тьюторов</div>
          </div>
        </div>

        {/* ФОРМА СОЗДАНИЯ */}
        <div className="notification-form">
          <h2>📝 Создать уведомление</h2>
          
          <form onSubmit={handleSubmit}>
            {/* Получатели */}
            <div className="form-group">
              <label>Получатели *</label>
              <select
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                required
                className="form-select"
              >
                <option value="all">Все пользователи ({stats.totalUsers})</option>
                <option value="participants">👤 Участники ({stats.participants})</option>
                <option value="coordinators">🏫 Координаторы КЮДов ({stats.coordinators})</option>
                <option value="tutors">📚 Тьюторы ({stats.tutors})</option>
                <option value="admins">🔧 Администраторы ({stats.admins})</option>
              </select>
              <div className="recipient-info">
                📊 Будет отправлено <strong>{recipientCount}</strong> получателям
              </div>
            </div>

            {/* Заголовок */}
            <div className="form-group">
              <label>Заголовок *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Введите заголовок уведомления"
                className="form-input"
              />
            </div>

            {/* Текст */}
            <div className="form-group">
              <label>Текст сообщения *</label>
              <textarea
                rows="6"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                placeholder="Введите текст уведомления..."
                className="form-textarea"
              />
              <div className="char-counter">
                {form.message.length} символов
              </div>
            </div>

            {/* Приоритет и время */}
            <div className="form-row">
              <div className="form-group half">
                <label>Приоритет</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="form-select"
                >
                  <option value="low">🟢 Низкий</option>
                  <option value="normal">🟡 Обычный</option>
                  <option value="high">🔴 Высокий</option>
                  <option value="urgent">🔥 Срочный</option>
                </select>
              </div>

              <div className="form-group half">
                <label>Отправить</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={form.send_now}
                      onChange={() => setForm({ ...form, send_now: true, schedule_date: '' })}
                    />
                    <span>Сейчас</span>
                  </label>
                  <label className="radio-label">
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
                    className="form-input"
                    style={{ marginTop: '8px' }}
                    required
                  />
                )}
              </div>
            </div>

            {/* Кнопки */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn-send"
                disabled={sending || recipientCount === 0}
              >
                {sending ? '⏳ Отправка...' : `📤 Отправить (${recipientCount})`}
              </button>
              <button
                type="button"
                className="btn-preview"
                onClick={() => setShowPreview(!showPreview)}
              >
                👁️ {showPreview ? 'Скрыть' : 'Предпросмотр'}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setForm({
                    recipients: 'all',
                    title: '',
                    message: '',
                    priority: 'normal',
                    send_now: true,
                    schedule_date: ''
                  });
                  setShowPreview(false);
                }}
              >
                ✖ Очистить
              </button>
            </div>
          </form>

          {/* Предпросмотр */}
          {showPreview && form.title && form.message && (
            <div className="preview-box">
              <h4>👁️ Предпросмотр уведомления</h4>
              <div className="preview-card">
                <div className="preview-header">
                  <h4>{form.title}</h4>
                  <span className="priority-tag" style={{
                    background: getPriorityBg(form.priority),
                    color: getPriorityColor(form.priority)
                  }}>
                    {getPriorityLabel(form.priority)}
                  </span>
                </div>
                <p className="preview-message">{form.message}</p>
                <div className="preview-footer">
                  📤 Получатели: {getRecipientLabel()} ({recipientCount} чел.)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ПОСЛЕДНИЕ УВЕДОМЛЕНИЯ */}
        {recentNotifications.length > 0 && (
          <div className="recent-notifications">
            <div className="recent-header">
              <h3>📋 Последние уведомления</h3>
              <button
                className="btn-view-all"
                onClick={() => navigate('/notification-history')}
              >
                Все уведомления →
              </button>
            </div>

            <div className="notifications-list">
              {recentNotifications.map((n) => {
                const priorityColor = getPriorityColor(n.priority);
                const priorityBg = getPriorityBg(n.priority);
                const statusMap = {
                  'pending': '⏳ Ожидает',
                  'sent': '✅ Отправлено',
                  'scheduled': '📅 Запланировано',
                  'failed': '❌ Ошибка'
                };
                const statusColor = {
                  'pending': '#C9A227',
                  'sent': '#16845B',
                  'scheduled': '#174A7E',
                  'failed': '#B3262E'
                };
                const statusBg = {
                  'pending': '#FBF4DC',
                  'sent': '#E8F5EF',
                  'scheduled': '#EAF2FA',
                  'failed': '#FCEBEC'
                };

                return (
                  <div key={n.id} className="notification-item">
                    <div className="notification-icon">
                      {n.priority === 'urgent' ? '🔥' : '📨'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-message">{n.message}</div>
                      <div className="notification-meta">
                        <span className="meta-item">
                          📤 {getRecipientLabel(n.recipients)} ({n.recipient_count} чел.)
                        </span>
                        <span className="meta-item">
                          👤 {n.created_by_name || 'Система'}
                        </span>
                        <span className="meta-item">
                          📅 {formatDate(n.created_at)}
                        </span>
                        <span className="priority-badge" style={{
                          background: priorityBg,
                          color: priorityColor
                        }}>
                          {getPriorityLabel(n.priority)}
                        </span>
                        <span className="status-badge" style={{
                          background: statusBg[n.status] || '#F4F6F9',
                          color: statusColor[n.status] || '#667085'
                        }}>
                          {statusMap[n.status] || n.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        /* ===== ЗАГОЛОВОК ===== */
        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
          padding: 20px 28px;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .page-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #0A1628;
          margin: 0;
        }

        .page-header p {
          font-size: 14px;
          color: #8A8480;
          margin: 4px 0 0 0;
        }

        /* ===== СООБЩЕНИЯ ===== */
        .message-success {
          padding: 14px 20px;
          background: #E8F5EF;
          color: #1A7A4C;
          border-radius: 10px;
          margin-bottom: 20px;
          border-left: 4px solid #1A7A4C;
          font-weight: 500;
        }

        .message-error {
          padding: 14px 20px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 10px;
          margin-bottom: 20px;
          border-left: 4px solid #B3262E;
          font-weight: 500;
        }

        /* ===== СТАТИСТИКА ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 20px 24px;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.08);
        }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #0A1628;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 13px;
          color: #8A8480;
          margin-top: 4px;
        }

        /* ===== ФОРМА ===== */
        .notification-form {
          background: white;
          border-radius: 12px;
          padding: 28px 32px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 24px;
        }

        .notification-form h2 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
          margin: 0 0 20px 0;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #0A1628;
          margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E4DFD8;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #0A1628;
          background: white;
          transition: all 0.3s ease;
          outline: none;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .recipient-info {
          font-size: 12px;
          color: #8A8480;
          margin-top: 6px;
        }

        .char-counter {
          text-align: right;
          font-size: 12px;
          color: #98A2B3;
          margin-top: 4px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group.half {
          margin-bottom: 0;
        }

        .radio-group {
          display: flex;
          gap: 20px;
          margin-top: 4px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #4D4744;
        }

        .radio-label input[type="radio"] {
          width: 18px;
          height: 18px;
          accent-color: #C9A227;
          cursor: pointer;
        }

        /* ===== КНОПКИ ===== */
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .btn-send {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
          font-family: 'Inter', sans-serif;
          flex: 1;
        }

        .btn-send:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .btn-preview {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: transparent;
          color: #0A1628;
          border: 1.5px solid #E4DFD8;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }

        .btn-preview:hover {
          background: #F8F6F2;
          border-color: #C9A227;
        }

        .btn-cancel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: transparent;
          color: #B3262E;
          border: 1.5px solid #FCEBEC;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }

        .btn-cancel:hover {
          background: #FCEBEC;
        }

        /* ===== ПРЕДПРОСМОТР ===== */
        .preview-box {
          margin-top: 20px;
          padding: 20px;
          background: #F8FAFC;
          border-radius: 10px;
          border: 1px solid #E4DFD8;
        }

        .preview-box h4 {
          font-size: 14px;
          font-weight: 600;
          color: #0A1628;
          margin: 0 0 12px 0;
        }

        .preview-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #E4DFD8;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .preview-header h4 {
          font-size: 16px;
          font-weight: 600;
          color: #0A1628;
          margin: 0;
        }

        .priority-tag {
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .preview-message {
          font-size: 14px;
          color: #4D4744;
          line-height: 1.7;
          margin: 0 0 12px 0;
          white-space: pre-wrap;
        }

        .preview-footer {
          font-size: 12px;
          color: #8A8480;
          padding-top: 12px;
          border-top: 1px solid #F0EDE8;
        }

        /* ===== ПОСЛЕДНИЕ УВЕДОМЛЕНИЯ ===== */
        .recent-notifications {
          background: white;
          border-radius: 12px;
          padding: 24px 28px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .recent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .recent-header h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #0A1628;
          margin: 0;
        }

        .btn-view-all {
          background: none;
          border: none;
          color: #174A7E;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: color 0.2s ease;
        }

        .btn-view-all:hover {
          color: #C9A227;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-item {
          display: flex;
          gap: 14px;
          padding: 14px 18px;
          background: #F8FAFC;
          border-radius: 10px;
          border: 1px solid #F0EDE8;
          transition: all 0.2s ease;
        }

        .notification-item:hover {
          background: #F0EDE8;
        }

        .notification-icon {
          font-size: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          font-size: 14px;
          color: #0A1628;
        }

        .notification-message {
          font-size: 13px;
          color: #6B6561;
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 6px;
          font-size: 12px;
          color: #8A8480;
        }

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .priority-badge,
        .status-badge {
          padding: 2px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        /* ===== АДАПТИВНОСТЬ ===== */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }

          .page-header {
            padding: 16px 20px;
            flex-wrap: wrap;
          }

          .notification-form {
            padding: 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-group.half {
            margin-bottom: 18px;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn-send,
          .btn-preview,
          .btn-cancel {
            width: 100%;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-number {
            font-size: 26px;
          }

          .recent-notifications {
            padding: 16px 18px;
          }

          .notification-item {
            padding: 12px 14px;
          }

          .notification-meta {
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .stat-number {
            font-size: 22px;
          }

          .page-header h1 {
            font-size: 20px;
          }

          .notification-form h2 {
            font-size: 18px;
          }

          .radio-group {
            flex-direction: column;
            gap: 8px;
          }

          .notification-meta {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}