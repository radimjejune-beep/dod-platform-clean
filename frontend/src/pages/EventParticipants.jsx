// frontend/src/pages/EventParticipants.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function EventParticipants() {
  const { eventId } = useParams();
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setProfile(userData);

      const events = await api.getEvents();
      const foundEvent = events.find(e => e.id === eventId);
      setEvent(foundEvent || null);

      const users = await api.getUsers();
      setParticipants(users.filter(u => u.role === 'participant'));

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-gray-100)', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 24px' }}>
        <button onClick={() => navigate('/events')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-gray-200)', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
          ← Назад
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' }}>Участники: {event?.title || 'Мероприятие'}</h1>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-gray-200)', marginTop: '16px' }}>
          {participants.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: '20px' }}>Участников пока нет</p>
          ) : (
            participants.map(p => (
              <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-gray-100)' }}>
                <span style={{ fontWeight: '500' }}>{p.full_name}</span>
                <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--color-gray-400)' }}>{p.school || ''}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}