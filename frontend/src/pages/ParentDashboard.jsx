// frontend/src/pages/ParentDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ParentDashboard() {
  const [profile, setProfile] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [availableEvents, setAvailableEvents] = useState([]);
  const [childStatistics, setChildStatistics] = useState({
    total_events: 0,
    attended_events: 0,
    achievements_count: 0,
    level: 1,
    progress: 0
  });
  const [showEvents, setShowEvents] = useState(false);
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
      // ТОЛЬКО РОДИТЕЛЬ
      // ============================================================
      if (userData.role !== 'parent') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // TODO: добавить API для получения детей родителя
      setChildren([]);
      setSelectedChild(null);
      await loadAvailableEvents();

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChildStatistics = async (childId) => {
    try {
      // TODO: добавить API для получения статистики ребёнка
      setChildStatistics({
        total_events: 0,
        attended_events: 0,
        achievements_count: 0,
        level: 1,
        progress: 0
      });
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const loadAvailableEvents = async () => {
    try {
      const eventsData = await api.getEvents();
      const now = new Date();
      const futureEvents = eventsData.filter(e => new Date(e.event_date) >= now);
      setAvailableEvents(futureEvents.slice(0, 10));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleChildSelect = (child) => {
    setSelectedChild(child);
    loadChildStatistics(child.id);
  };

  const handleRegisterChild = async (childId, eventId) => {
    setMessage('');
    setLoading(true);

    try {
      // TODO: добавить API для записи ребёнка на мероприятие
      setMessage('✅ Ребёнок записан на мероприятие!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">👨‍👩‍👦</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>У вас пока нет привязанных детей</p>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Обратитесь к администратору для привязки ребёнка к вашему аккаунту.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate('/profile')}
            >
              Перейти в профиль
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👨‍👩‍👦</span>
          <div>
            <h1>Родительский кабинет</h1>
            <p>Управление профилями детей</p>
          </div>
        </div>

        {message && (
          <div className="message-success">{message}</div>
        )}

        {/* ВЫБОР РЕБЁНКА */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          {children.map((child) => (
            <button
              key={child.id}
              className={selectedChild?.id === child.id ? 'btn-primary' : 'btn-secondary'}
              onClick={() => handleChildSelect(child)}
              style={{ padding: '8px 20px' }}
            >
              {child.full_name}
              {child.class_name && ` (${child.class_name})`}
            </button>
          ))}
        </div>

        {selectedChild && (
          <>
            {/* ПРОФИЛЬ РЕБЁНКА */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A' }}>
                    {selectedChild.full_name}
                  </h2>
                  <p style={{ color: '#667085' }}>
                    {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                    {selectedChild.club_name && ` • 🏫 ${selectedChild.club_name}`}
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => navigate(`/participant/${selectedChild.id}`)}
                >
                  👁️ Полный профиль
                </button>
              </div>
            </div>

            {/* СТАТИСТИКА */}
            <div className="grid-4" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <div className="number">{childStatistics.total_events || 0}</div>
                <div className="label">Мероприятий</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#16845B' }}>{childStatistics.attended_events || 0}</div>
                <div className="label">Посещено</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#C9A227' }}>{childStatistics.achievements_count || 0}</div>
                <div className="label">Достижений</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
                <div className="number">{childStatistics.level || 1}</div>
                <div className="label">Уровень</div>
              </div>
            </div>

            {/* ЗАПИСЬ НА МЕРОПРИЯТИЯ */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                  📅 Доступные мероприятия
                </h3>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => setShowEvents(!showEvents)}
                >
                  {showEvents ? '✖ Скрыть' : '📋 Показать'}
                </button>
              </div>

              {showEvents && (
                <>
                  {availableEvents.length === 0 ? (
                    <p style={{ color: '#667085' }}>Нет доступных мероприятий</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {availableEvents.map((event) => (
                        <div key={event.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                          <div className="title">{event.title}</div>
                          <div className="subtitle">
                            📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                            {event.location && ` • 📍 ${event.location}`}
                          </div>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 12px', fontSize: '12px', marginTop: '8px' }}
                            onClick={() => handleRegisterChild(selectedChild.id, event.id)}
                            disabled={loading}
                          >
                            Записать ребёнка
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}