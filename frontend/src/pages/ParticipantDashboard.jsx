// frontend/src/pages/ParticipantDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import PresidentSection from '../components/PresidentSection';

export default function ParticipantDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    total_events: 0,
    attended_events: 0,
    achievements_count: 0,
    level: 1,
    next_level: 2,
    progress: 0
  });
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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

      if (userData.role !== 'participant') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем статистику
      const statsData = await api.getParticipantStats(userData.id);
      
      if (statsData) {
        setStats({
          total_events: statsData.total_events || 0,
          attended_events: statsData.attended_events || 0,
          achievements_count: statsData.achievements_count || 0,
          level: statsData.level || 1,
          next_level: (statsData.level || 1) + 1,
          progress: statsData.progress || 0
        });
        setRecentAchievements(statsData.recent_achievements || []);
      }

      // Загружаем предстоящие мероприятия
      const eventsData = await api.getEvents();
      const now = new Date();
      const upcoming = (eventsData || [])
        .filter(e => new Date(e.event_date) >= now)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 5);
      setUpcomingEvents(upcoming);

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

  const getLevelEmoji = (level) => {
    const emojis = {
      1: '🌱',
      2: '🌟',
      3: '⭐',
      4: '👔',
      5: '🏛️',
      6: '👑',
      7: '💎'
    };
    return emojis[level] || '⭐';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
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
            {/* АВАТАР */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: 'white',
              fontWeight: 'bold',
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.3)'
            }}>
              {!profile?.avatar_url && getInitials(profile?.full_name)}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                {profile?.full_name}
              </h1>
              <p style={{ opacity: 0.7, margin: '4px 0 0 0' }}>
                {profile?.school || 'Школа не указана'} • {profile?.class_name || 'Класс не указан'}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  {getLevelEmoji(stats.level)} {getLevelName(stats.level)}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  🏆 {stats.achievements_count} достижений
                </span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  📅 {stats.total_events} мероприятий
                </span>
              </div>
            </div>

            <Link to="/profile" className="btn-secondary" style={{ alignSelf: 'flex-start' }}>
              ✏️ Редактировать
            </Link>
          </div>

          {/* ПРОГРЕСС-БАР УРОВНЯ */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.8 }}>
              <span>Уровень {stats.level} → {stats.next_level}</span>
              <span>{Math.round(stats.progress)}%</span>
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
                width: `${stats.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A227, #E8D9A8)',
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
              До следующего уровня: {5 - (stats.total_events % 5)} мероприятий
            </div>
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
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'overview' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'overview' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'overview' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            📊 Обзор
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'achievements' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'achievements' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'achievements' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            🏆 Достижения ({stats.achievements_count})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'events' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'events' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'events' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            📅 Мероприятия ({stats.total_events})
          </button>
          <button
            onClick={() => setActiveTab('interests')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'interests' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'interests' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'interests' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            🎯 Интересы
          </button>
        </div>

        {/* ============================================================
            ВКЛАДКА: ОБЗОР
            ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            {/* СТАТИСТИКА */}
            <div className="grid-4" style={{ marginBottom: '24px' }}>
              <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
                <div className="number">{stats.total_events}</div>
                <div className="label">📅 Всего мероприятий</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
                <div className="number">{stats.attended_events}</div>
                <div className="label">✅ Посещено</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
                <div className="number">{stats.achievements_count}</div>
                <div className="label">🏆 Достижений</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
                <div className="number">{stats.level}</div>
                <div className="label">📊 Уровень</div>
              </div>
            </div>

            {/* ПОСЛЕДНИЕ ДОСТИЖЕНИЯ */}
            {recentAchievements.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
                  🏆 Последние достижения
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentAchievements.map((a) => (
                    <div key={a.id} className="list-item" style={{ borderLeftColor: '#C9A227' }}>
                      <div className="title">{a.title}</div>
                      <div className="subtitle">
                        📅 {new Date(a.achievement_date || a.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ПРЕДСТОЯЩИЕ МЕРОПРИЯТИЯ */}
            {upcomingEvents.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
                  📅 Ближайшие мероприятия
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                      <div className="title">{e.title}</div>
                      <div className="subtitle">
                        📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                        {e.location && ` • 📍 ${e.location}`}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '12px', padding: '8px' }}
                  onClick={() => navigate('/events')}
                >
                  Все мероприятия →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: ДОСТИЖЕНИЯ
            ============================================================ */}
        {activeTab === 'achievements' && (
          <div className="card">
            {stats.achievements_count === 0 ? (
              <div className="empty-state">
                <div className="icon">🌟</div>
                <p style={{ color: '#667085' }}>У вас пока нет достижений</p>
                <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                  Участвуйте в мероприятиях и получайте награды!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {recentAchievements.map((a) => (
                  <div key={a.id} className="card" style={{ 
                    padding: '16px', 
                    borderLeft: '4px solid #C9A227',
                    marginBottom: '0'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>{a.title}</div>
                    {a.description && (
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>{a.description}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '8px' }}>
                      📅 {new Date(a.achievement_date || a.created_at).toLocaleDateString('ru-RU')}
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
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                Мои мероприятия
              </h3>
              <button
                className="btn-secondary"
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={() => navigate('/events')}
              >
                Все мероприятия →
              </button>
            </div>
            {stats.total_events === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <p>Вы ещё не участвовали в мероприятиях</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingEvents.length > 0 && (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', paddingBottom: '8px', borderBottom: '1px solid #E2E7EF' }}>
                      📅 Предстоящие
                    </div>
                    {upcomingEvents.map((e) => (
                      <div key={e.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                        <div className="title">{e.title}</div>
                        <div className="subtitle">
                          📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                          {e.location && ` • 📍 ${e.location}`}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: ИНТЕРЕСЫ
            ============================================================ */}
        {activeTab === 'interests' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🎯 Мои интересы
            </h3>
            {profile?.interests ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {profile.interests.split(',').map((interest, index) => (
                  <span key={index} className="tag tag-blue" style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {interest.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: '#667085' }}>
                Интересы не указаны. <Link to="/profile" style={{ color: '#C9A227' }}>Добавить интересы</Link>
              </p>
            )}

            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginTop: '24px', marginBottom: '16px' }}>
              💪 Мои навыки
            </h3>
            {profile?.skills ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {profile.skills.split(',').map((skill, index) => (
                  <span key={index} className="tag tag-gold" style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {skill.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: '#667085' }}>
                Навыки не указаны. <Link to="/profile" style={{ color: '#C9A227' }}>Добавить навыки</Link>
              </p>
            )}

            {profile?.bio && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginTop: '24px', marginBottom: '16px' }}>
                  📝 О себе
                </h3>
                <p style={{ color: '#667085', lineHeight: '1.6' }}>{profile.bio}</p>
              </>
            )}
          </div>
        )}
      </div>
      // И в конце рендера, после всех вкладок, добавь:
{/* ===== РАЗДЕЛ ПРЕЗИДЕНТА ===== */}
<PresidentSection profile={profile} />
    </div>
  );
}