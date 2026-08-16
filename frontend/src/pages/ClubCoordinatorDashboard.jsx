// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubCoordinatorDashboard() {
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Все данные загружаются одним блоком
  const [dashboardData, setDashboardData] = useState({
    participants: [],
    events: [],
    achievements: [],
    tutorRequests: [],
    appeals: [],
    stats: {
      participants: 0,
      activeParticipants: 0,
      events: 0,
      eventsThisMonth: 0,
      achievements: 0,
      pendingRequests: 0,
      pendingAppeals: 0,
      upcomingEvents: 0,
      newParticipantsThisMonth: 0
    },
    recentParticipants: [],
    upcomingEvents: [],
    recentAchievements: [],
    recentActivity: []
  });

  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const navigate = useNavigate();

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ — ОДИН РАЗ
  // ============================================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Получаем пользователя
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

      // 2. Получаем клубы
      const clubsData = await api.getClubs();
      let coordinatorClub = null;

      if (userData.club_id) {
        coordinatorClub = clubsData.find(c => c.id === userData.club_id);
      }

      if (!coordinatorClub) {
        coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
      }

      if (!coordinatorClub) {
        setError('❌ Клуб не найден. Обратитесь к администратору.');
        setLoading(false);
        return;
      }

      setClub(coordinatorClub);

      // 3. ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ВСЕХ ДАННЫХ — ОДИН РАЗ!
      const [
        participantsData,
        eventsData,
        achievementsData,
        tutorRequestsData,
        appealsData
      ] = await Promise.all([
        api.getParticipants(),
        api.getEvents(),
        api.getAchievements(),
        api.getTutorRequests().catch(() => []),
        api.getAppeals().catch(() => [])
      ]);

      // 4. Фильтруем данные по клубу
      const clubParticipants = participantsData.filter(p => p.club_id === coordinatorClub.id);
      const clubEvents = eventsData.filter(e => e.club_id === coordinatorClub.id);
      
      const clubParticipantIds = clubParticipants.map(p => p.id);
      const clubAchievements = achievementsData.filter(a => 
        clubParticipantIds.includes(a.participant_id)
      );

      // 5. Считаем статистику
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const eventsThisMonth = clubEvents.filter(e => {
        const date = new Date(e.event_date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });

      const upcomingEvents = clubEvents
        .filter(e => new Date(e.event_date) >= now)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 5);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const newParticipantsThisMonth = clubParticipants.filter(p => 
        new Date(p.created_at) > oneMonthAgo
      );

      const pendingRequests = tutorRequestsData.filter(r => r.status === 'pending');
      const pendingAppeals = appealsData.filter(a => 
        a.status === 'pending' || a.status === 'in_progress'
      );

      // 6. Формируем активность
      const activities = [];
      
      clubParticipants
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .forEach(p => {
          activities.push({
            id: `join-${p.id}`,
            type: 'join',
            title: `${p.full_name} присоединился к клубу`,
            date: p.created_at,
            icon: '👤',
            color: '#16845B'
          });
        });

      clubEvents
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .forEach(e => {
          activities.push({
            id: `event-${e.id}`,
            type: 'event',
            title: `Создано мероприятие: ${e.title}`,
            date: e.created_at,
            icon: '📅',
            color: '#174A7E'
          });
        });

      activities.sort((a, b) => new Date(b.date) - new Date(a.date));

      // 7. Сохраняем всё в одно состояние
      setDashboardData({
        participants: clubParticipants,
        events: clubEvents,
        achievements: clubAchievements,
        tutorRequests: tutorRequestsData,
        appeals: appealsData,
        stats: {
          participants: clubParticipants.length,
          activeParticipants: clubParticipants.filter(p => p.status === 'active').length,
          events: clubEvents.length,
          eventsThisMonth: eventsThisMonth.length,
          achievements: clubAchievements.length,
          pendingRequests: pendingRequests.length,
          pendingAppeals: pendingAppeals.length,
          upcomingEvents: upcomingEvents.length,
          newParticipantsThisMonth: newParticipantsThisMonth.length
        },
        recentParticipants: clubParticipants.slice(0, 5),
        upcomingEvents: upcomingEvents,
        recentAchievements: clubAchievements
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5),
        recentActivity: activities.slice(0, 5)
      });

    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError('Ошибка загрузки данных: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  // ============================================================
  // ПЕРВИЧНАЯ ЗАГРУЗКА
  // ============================================================
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // ОБНОВЛЕНИЕ
  // ============================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // ============================================================
  // ФИЛЬТРАЦИЯ УЧАСТНИКОВ
  // ============================================================
  const filteredParticipants = useMemo(() => {
    if (filterStatus === 'all') return dashboardData.participants;
    return dashboardData.participants.filter(p => p.status === filterStatus);
  }, [dashboardData.participants, filterStatus]);

  // ============================================================
  // РЕНДЕРИНГ
  // ============================================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">❌</div>
            <p style={{ fontSize: '18px', color: '#B3262E' }}>{error}</p>
            <button className="btn-primary" onClick={handleRefresh}>
              🔄 Попробовать снова
            </button>
          </div>
        </div>
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

  const { stats, recentParticipants, upcomingEvents, recentAchievements, recentActivity, participants, events, achievements } = dashboardData;

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ===== ШАПКА ПРОФИЛЯ ===== */}
        <div className="card" style={{ 
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
          color: 'white',
          border: 'none',
          padding: '24px 28px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px', 
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.3)'
            }}>
              🏫
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                {club.name}
              </h1>
              <p style={{ opacity: 0.7, margin: '4px 0 0 0', fontSize: '14px' }}>
                {club.city || 'Город не указан'} 
                {club.school && ` • ${club.school}`}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: '20px', fontSize: '12px' }}>
                  👥 {stats.participants} участников
                </span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: '20px', fontSize: '12px' }}>
                  📅 {stats.events} мероприятий
                </span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: '20px', fontSize: '12px' }}>
                  🏆 {stats.achievements} достижений
                </span>
                {stats.pendingRequests > 0 && (
                  <span style={{ background: 'rgba(201, 162, 39, 0.2)', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', color: '#E8D9A8' }}>
                    ⏳ {stats.pendingRequests} запросов
                  </span>
                )}
                {stats.pendingAppeals > 0 && (
                  <span style={{ background: 'rgba(179, 38, 46, 0.2)', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', color: '#FED7D7' }}>
                    📨 {stats.pendingAppeals} обращений
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
              <button 
                className="btn-secondary" 
                onClick={handleRefresh}
                disabled={refreshing}
                style={{ padding: '6px 14px', fontSize: '12px', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                {refreshing ? '⏳' : '🔄'}
              </button>
              <Link to={`/club/${club.id}`} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                📋 Подробнее
              </Link>
            </div>
          </div>

          {/* ПРОГРЕСС-БАР АКТИВНОСТИ */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.8 }}>
              <span>Активность клуба</span>
              <span>{stats.participants > 0 ? Math.round((stats.activeParticipants / stats.participants) * 100) : 0}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '5px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '3px',
              marginTop: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${stats.participants > 0 ? (stats.activeParticipants / stats.participants) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A227, #E8D9A8)',
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '13px',
            opacity: 0.8
          }}>
            {stats.newParticipantsThisMonth > 0 && (
              <span>🆕 +{stats.newParticipantsThisMonth} новых участников за месяц</span>
            )}
            {stats.participants > 0 && (
              <span>📊 {Math.round((stats.activeParticipants / stats.participants) * 100)}% активных</span>
            )}
          </div>
        </div>

        {/* УВЕДОМЛЕНИЯ О PENDING ЗАПРОСАХ */}
        {stats.pendingRequests > 0 && (
          <div style={{ 
            padding: '10px 16px', 
            background: '#FBF4DC', 
            borderLeft: '4px solid #C9A227',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>⚠️ У вас {stats.pendingRequests} запросов на тьюторов ожидают рассмотрения</span>
            <button 
              className="btn-primary" 
              style={{ padding: '4px 16px', fontSize: '12px' }}
              onClick={() => navigate('/tutor-requests')}
            >
              Перейти →
            </button>
          </div>
        )}

        {/* ===== СТАТИСТИКА ===== */}
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="number">{stats.participants}</div>
            <div className="label">👥 Участников</div>
            <div style={{ fontSize: '11px', color: '#16845B', marginTop: '2px' }}>
              🟢 {stats.activeParticipants} активных
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="number">{stats.events}</div>
            <div className="label">📅 Мероприятий</div>
            <div style={{ fontSize: '11px', color: '#8A6A00', marginTop: '2px' }}>
              📆 {stats.eventsThisMonth} за этот месяц
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="number">{stats.achievements}</div>
            <div className="label">🏆 Достижений</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="number">{stats.upcomingEvents}</div>
            <div className="label">📅 Предстоящих</div>
          </div>
        </div>

        {/* ============================================================
            БЫСТРЫЕ ДЕЙСТВИЯ
            ============================================================ */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            ⚡ Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
              onClick={() => navigate('/manage-achievements')}
            >
              🏆 Добавить достижение
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', background: '#174A7E', color: 'white', border: 'none' }}
              onClick={() => navigate('/tutor-requests')}
            >
              🤝 Запросить тьютора
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', background: '#B3262E', color: 'white', border: 'none' }}
              onClick={() => navigate('/appeals')}
            >
              📨 Обратиться к руководству
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', background: '#16845B', color: 'white', border: 'none' }}
              onClick={() => navigate('/reports')}
            >
              📋 Создать отчёт
            </button>
          </div>
        </div>

        {/* ============================================================
            ВКЛАДКИ
            ============================================================ */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          {['overview', 'members', 'events', 'achievements', 'activity'].map((tab) => {
            const labels = {
              overview: '📊 Обзор',
              members: `👥 Участники (${participants.length})`,
              events: `📅 Мероприятия (${events.length})`,
              achievements: `🏆 Достижения (${achievements.length})`,
              activity: '📋 Активность'
            };
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: selectedTab === tab ? '#0B1F3A' : 'transparent',
                  color: selectedTab === tab ? 'white' : '#667085',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: selectedTab === tab ? '600' : '500',
                  fontSize: '13px',
                  transition: 'all 0.3s ease'
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ============================================================
            ВКЛАДКА: ОБЗОР
            ============================================================ */}
        {selectedTab === 'overview' && (
          <div>
            <div className="grid-2">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                    👥 Недавние участники
                  </h3>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '11px', background: '#174A7E', color: 'white', border: 'none' }}
                    onClick={() => setSelectedTab('members')}
                  >
                    Все →
                  </button>
                </div>
                {recentParticipants.length === 0 ? (
                  <p style={{ color: '#98A2B3', fontSize: '13px' }}>Пока нет участников</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentParticipants.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/participant/${p.id}`)}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {p.full_name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0B1F3A' }}>
                            {p.full_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                            {p.class_name || 'Класс не указан'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                    📅 Предстоящие мероприятия
                  </h3>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '11px', background: '#174A7E', color: 'white', border: 'none' }}
                    onClick={() => setSelectedTab('events')}
                  >
                    Все →
                  </button>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p style={{ color: '#98A2B3', fontSize: '13px' }}>Нет предстоящих мероприятий</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {upcomingEvents.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          padding: '10px 14px',
                          borderLeft: '3px solid #174A7E',
                          background: '#F8FAFC',
                          borderRadius: '0 8px 8px 0'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0B1F3A' }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                          📅 {new Date(e.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          {e.location && ` • 📍 ${e.location}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {recentAchievements.length > 0 && (
              <div className="card" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                    🏆 Последние достижения
                  </h3>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '11px', background: '#174A7E', color: 'white', border: 'none' }}
                    onClick={() => setSelectedTab('achievements')}
                  >
                    Все →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentAchievements.map((a) => (
                    <div key={a.id} style={{
                      padding: '10px 14px',
                      borderLeft: '3px solid #C9A227',
                      background: '#FBF4DC',
                      borderRadius: '0 8px 8px 0'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0B1F3A' }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8A6A00' }}>
                        👤 {a.participant_name || 'Участник'}
                        {a.achievement_date && ` • 📅 ${new Date(a.achievement_date).toLocaleDateString('ru-RU')}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: УЧАСТНИКИ
            ============================================================ */}
        {selectedTab === 'members' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                👥 Участники клуба ({participants.length})
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['all', 'active', 'inactive'].map((status) => {
                  const labels = { all: 'Все', active: '🟢 Активные', inactive: '🔴 Неактивные' };
                  return (
                    <button
                      key={status}
                      className={filterStatus === status ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '4px 12px', fontSize: '11px' }}
                      onClick={() => setFilterStatus(status)}
                    >
                      {labels[status]}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>
                {filterStatus === 'all' ? 'В клубе пока нет участников' : 'Нет участников с таким статусом'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredParticipants.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/participant/${p.id}`)}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {p.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0B1F3A' }}>
                        {p.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                        {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 12px',
                      borderRadius: '12px',
                      background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                      color: p.status === 'active' ? '#16845B' : '#B3262E'
                    }}>
                      {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: МЕРОПРИЯТИЯ
            ============================================================ */}
        {selectedTab === 'events' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                📅 Все мероприятия ({events.length})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => navigate('/events')}
              >
                Управление
              </button>
            </div>
            {events.length === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>
                Мероприятий пока нет. Создайте первое!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.slice(0, 10).map((e) => (
                  <div key={e.id} style={{
                    padding: '12px 16px',
                    borderLeft: '3px solid #174A7E',
                    background: '#F8FAFC',
                    borderRadius: '0 8px 8px 0'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0B1F3A' }}>
                      {e.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                      📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                      {e.location && ` • 📍 ${e.location}`}
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
        {selectedTab === 'achievements' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                🏆 Достижения клуба ({achievements.length})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px', background: '#C9A227', color: '#0B1F3A' }}
                onClick={() => navigate('/manage-achievements')}
              >
                Управление
              </button>
            </div>
            {achievements.length === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>
                Достижений пока нет. Добавьте первое!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {achievements.slice(0, 10).map((a) => (
                  <div key={a.id} style={{
                    padding: '12px 16px',
                    borderLeft: '3px solid #C9A227',
                    background: '#FBF4DC',
                    borderRadius: '0 8px 8px 0'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0B1F3A' }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8A6A00' }}>
                      👤 {a.participant_name || 'Участник'}
                      {a.achievement_date && ` • 📅 ${new Date(a.achievement_date).toLocaleDateString('ru-RU')}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: АКТИВНОСТЬ
            ============================================================ */}
        {selectedTab === 'activity' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📋 Последняя активность
            </h3>
            {recentActivity.length === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>
                Активности пока нет
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentActivity.map((activity) => (
                  <div key={activity.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${activity.color}`
                  }}>
                    <span style={{ fontSize: '20px' }}>{activity.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#0B1F3A' }}>
                        {activity.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                        📅 {new Date(activity.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}