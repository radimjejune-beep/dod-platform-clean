// frontend/src/pages/ParticipantProfile.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ParticipantProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setError('');
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      // Загружаем данные участника
      const usersData = await api.getUsers();
      const found = usersData.find(u => u.id === id);
      
      if (!found) {
        setLoading(false);
        setError('Участник не найден');
        return;
      }
      setParticipant(found);

      // ===== ЗАГРУЖАЕМ ДОСТИЖЕНИЯ =====
      const token = localStorage.getItem('token');
      
      try {
        const achievementsResponse = await fetch('https://dod-backend.relaxdev.ru/api/achievements', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (achievementsResponse.ok) {
          const allAchievements = await achievementsResponse.json();
          const userAchievements = Array.isArray(allAchievements) 
            ? allAchievements.filter(a => a.participant_id === id)
            : [];
          setAchievements(userAchievements);
        }
      } catch (err) {
        console.error('Ошибка получения достижений:', err);
      }

      // ===== ЗАГРУЖАЕМ МЕРОПРИЯТИЯ =====
      try {
        const eventsResponse = await fetch('https://dod-backend.relaxdev.ru/api/events', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (eventsResponse.ok) {
          const allEvents = await eventsResponse.json();
          const userEvents = Array.isArray(allEvents)
            ? allEvents.filter(e => e.participant_id === id)
            : [];
          setEvents(userEvents);
        }
      } catch (err) {
        console.error('Ошибка получения мероприятий:', err);
      }

    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'club_coordinator' ||
                  profile?.role === 'tutor' ||
                  profile?.id === id;

  const canView = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'club_coordinator' ||
                  profile?.role === 'tutor' ||
                  profile?.id === id ||
                  profile?.role === 'parent';

  const formatDate = (date) => {
    if (!date) return 'Не указана';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
  };

  const getInterestsList = (interests) => {
    if (!interests) return [];
    return interests.split(',').map(i => i.trim()).filter(Boolean);
  };

  const getSkillsList = (skills) => {
    if (!skills) return [];
    return skills.split(',').map(s => s.trim()).filter(Boolean);
  };

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
            <button className="btn-primary" onClick={() => { setError(''); loadData(); }}>
              🔄 Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>У вас нет прав для просмотра этого профиля</p>
          </div>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">❌</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Участник не найден</p>
          </div>
        </div>
      </div>
    );
  }

  const interests = getInterestsList(participant.interests);
  const skills = getSkillsList(participant.skills);

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '20px' }}
        >
          ← Назад
        </button>

        {/* ШАПКА ПРОФИЛЯ */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: participant.avatar_url ? `url(${participant.avatar_url}) center/cover` : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              color: 'white',
              fontWeight: 'bold',
              flexShrink: 0,
              border: '3px solid #C9A227'
            }}>
              {!participant.avatar_url && getInitials(participant.full_name)}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                {participant.full_name}
              </h1>
              <p style={{ color: '#667085', marginTop: '4px' }}>
                {participant.school || 'Школа не указана'} • {participant.class_name || 'Класс не указан'}
                {participant.club_name && ` • 🏫 ${participant.club_name}`}
              </p>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={participant.status === 'active' ? 'status-active' : 'status-inactive'}>
                  {participant.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                </span>
                <span className="tag tag-blue">👤 {participant.role === 'participant' ? 'Участник' : participant.role}</span>
                {participant.birth_date && (
                  <span className="tag tag-gold">🎂 {formatDate(participant.birth_date)}</span>
                )}
                {participant.city && (
                  <span className="tag tag-blue">📍 {participant.city}</span>
                )}
              </div>
            </div>

            {canEdit && (
              <button
                className="btn-primary"
                onClick={() => navigate(`/participant/${participant.id}/edit`)}
              >
                ✏️ Редактировать
              </button>
            )}
          </div>
        </div>

        {/* ВКЛАДКИ */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'info' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'info' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'info' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            📋 Информация
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
              fontSize: '14px'
            }}
          >
            🎯 Интересы и навыки
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
              fontSize: '14px'
            }}
          >
            🏆 Достижения ({achievements.length})
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
              fontSize: '14px'
            }}
          >
            📅 Мероприятия ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('bio')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'bio' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'bio' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'bio' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            📝 О себе
          </button>
        </div>

        {/* ===== ВКЛАДКА: ИНФОРМАЦИЯ ===== */}
        {activeTab === 'info' && (
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>ФИО</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Email</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.email || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Телефон</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.phone || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Дата рождения</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{formatDate(participant.birth_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Город</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.city || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Школа</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.school || 'Не указана'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Класс</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.class_name || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Клуб</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participant.club_name || 'Не привязан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Статус</div>
                <div style={{ fontWeight: '500', color: participant.status === 'active' ? '#16845B' : '#B3262E' }}>
                  {participant.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Дата регистрации</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                  {new Date(participant.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ВКЛАДКА: ИНТЕРЕСЫ И НАВЫКИ ===== */}
        {activeTab === 'interests' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🎯 Интересы
            </h3>
            {interests.length === 0 ? (
              <p style={{ color: '#667085' }}>Интересы не указаны</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {interests.map((interest, index) => (
                  <span key={index} className="tag tag-blue" style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {interest}
                  </span>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginTop: '24px', marginBottom: '16px' }}>
              💪 Навыки
            </h3>
            {skills.length === 0 ? (
              <p style={{ color: '#667085' }}>Навыки не указаны</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skills.map((skill, index) => (
                  <span key={index} className="tag tag-gold" style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* ===== ОБРАЗОВАНИЕ ===== */}
            {participant.education && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginTop: '24px', marginBottom: '16px' }}>
                  📚 Образование
                </h3>
                <p style={{ color: '#667085', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {participant.education}
                </p>
              </>
            )}
          </div>
        )}

        {/* ===== ВКЛАДКА: ДОСТИЖЕНИЯ ===== */}
        {activeTab === 'achievements' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Достижения
            </h3>
            {achievements.length === 0 ? (
              <p style={{ color: '#667085' }}>Достижений пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {achievements.map((a) => (
                  <div key={a.id} className="list-item" style={{ borderLeftColor: '#C9A227' }}>
                    <div className="title">{a.title}</div>
                    {a.description && <div className="subtitle">{a.description}</div>}
                    <div className="meta">
                      📅 {new Date(a.achievement_date || a.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ВКЛАДКА: МЕРОПРИЯТИЯ ===== */}
        {activeTab === 'events' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📅 Мероприятия
            </h3>
            {events.length === 0 ? (
              <p style={{ color: '#667085' }}>Мероприятий пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {events.map((e) => (
                  <div key={e.id} className="list-item" style={{
                    borderLeftColor: e.status === 'attended' || e.status === 'confirmed' ? '#16845B' : '#C9A227'
                  }}>
                    <div className="title">{e.title}</div>
                    <div className="subtitle">
                      📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                      {e.location && ` • 📍 ${e.location}`}
                    </div>
                    <div className="meta">
                      <span className={e.status === 'attended' || e.status === 'confirmed' ? 'status-active' : 'status-pending'}>
                        {e.status === 'attended' || e.status === 'confirmed' ? '✅ Участвовал' : '📝 Записан'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ВКЛАДКА: О СЕБЕ ===== */}
        {activeTab === 'bio' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
              📝 О себе
            </h3>
            {participant.bio ? (
              <p style={{ color: '#667085', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {participant.bio}
              </p>
            ) : (
              <p style={{ color: '#98A2B3' }}>Участник пока ничего не рассказал о себе</p>
            )}

            {/* ===== ЛИЧНЫЕ ДОСТИЖЕНИЯ ===== */}
            {participant.achievements && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginTop: '24px', marginBottom: '12px' }}>
                  🏅 Личные достижения
                </h3>
                <p style={{ color: '#667085', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {participant.achievements}
                </p>
              </>
            )}

            {/* ===== ОБРАЗОВАНИЕ (дубль, если не показано) ===== */}
            {participant.education && !participant.interests && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginTop: '24px', marginBottom: '12px' }}>
                  📚 Образование
                </h3>
                <p style={{ color: '#667085', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {participant.education}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}