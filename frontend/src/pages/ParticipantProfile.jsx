// frontend/src/pages/ParticipantProfile.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import AssignClubModal from '../components/AssignClubModal';
import Icon from '../components/Icon';
import ParentInviteCard from '../components/ParentInviteCard';
import AttendanceStrip from '../components/AttendanceStrip';

export default function ParticipantProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
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

      // Карточка отдельным запросом: список пользователей закрыт для
      // руководителя КЮДа и тьютора, и они видели «Участник не найден»
      // вместо карточки собственного участника
      const found = await api.getUser(id);
      
      if (!found || found.error) {
        setLoading(false);
        setError(found?.error ? api.describeApiError(found, 'Участник не найден') : 'Участник не найден');
        return;
      }
      setParticipant(found);

      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/achievements', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const allAchievements = await response.json();
          console.log('📥 Все достижения:', allAchievements);
          
          const userAchievements = Array.isArray(allAchievements) 
            ? allAchievements.filter(a => a.participant_id === id)
            : [];
          setAchievements(userAchievements);
          console.log('📥 Достижения участника:', userAchievements.length);
        }
      } catch (err) {
        console.error('Ошибка получения достижений:', err);
      }

      try {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/events', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const allEvents = await response.json();
          console.log('📥 Все мероприятия:', allEvents);
          
          const userEvents = Array.isArray(allEvents)
            ? allEvents.filter(e => e.participant_id === id)
            : [];
          setEvents(userEvents);
          console.log('📥 Мероприятия участника:', userEvents.length);
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
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
            <div className="icon"><Icon name="error" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-error)' }}>{error}</p>
            <button className="btn-primary" onClick={() => { setError(''); loadData(); }}>
              Попробовать снова
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
            <div className="icon"><Icon name="lock" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Доступ запрещён</p>
            <p style={{ color: 'var(--color-gray-500)' }}>У вас нет прав для просмотра этого профиля</p>
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
            <div className="icon"><Icon name="error" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Участник не найден</p>
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

        {/* УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: participant.avatar_url ? `url(${participant.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              color: 'white',
              fontWeight: 'bold',
              flexShrink: 0,
              border: '3px solid var(--color-gold)'
            }}>
              {!participant.avatar_url && getInitials(participant.full_name)}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>
                {participant.full_name}
              </h1>
              <p style={{ color: 'var(--color-gray-500)', marginTop: '4px' }}>
                {participant.school || 'Школа не указана'} • {participant.class_name || 'Класс не указан'}
                {participant.club_name && ` • ${participant.club_name}`}
              </p>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={participant.status === 'active' ? 'status-active' : 'status-inactive'}>
                  {participant.status === 'active' ? 'Активен' : 'Неактивен'}
                </span>
                <span className="tag tag-blue">{participant.role === 'participant' ? 'Участник' : participant.role}</span>
                {participant.birth_date && (
                  <span className="tag tag-gold">{formatDate(participant.birth_date)}</span>
                )}
                {participant.city && (
                  <span className="tag tag-blue">{participant.city}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {canEdit && (
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/participant/${participant.id}/edit`)}
                >
                  Редактировать
                </button>
              )}
              {canEdit && profile?.role === 'admin' && (
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => setShowAssignModal(true)}
                >
                  Прикрепить к КЮДу
                </button>
              )}
            </div>
          </div>

          {participant.club_name && (
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid var(--color-gray-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
                Клуб: <strong>{participant.club_name}</strong>
              </span>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid var(--color-gray-200)',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'info' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'info' ? 'white' : 'var(--color-gray-500)',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'info' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveTab('interests')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'interests' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'interests' ? 'white' : 'var(--color-gray-500)',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'interests' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            Интересы и навыки
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'achievements' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'achievements' ? 'white' : 'var(--color-gray-500)',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'achievements' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            Достижения ({achievements.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'events' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'events' ? 'white' : 'var(--color-gray-500)',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'events' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            Мероприятия ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('bio')}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: activeTab === 'bio' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'bio' ? 'white' : 'var(--color-gray-500)',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'bio' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            О себе
          </button>
        </div>

        {activeTab === 'info' && (
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>ФИО</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Email</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.email || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Телефон</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.phone || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Дата рождения</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{formatDate(participant.birth_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Город</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.city || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Школа</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.school || 'Не указана'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Класс</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.class_name || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Клуб</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{participant.club_name || 'Не привязан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Статус</div>
                <div style={{ fontWeight: '500', color: participant.status === 'active' ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {participant.status === 'active' ? 'Активен' : 'Неактивен'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Дата регистрации</div>
                <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>
                  {new Date(participant.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Без привязанного родителя согласий у участника не будет, а без
            согласий он не поедет на мероприятия — поэтому блок стоит прямо
            в основной вкладке карточки, а не спрятан отдельной вкладкой */}
        {activeTab === 'info' && (
          <ParentInviteCard participantId={participant.id} participantName={participant.full_name} />
        )}

        {/* Посещаемость занятий: три пропуска подряд видно сразу, а в
            журнале из сорока строк — нет */}
        {activeTab === 'info' && <AttendanceStrip participantId={participant.id} />}

        {activeTab === 'interests' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
              Интересы
            </h3>
            {interests.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>Интересы не указаны</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {interests.map((interest, index) => (
                  <span key={index} className="tag tag-blue" style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {interest}
                  </span>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginTop: '24px', marginBottom: '16px' }}>
              Навыки
            </h3>
            {skills.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>Навыки не указаны</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skills.map((skill, index) => (
                  <span key={index} className="tag tag-gold" style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {participant.education && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginTop: '24px', marginBottom: '16px' }}>
                  Образование
                </h3>
                <p style={{ color: 'var(--color-gray-500)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {participant.education}
                </p>
              </>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
              Достижения
            </h3>
            {achievements.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>Достижений пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {achievements.map((a) => (
                  <div key={a.id} className="list-item" style={{ borderLeftColor: 'var(--color-gold)' }}>
                    <div className="title">{a.title}</div>
                    {a.description && <div className="subtitle">{a.description}</div>}
                    <div className="meta">
                      {new Date(a.achievement_date || a.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
              Мероприятия
            </h3>
            {events.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>Мероприятий пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {events.map((e) => (
                  <div key={e.id} className="list-item" style={{
                    borderLeftColor: e.status === 'attended' || e.status === 'confirmed' ? 'var(--color-success)' : 'var(--color-gold)'
                  }}>
                    <div className="title">{e.title}</div>
                    <div className="subtitle">
                      {new Date(e.event_date).toLocaleDateString('ru-RU')}
                      {e.location && ` • ${e.location}`}
                    </div>
                    <div className="meta">
                      <span className={e.status === 'attended' || e.status === 'confirmed' ? 'status-active' : 'status-pending'}>
                        {e.status === 'attended' || e.status === 'confirmed' ? 'Участвовал' : 'Записан'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bio' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '12px' }}>
              О себе
            </h3>
            {participant.bio ? (
              <p style={{ color: 'var(--color-gray-500)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {participant.bio}
              </p>
            ) : (
              <p style={{ color: 'var(--color-gray-400)' }}>Участник пока ничего не рассказал о себе</p>
            )}

            {participant.achievements && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginTop: '24px', marginBottom: '12px' }}>
                  Личные достижения
                </h3>
                <p style={{ color: 'var(--color-gray-500)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {participant.achievements}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <AssignClubModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          loadData();
        }}
        userId={participant?.id}
        userFullName={participant?.full_name}
        currentClubId={participant?.club_id}
        onAssigned={() => {
          loadData();
        }}
      />
    </div>
  );
}