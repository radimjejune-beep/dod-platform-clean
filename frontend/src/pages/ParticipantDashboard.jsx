// frontend/src/pages/ParticipantDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ParticipantDashboard() {
  const [profile, setProfile] = useState(null);
  const [statistics, setStatistics] = useState({
    total_events: 0,
    attended_events: 0,
    achievements_count: 0,
    level: 1,
    next_level: 2,
    progress: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
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
      // ТОЛЬКО УЧАСТНИК
      // ============================================================
      if (userData.role !== 'participant') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем статистику
      const [eventsData, achievementsData] = await Promise.all([
        api.getEvents(),
        api.getAchievements()
      ]);

      // Мероприятия участника
      const userEvents = eventsData.filter(e => e.participant_id === userData.id);
      const attendedEvents = userEvents.filter(e => e.status === 'attended' || e.status === 'confirmed');

      // Достижения участника
      const userAchievements = achievementsData.filter(a => a.participant_id === userData.id);

      const total = userEvents.length;
      const attended = attendedEvents.length;
      const level = Math.floor(total / 5) + 1;

      setStatistics({
        total_events: total,
        attended_events: attended,
        achievements_count: userAchievements.length,
        level: level,
        next_level: level + 1,
        progress: ((total % 5) / 5) * 100
      });

      // Последние мероприятия
      const sortedEvents = [...userEvents].sort((a, b) => 
        new Date(b.event_date) - new Date(a.event_date)
      );
      setRecentEvents(sortedEvents.slice(0, 5));

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelName = (level) => {
    const names = {
      1: 'Начинающий дипломат',
      2: 'Юный дипломат',
      3: 'Дипломат',
      4: 'Опытный дипломат',
      5: 'Главный дипломат',
      6: 'Посол',
      7: 'Легенда'
    };
    return names[level] || 'Дипломат';
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
          <span style={{ fontSize: '32px' }}>👤</span>
          <div>
            <h1>{profile?.full_name}</h1>
            <p>
              {profile?.school || 'Школа не указана'} • {profile?.class_name || 'Класс не указан'}
            </p>
            <div style={{ marginTop: '8px' }}>
              <span className="status-active">
                🏅 {getLevelName(statistics.level)}
              </span>
            </div>
          </div>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate('/profile')}
          >
            ✏️ Редактировать профиль
          </button>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="number">{statistics.total_events}</div>
            <div className="label">Всего мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#16845B' }}>{statistics.attended_events}</div>
            <div className="label">Посещено</div>
          </div>
          <div className="stat-card">
            <div className="number" style={{ color: '#C9A227' }}>{statistics.achievements_count}</div>
            <div className="label">Достижений</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="number">{statistics.level}</div>
            <div className="label">Уровень</div>
            <div style={{
              width: '100%',
              height: '4px',
              background: '#F4F6F9',
              borderRadius: '2px',
              marginTop: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${statistics.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A227, #E8D9A8)',
                borderRadius: '2px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
              До {statistics.next_level} уровня: {Math.round((5 - statistics.total_events % 5) % 5)} мероприятий
            </div>
          </div>
        </div>

        {/* ПОСЛЕДНИЕ МЕРОПРИЯТИЯ */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📅 Мои мероприятия
          </h3>
          {recentEvents.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>Вы ещё не записаны на мероприятия</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentEvents.map((event) => (
                <div key={event.id} className="list-item" style={{
                  borderLeftColor: event.status === 'attended' || event.status === 'confirmed' ? '#16845B' : '#C9A227'
                }}>
                  <div className="title">{event.title}</div>
                  <div className="subtitle">
                    📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                    {event.location && ` • 📍 ${event.location}`}
                  </div>
                  <div className="meta">
                    <span className={event.status === 'attended' || event.status === 'confirmed' ? 'status-active' : 'status-inactive'}>
                      {event.status === 'attended' || event.status === 'confirmed' ? '✅ Участвовал' : '📝 Записан'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '12px', padding: '8px' }}
            onClick={() => navigate('/events')}
          >
            Все мероприятия →
          </button>
        </div>
      </div>
    </div>
  );
}