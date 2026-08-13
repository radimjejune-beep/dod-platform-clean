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
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      // Загружаем участника
      const usersData = await api.getUsers();
      const found = usersData.find(u => u.id === id);
      
      if (!found) {
        setLoading(false);
        return;
      }
      setParticipant(found);

      // Загружаем достижения и мероприятия
      const [achievementsData, eventsData] = await Promise.all([
        api.getAchievements(),
        api.getEvents()
      ]);

      setAchievements(achievementsData.filter(a => a.participant_id === id));
      setEvents(eventsData.filter(e => e.participant_id === id));

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ПРОВЕРКА ПРАВ
  // ============================================================
  const canEdit = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'club_coordinator' ||
                  profile?.role === 'tutor';

  // Может ли пользователь видеть этот профиль
  const canView = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'club_coordinator' ||
                  profile?.role === 'tutor' ||
                  profile?.id === id ||  // Сам участник
                  profile?.role === 'parent'; // Родитель

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
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

        {message && (
          <div className="message-success">{message}</div>
        )}

        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
                {participant.full_name}
              </h1>
              <p style={{ color: '#667085' }}>
                {participant.school || 'Школа не указана'} • {participant.class_name || 'Класс не указан'}
                {participant.club_name && ` • 🏫 ${participant.club_name}`}
              </p>
              <div style={{ marginTop: '8px' }}>
                <span className={participant.status === 'active' ? 'status-active' : 'status-inactive'}>
                  {participant.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                </span>
                <span className="tag tag-blue" style={{ marginLeft: '8px' }}>
                  {participant.role === 'participant' ? '👤 Участник' : participant.role}
                </span>
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

        {/* ДОСТИЖЕНИЯ */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            🏆 Достижения ({achievements.length})
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

        {/* МЕРОПРИЯТИЯ */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📅 Участие в мероприятиях ({events.length})
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
                    <span className={e.status === 'attended' || e.status === 'confirmed' ? 'status-active' : 'status-inactive'}>
                      {e.status === 'attended' || e.status === 'confirmed' ? '✅ Участвовал' : '📝 Записан'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}