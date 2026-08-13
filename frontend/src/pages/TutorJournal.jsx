// frontend/src/pages/TutorJournal.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TutorJournal() {
  const { eventId } = useParams();
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      // ============================================================
      // ТОЛЬКО ТЬЮТОР
      // ============================================================
      if (userData.role !== 'tutor') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем мероприятие
      const eventsData = await api.getEvents();
      const foundEvent = eventsData.find(e => e.id === eventId);
      setEvent(foundEvent || null);

      // Загружаем участников
      const participantsData = await api.getParticipants();
      setParticipants(participantsData || []);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Проверка доступа к журналу
  const canView = profile?.role === 'tutor';

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
            <p style={{ color: '#667085' }}>Только тьюторы могут просматривать журнал</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">❌</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Мероприятие не найдено</p>
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

        <div className="page-header" style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '32px' }}>📋</span>
          <div>
            <h1>{event.title}</h1>
            <p>
              📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
              {event.location && ` • 📍 ${event.location}`}
            </p>
          </div>
        </div>

        {/* ЖУРНАЛ УЧАСТНИКОВ */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            👥 Участники мероприятия
          </h3>

          {participants.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👀</div>
              <p>Участников, отметившихся на мероприятии, пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {participants.map((p, index) => (
                <div key={p.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                  <div className="title">
                    #{index + 1} {p.full_name}
                  </div>
                  <div className="subtitle">
                    {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                    {p.club_name && ` • 🏫 ${p.club_name}`}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => {}} // TODO: открыть форму оценки
                    >
                      📝 Оценить
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => navigate(`/participant/${p.id}`)}
                    >
                      👁️ Профиль
                    </button>
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