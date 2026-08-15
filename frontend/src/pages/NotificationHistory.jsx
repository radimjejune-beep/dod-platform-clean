// frontend/src/pages/NotificationHistory.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function NotificationHistory() {
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
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

      const data = await api.getMassNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить это уведомление?')) return;

    try {
      await api.deleteMassNotification(id);
      setMessage('✅ Уведомление удалено');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getRecipientLabel = (recipients) => {
    const labels = {
      'all': 'Все пользователи',
      'participants': '👤 Участники',
      'coordinators': '🏫 Координаторы КЮДов',
      'tutors': '📚 Тьюторы',
      'admins': '🔧 Администраторы'
    };
    return labels[recipients] || recipients;
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

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { label: '⏳ Ожидает', color: '#C9A227', bg: '#FBF4DC' },
      'sent': { label: '✅ Отправлено', color: '#16845B', bg: '#E8F5EF' },
      'scheduled': { label: '📅 Запланировано', color: '#174A7E', bg: '#EAF2FA' },
      'failed': { label: '❌ Ошибка', color: '#B3262E', bg: '#FCEBEC' }
    };
    return badges[status] || badges['pending'];
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
          <span style={{ fontSize: '32px' }}>📨</span>
          <div>
            <h1>История уведомлений</h1>
            <p>Все отправленные массовые уведомления</p>
          </div>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => loadData()}
          >
            🔄 Обновить
          </button>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Уведомлений пока нет</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notifications.map((n) => {
              const status = getStatusBadge(n.status);
              return (
                <div
                  key={n.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${status.color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                          {n.title}
                        </h3>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                        <span className="tag" style={{
                          background: n.priority === 'urgent' ? '#FCEBEC' :
                                    n.priority === 'high' ? '#FCEBEC' :
                                    n.priority === 'normal' ? '#FBF4DC' : '#F4F6F9',
                          color: n.priority === 'urgent' ? '#B3262E' :
                                 n.priority === 'high' ? '#B3262E' :
                                 n.priority === 'normal' ? '#8A6A00' : '#667085'
                        }}>
                          {getPriorityLabel(n.priority)}
                        </span>
                      </div>

                      <p style={{ color: '#475467', marginTop: '8px', fontSize: '14px' }}>
                        {n.message}
                      </p>

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        <span>📤 {getRecipientLabel(n.recipients)} ({n.recipient_count} чел.)</span>
                        <span>👤 {n.created_by_name || 'Система'}</span>
                        <span>📅 {new Date(n.created_at).toLocaleString('ru-RU')}</span>
                        {n.sent_at && (
                          <span>✅ {new Date(n.sent_at).toLocaleString('ru-RU')}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(n.id)}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}