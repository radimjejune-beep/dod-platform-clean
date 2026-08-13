// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    active_participants: 0,
    pending_events: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [topParticipants, setTopParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
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

      if (userData.role !== 'club_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем клубы
      const clubsData = await api.getClubs();
      console.log('🏫 Все клубы:', clubsData);
      console.log('👤 Пользователь:', userData);

      // ===== ПОИСК КЛУБА КООРДИНАТОРА =====
      let coordinatorClub = null;

      // 1. По club_id в users
      if (userData.club_id) {
        coordinatorClub = clubsData.find(c => c.id === userData.club_id);
        if (coordinatorClub) {
          console.log('✅ Клуб найден по club_id:', coordinatorClub.name);
        }
      }

      // 2. По coordinator_id или leader_id
      if (!coordinatorClub) {
        coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          console.log('✅ Клуб найден по coordinator_id/leader_id:', coordinatorClub.name);
        }
      }

      // 3. Через club_coordinators
      if (!coordinatorClub) {
        try {
          const coordResponse = await fetch(`https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${userData.id}`);
          const coordData = await coordResponse.json();
          console.log('📊 Данные из club_coordinators:', coordData);
          
          if (coordData && coordData.length > 0) {
            const clubId = coordData[0].club_id;
            coordinatorClub = clubsData.find(c => c.id === clubId);
            if (coordinatorClub) {
              console.log('✅ Клуб найден через club_coordinators:', coordinatorClub.name);
            }
          }
        } catch (e) {
          console.log('⚠️ Ошибка получения club_coordinators:', e);
        }
      }

      if (!coordinatorClub) {
        console.log('❌ Клуб не найден для координатора');
        setLoading(false);
        return;
      }

      setClub(coordinatorClub);
      await loadStats(coordinatorClub.id);
      await loadRecentActivities(coordinatorClub.id);
      await loadTopParticipants(coordinatorClub.id);

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
        reports: 0,
        achievements: clubAchievements.length,
        active_participants: clubParticipants.filter(p => p.status === 'active').length,
        pending_events: clubEvents.filter(e => e.status === 'pending').length
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

  if (!club) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">🏫</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Клуб не найден</p>
            <p style={{ color: '#667085' }}>Вы не привязаны ни к одному КЮДу. Обратитесь к администратору.</p>
            <button className="btn-primary" onClick={() => navigate('/profile')} style={{ marginTop: '16px' }}>
              👤 Перейти в профиль
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '📊 Обзор' },
    { id: 'members', label: '👥 Участники' },
    { id: 'events', label: '📅 Мероприятия' },
    { id: 'achievements', label: '🏆 Достижения' },
    { id: 'reports', label: '📋 Отчёты' },
  ];

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ===== ШАПКА ПРОФИЛЯ ===== */}
        <div className="card" style={{ 
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px', 
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: 'white',
              fontWeight: 'bold',
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.3)'
            }}>
              🏫
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                {club.name}
              </h1>
              <p style={{ opacity: 0.7, margin: '4px 0 0 0' }}>
                {club.city || 'Город не указан'} • {club.school || 'Школа не указана'}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  👥 {stats.participants} участников
                </span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  📅 {stats.events} мероприятий
                </span>
                {stats.pending_events > 0 && (
                  <span style={{ background: 'rgba(201, 162, 39, 0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', color: '#E8D9A8' }}>
                    ⏳ {stats.pending_events} на модерации
                  </span>
                )}
              </div>
            </div>

            <Link to="/clubs" className="btn-secondary" style={{ alignSelf: 'flex-start', color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
              🏫 Все КЮДы
            </Link>
          </div>

          {/* ПРОГРЕСС-БАР АКТИВНОСТИ */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.8 }}>
              <span>Активность клуба</span>
              <span>{stats.participants > 0 ? Math.round((stats.active_participants / stats.participants) * 100) : 0}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '3px',
              marginTop: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${stats.participants > 0 ? (stats.active_participants / stats.participants) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A227, #E8D9A8)',
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>

        {/* ===== СТАТИСТИКА ===== */}
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="number">{stats.participants}</div>
            <div className="label">👥 Участников</div>
            <div style={{ fontSize: '11px', color: '#16845B' }}>🟢 {stats.active_participants} активных</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="number">{stats.events}</div>
            <div className="label">📅 Мероприятий</div>
            {stats.pending_events > 0 && (
              <div style={{ fontSize: '11px', color: '#C9A227' }}>⏳ {stats.pending_events} на модерации</div>
            )}
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="number">{stats.achievements}</div>
            <div className="label">🏆 Достижений</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="number">{stats.reports}</div>
            <div className="label">📋 Отчётов</div>
          </div>
        </div>

        {/* ===== ВКЛАДКИ ===== */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === tab.id ? '#0B1F3A' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#667085',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            ВКЛАДКА: ОБЗОР
            ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid-2">
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
                        {event.status === 'pending' && (
                          <div className="meta" style={{ color: '#C9A227' }}>⏳ Ожидает модерации</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '12px', padding: '8px' }}
                  onClick={() => setActiveTab('events')}
                >
                  Все мероприятия →
                </button>
              </div>

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
                          background: index === 0 ? '#FBF4DC' : '#F8FAFC',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/participant/${p.id}`)}
                      >
                        <div className="title">
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {p.full_name}
                        </div>
                        <div className="subtitle">
                          {p.class_name || 'Класс не указан'} • ⭐ {p.rating || 0} баллов
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '12px', padding: '8px' }}
                  onClick={() => setActiveTab('members')}
                >
                  Все участники →
                </button>
              </div>
            </div>

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
                  👥 Участники
                </button>
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => navigate('/events')}
                >
                  📅 Мероприятия
                </button>
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', background: '#C9A227', color: '#0B1F3A' }}
                  onClick={() => navigate('/reports')}
                >
                  📝 Отчёт
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => navigate('/tutor-requests')}
                >
                  🤝 Запросы на тьюторов
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: УЧАСТНИКИ
            ============================================================ */}
        {activeTab === 'members' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                👥 Участники клуба ({stats.participants})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => navigate('/participants')}
              >
                Управление
              </button>
            </div>
            {topParticipants.length === 0 ? (
              <p style={{ color: '#667085' }}>В вашем клубе пока нет участников</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="list-item"
                    style={{ borderLeftColor: '#174A7E', cursor: 'pointer' }}
                    onClick={() => navigate(`/participant/${p.id}`)}
                  >
                    <div className="title">{p.full_name}</div>
                    <div className="subtitle">
                      {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: МЕРОПРИЯТИЯ
            ============================================================ */}
        {activeTab === 'events' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                📅 Мероприятия клуба ({stats.events})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => navigate('/events')}
              >
                Управление
              </button>
            </div>
            {recentActivities.length === 0 ? (
              <p style={{ color: '#667085' }}>Мероприятий пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivities.map((event) => (
                  <div
                    key={event.id}
                    className="list-item"
                    style={{
                      borderLeftColor: event.status === 'pending' ? '#C9A227' : '#174A7E'
                    }}
                  >
                    <div className="title">
                      {event.title}
                      {event.status === 'pending' && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#FBF4DC', color: '#8A6A00', fontSize: '10px' }}>
                          ⏳ На модерации
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                      {event.location && ` • 📍 ${event.location}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: ДОСТИЖЕНИЯ
            ============================================================ */}
        {activeTab === 'achievements' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                🏆 Достижения клуба ({stats.achievements})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => navigate('/manage-achievements')}
              >
                Управление
              </button>
            </div>
            {stats.achievements === 0 ? (
              <p style={{ color: '#667085' }}>Достижений пока нет</p>
            ) : (
              <p style={{ color: '#667085' }}>Всего достижений: {stats.achievements}</p>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: ОТЧЁТЫ
            ============================================================ */}
        {activeTab === 'reports' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                📋 Отчёты клуба ({stats.reports})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => navigate('/reports')}
              >
                Управление
              </button>
            </div>
            <p style={{ color: '#667085' }}>Отчётов пока нет</p>
          </div>
        )}
      </div>
    </div>
  );
}