// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubCoordinatorDashboard() {
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [stats, setStats] = useState({
    participants: 0,
    events: 0,
    reports: 0,
    achievements: 0,
    active_participants: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [topParticipants, setTopParticipants] = useState([]);
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
      // ТОЛЬКО КООРДИНАТОР КЛУБА
      // ============================================================
      if (userData.role !== 'club_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Находим клуб координатора
      const clubsData = await api.getClubs();
      const coordinatorClub = clubsData.find(c => 
        c.coordinator_id === userData.id || 
        c.leader_id === userData.id
      );

      if (coordinatorClub) {
        setClub(coordinatorClub);
        await loadStats(coordinatorClub.id);
        await loadRecentActivities(coordinatorClub.id);
        await loadTopParticipants(coordinatorClub.id);
      }

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (clubId) => {
    try {
      const [participantsData, eventsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getEvents(),
        api.getAchievements()
      ]);

      const clubParticipants = participantsData.filter(p => p.club_id === clubId);
      const clubEvents = eventsData.filter(e => e.club_id === clubId);
      const clubAchievements = achievementsData.filter(a => {
        const participant = participantsData.find(p => p.id === a.participant_id);
        return participant?.club_id === clubId;
      });

      setStats({
        participants: clubParticipants.length,
        events: clubEvents.length,
        reports: 0, // TODO: добавить отчёты
        achievements: clubAchievements.length,
        active_participants: clubParticipants.filter(p => p.status === 'active').length
      });
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  const loadRecentActivities = async (clubId) => {
    try {
      const eventsData = await api.getEvents();
      const clubEvents = eventsData
        .filter(e => e.club_id === clubId)
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
        .slice(0, 5);
      setRecentActivities(clubEvents || []);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const loadTopParticipants = async (clubId) => {
    try {
      const [participantsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getAchievements()
      ]);

      const clubParticipants = participantsData.filter(p => p.club_id === clubId);
      
      const ranked = clubParticipants.map(p => {
        const achievements = achievementsData.filter(a => a.participant_id === p.id);
        const rating = achievements.length * 5 + (p.points || 0);
        return { ...p, rating };
      });

      ranked.sort((a, b) => b.rating - a.rating);
      setTopParticipants(ranked.slice(0, 5));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">🏫</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Клуб не найден</p>
            <p style={{ color: '#667085' }}>Вы не привязаны ни к одному КЮДу. Обратитесь к администратору.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {/* ВЕРХНЯЯ ЧАСТЬ */}
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>🏫</span>
          <div>
            <h1>{club.name}</h1>
            <p>{club.description || 'Клуб юных дипломатов'}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            <button
              className="btn-secondary"
              onClick={() => navigate('/club-analytics')}
            >
              📊 Аналитика
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate('/reports')}
            >
              📝 Отчёт
            </button>
          </div>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="number">{stats.participants}</div>
            <div className="label">Участников</div>
            <div style={{ fontSize: '11px', color: '#16845B' }}>
              🟢 {stats.active_participants} активных
            </div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.events}</div>
            <div className="label">Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.achievements}</div>
            <div className="label">Достижений</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.reports}</div>
            <div className="label">Отчётов</div>
          </div>
        </div>

        {/* ДВЕ КОЛОНКИ */}
        <div className="grid-2">
          {/* ПОСЛЕДНИЕ МЕРОПРИЯТИЯ */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📅 Последние мероприятия
            </h3>
            {recentActivities.length === 0 ? (
              <p style={{ color: '#667085' }}>Мероприятий пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivities.map((event) => (
                  <div key={event.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                    <div className="title">{event.title}</div>
                    <div className="subtitle">
                      📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                      {event.location && ` • 📍 ${event.location}`}
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

          {/* ТОП УЧАСТНИКОВ */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Топ участников
            </h3>
            {topParticipants.length === 0 ? (
              <p style={{ color: '#667085' }}>Участников пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topParticipants.map((p, index) => (
                  <div
                    key={p.id}
                    className="list-item"
                    style={{
                      borderLeftColor: index === 0 ? '#C9A227' : 'transparent',
                      background: index === 0 ? '#FBF4DC' : '#F8FAFC'
                    }}
                  >
                    <div className="title">
                      {index === 0 && '🥇 '}
                      {index === 1 && '🥈 '}
                      {index === 2 && '🥉 '}
                      {p.full_name}
                    </div>
                    <div className="subtitle">
                      {p.class_name || 'Класс не указан'} • ⭐ {p.rating} баллов
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/participants')}
            >
              Все участники →
            </button>
          </div>
        </div>

        {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            ⚡ Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/participants')}
            >
              👥 Добавить участника
            </button>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/events')}
            >
              📅 Создать мероприятие
            </button>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', background: '#C9A227', color: '#0B1F3A' }}
              onClick={() => navigate('/reports')}
            >
              📝 Создать отчёт
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff')}
            >
              👨‍🏫 Назначить тьютора
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}