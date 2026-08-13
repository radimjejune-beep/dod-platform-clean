// frontend/src/pages/Events.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PageLayout from '../components/PageLayout';

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
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#F4F6F9'
      }}>
        <div style={{ fontSize: '18px', color: '#667085' }}>⏳ Загрузка...</div>
      </div>
    );
  }

  return (
    <PageLayout 
      title="📅 Мероприятия"
      subtitle={`Всего мероприятий: ${events.length}`}
      icon="📅"
      profile={profile}
    >
      {events.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: '#667085'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p>Мероприятий пока нет</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                padding: '16px 20px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E7EF',
                borderLeft: `4px solid ${
                  event.type === 'internal' ? '#174A7E' : 
                  event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                }`
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '16px', color: '#0B1F3A' }}>
                {event.title}
              </div>
              <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                {event.location && ` 📍 ${event.location}`}
                {event.club_name && ` 🏫 ${event.club_name}`}
              </div>
              {event.description && (
                <div style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                  {event.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}