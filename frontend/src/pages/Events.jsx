// frontend/src/pages/Events.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Events() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
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
      setProfile(userData);
      const eventsData = await api.getEvents();
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
      <div style={{ fontSize: '18px', color: '#667085' }}>⏳ Загрузка...</div>
    </div>;
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📅</span>
          <div>
            <h1>Мероприятия</h1>
            <p>Всего мероприятий: {events.length}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Мероприятий пока нет</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((event) => (
              <div key={event.id} className="list-item" style={{ 
                borderLeftColor: event.type === 'internal' ? '#174A7E' : 
                                event.type === 'outgoing' ? '#C9A227' : '#B3262E' 
              }}>
                <div className="title">{event.title}</div>
                <div className="subtitle">
                  📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                  {event.location && ` 📍 ${event.location}`}
                  {event.club_name && ` 🏫 ${event.club_name}`}
                </div>
                {event.description && <div className="meta">{event.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}