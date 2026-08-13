// frontend/src/pages/ParticipantProfile.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ParticipantProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
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

      // Загружаем всех пользователей и ищем нужного
      const users = await api.getUsers();
      const found = users.find(u => u.id === id);
      setParticipant(found || null);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
        <Navigation profile={profile} />
        <div style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>❌ Участник не найден</h1>
          <button onClick={() => navigate('/participants')} style={{ padding: '10px 20px', marginTop: '20px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 24px' }}>
        <button onClick={() => navigate('/participants')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #D5DCE7', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
          ← Назад
        </button>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>{participant.full_name}</h1>
          <p><strong>Email:</strong> {participant.email}</p>
          <p><strong>Роль:</strong> {participant.role}</p>
          <p><strong>Школа:</strong> {participant.school || '—'}</p>
          <p><strong>Класс:</strong> {participant.class_name || '—'}</p>
          <p><strong>Телефон:</strong> {participant.phone || '—'}</p>
          <p><strong>Статус:</strong> {participant.status || 'active'}</p>
        </div>
      </div>
    </div>
  );
}