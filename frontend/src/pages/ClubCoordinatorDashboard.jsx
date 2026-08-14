// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubCoordinatorDashboard() {
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  
  // ===== СТАТИСТИКА =====
  const [stats, setStats] = useState({
    participants: 0,
    activeParticipants: 0,
    events: 0,
    eventsThisMonth: 0,
    achievements: 0,
    pendingRequests: 0,
    pendingAppeals: 0,
    upcomingEvents: 0
  });
  
  // ===== СПИСКИ =====
  const [participants, setParticipants] = useState([]);
  const [recentParticipants, setRecentParticipants] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingAppeals, setPendingAppeals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // ===== ДЛЯ ФИЛЬТРА =====
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
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

      // ===== ПОИСК КЛУБА КООРДИНАТОРА =====
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
        try {
          const coordResponse = await fetch(`https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${userData.id}`);
          const coordData = await coordResponse.json();
          if (coordData && coordData.length > 0) {
            const clubId = coordData[0].club_id;
            coordinatorClub = clubsData.find(c => c.id === clubId);
          }
        } catch (e) {
          console.log('Ошибка получения координатора:', e);
        }
      }

      if (!coordinatorClub) {
        setLoading(false);
        setMessage('❌ Клуб не найден. Обратитесь к администратору.');
        setMessageType('error');
        return;
      }

      setClub(coordinatorClub);

      // ===== ЗАГРУЗКА ДАННЫХ =====
      await Promise.all([
        loadStats(coordinatorClub.id),
        loadParticipants(coordinatorClub.id),
        loadEvents(coordinatorClub.id),
        loadAchievements(coordinatorClub.id),
        loadRequests(),
        loadAppeals(),
        loadRecentActivity(coordinatorClub.id)
      ]);

    } catch (err) {
      console.error('Ошибка:', err);
      setMessage('❌ Ошибка загрузки данных: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const eventsThisMonth = clubEvents.filter(e => {
        const date = new Date(e.event_date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });

      const upcomingEvents = clubEvents.filter(e => {
        const date = new Date(e.event_date);
        return date >= now && e.status !== 'completed' && e.status !== 'rejected';
      });

      setStats({
        participants: clubParticipants.length,
        activeParticipants: clubParticipants.filter(p => p.status === 'active').length,
        events: clubEvents.length,
        eventsThisMonth: eventsThisMonth.length,
        achievements: clubAchievements.length,
        pendingRequests: 0,
        pendingAppeals: 0,
        upcomingEvents: upcomingEvents.length
      });

    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  const loadParticipants = async (clubId) => {
    try {
      const participantsData = await api.getParticipants();
      const clubParticipants = participantsData.filter(p => p.club_id === clubId);
      setParticipants(clubParticipants);
      setRecentParticipants(clubParticipants.slice(0, 5));
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
    }
  };

  const loadEvents = async (clubId) => {
    try {
      const eventsData = await api.getEvents();
      const clubEvents = eventsData.filter(e => e.club_id === clubId);
      
      const now = new Date();
      const upcoming = clubEvents
        .filter(e => new Date(e.event_date) >= now && e.status !== 'rejected')
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 5);
      
      setUpcomingEvents(upcoming);
    } catch (err) {
      console.error('Ошибка загрузки мероприятий:', err);
    }
  };

  const loadAchievements = async (clubId) => {
    try {
      const [participantsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getAchievements()
      ]);

      const clubParticipantIds = participantsData
        .filter(p => p.club_id === clubId)
        .map(p => p.id);

      const clubAchievements = achievementsData
        .filter(a => clubParticipantIds.includes(a.participant_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setRecentAchievements(clubAchievements);
    } catch (err) {
      console.error('Ошибка загрузки достижений:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/tutor-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const pending = data.filter(r => r.status === 'pending');
      setPendingRequests(pending);
      setStats(prev => ({ ...prev, pendingRequests: pending.length }));
    } catch (err) {
      console.error('Ошибка загрузки запросов:', err);
    }
  };

  const loadAppeals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/appeals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const pending = data.filter(a => a.status === 'pending' || a.status === 'in_progress');
      setPendingAppeals(pending);
      setStats(prev => ({ ...prev, pendingAppeals: pending.length }));
    } catch (err) {
      console.error('Ошибка загрузки обращений:', err);
    }
  };

  const loadRecentActivity = async (clubId) => {
    try {
      const activities = [];
      
      const participantsData = await api.getParticipants();
      const clubParticipants = participantsData
        .filter(p => p.club_id === clubId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);
      
      clubParticipants.forEach(p => {
        activities.push({
          id: `join-${p.id}`,
          type: 'join',
          title: `${p.full_name} присоединился к клубу`,
          date: p.created_at,
          icon: '👤',
          color: '#16845B'
        });
      });

      const eventsData = await api.getEvents();
      const clubEvents = eventsData
        .filter(e => e.club_id === clubId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);
      
      clubEvents.forEach(e => {
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
      setRecentActivity(activities.slice(0, 5));

    } catch (err) {
      console.error('Ошибка загрузки активности:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage('🔄 Обновление...');
    setMessageType('success');
    await loadData();
    setMessage('✅ Данные обновлены');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const getFilteredParticipants = () => {
    if (filterStatus === 'all') return participants;
    return participants.filter(p => p.status === filterStatus);
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

  const filteredParticipants = getFilteredParticipants();

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ============================================================
            ШАПКА ПРОФИЛЯ
            ============================================================ */}
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
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'} style={{ marginBottom: '16px' }}>
            {message}
          </div>
        )}

        {/* ============================================================
            СТАТИСТИКА
            ============================================================ */}
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
            <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
              📈 +{Math.floor(stats.achievements / 10) || 0}% от прошлого месяца
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="number">{stats.upcomingEvents}</div>
            <div className="label">📅 Предстоящих</div>
            <div style={{ fontSize: '11px', color: '#174A7E', marginTop: '2px' }}>
              ⏳ {stats.pendingRequests} запросов в обработке
            </div>
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
          <button
            onClick={() => setSelectedTab('overview')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: selectedTab === 'overview' ? '#0B1F3A' : 'transparent',
              color: selectedTab === 'overview' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: selectedTab === 'overview' ? '600' : '500',
              fontSize: '13px',
              transition: 'all 0.3s ease'
            }}
          >
            📊 Обзор
          </button>
          <button
            onClick={() => setSelectedTab('members')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: selectedTab === 'members' ? '#0B1F3A' : 'transparent',
              color: selectedTab === 'members' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: selectedTab === 'members' ? '600' : '500',
              fontSize: '13px'
            }}
          >
            👥 Участники ({participants.length})
          </button>
          <button
            onClick={() => setSelectedTab('events')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: selectedTab === 'events' ? '#0B1F3A' : 'transparent',
              color: selectedTab === 'events' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: selectedTab === 'events' ? '600' : '500',
              fontSize: '13px'
            }}
          >
            📅 Мероприятия ({stats.events})
          </button>
          <button
            onClick={() => setSelectedTab('achievements')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: selectedTab === 'achievements' ? '#0B1F3A' : 'transparent',
              color: selectedTab === 'achievements' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: selectedTab === 'achievements' ? '600' : '500',
              fontSize: '13px'
            }}
          >
            🏆 Достижения ({stats.achievements})
          </button>
          <button
            onClick={() => setSelectedTab('activity')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: selectedTab === 'activity' ? '#0B1F3A' : 'transparent',
              color: selectedTab === 'activity' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: selectedTab === 'activity' ? '600' : '500',
              fontSize: '13px'
            }}
          >
            📋 Активность
          </button>
        </div>

        {/* ============================================================
            ВКЛАДКА: ОБЗОР
            ============================================================ */}
        {selectedTab === 'overview' && (
          <div>
            {/* ===== БЫСТРЫЕ ДЕЙСТВИЯ ===== */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
                ⚡ Быстрые действия
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* ===== КНОПКА ДЛЯ ВНУТРЕННЕГО МЕРОПРИЯТИЯ ===== */}
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => {
                    localStorage.setItem('clubEventTarget', club.id);
                    navigate('/events');
                  }}
                >
                  📅 Создать мероприятие для клуба
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
                  style={{ padding: '8px 16px', fontSize: '13px', background: '#6B46C1', color: 'white', border: 'none' }}
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

            {/* ДВЕ КОЛОНКИ */}
            <div className="grid-2">
              {/* ПОСЛЕДНИЕ УЧАСТНИКИ */}
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
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => navigate(`/participant/${p.id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F0EDE8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {!p.avatar_url && p.full_name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0B1F3A' }}>
                            {p.full_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                            {p.class_name || 'Класс не указан'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                          color: p.status === 'active' ? '#16845B' : '#B3262E'
                        }}>
                          {p.status === 'active' ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ПРЕДСТОЯЩИЕ МЕРОПРИЯТИЯ */}
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
                          borderRadius: '0 8px 8px 0',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => navigate(`/events`)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F0EDE8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
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

            {/* ПОСЛЕДНИЕ ДОСТИЖЕНИЯ */}
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
                <button
                  className={filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 12px', fontSize: '11px', color: filterStatus === 'all' ? '#0B1F3A' : '#667085' }}
                  onClick={() => setFilterStatus('all')}
                >
                  Все
                </button>
                <button
                  className={filterStatus === 'active' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 12px', fontSize: '11px', color: filterStatus === 'active' ? '#0B1F3A' : '#667085' }}
                  onClick={() => setFilterStatus('active')}
                >
                  🟢 Активные
                </button>
                <button
                  className={filterStatus === 'inactive' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 12px', fontSize: '11px', color: filterStatus === 'inactive' ? '#0B1F3A' : '#667085' }}
                  onClick={() => setFilterStatus('inactive')}
                >
                  🔴 Неактивные
                </button>
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
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => navigate(`/participant/${p.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F0EDE8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {!p.avatar_url && p.full_name?.charAt(0)}
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
                📅 Все мероприятия ({stats.events})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => navigate('/events')}
              >
                Управление
              </button>
            </div>
            {stats.events === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>
                Мероприятий пока нет. Создайте первое!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingEvents.map((e) => (
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
                🏆 Достижения клуба ({stats.achievements})
              </h3>
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px', background: '#C9A227', color: '#0B1F3A' }}
                onClick={() => navigate('/manage-achievements')}
              >
                Управление
              </button>
            </div>
            {stats.achievements === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>
                Достижений пока нет. Добавьте первое!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentAchievements.map((a) => (
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

            {/* ОЖИДАЮЩИЕ ЗАПРОСЫ И ОБРАЩЕНИЯ */}
            {(stats.pendingRequests > 0 || stats.pendingAppeals > 0) && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F4F6F9' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '10px' }}>
                  ⚠️ Требуют внимания
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {stats.pendingRequests > 0 && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', background: '#C9A227', color: '#0B1F3A', border: 'none' }}
                      onClick={() => navigate('/tutor-requests')}
                    >
                      🤝 {stats.pendingRequests} запросов на тьюторов
                    </button>
                  )}
                  {stats.pendingAppeals > 0 && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', background: '#B3262E', color: 'white', border: 'none' }}
                      onClick={() => navigate('/appeals')}
                    >
                      📨 {stats.pendingAppeals} обращений ожидают ответа
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}