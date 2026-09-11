// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { roleLabel } from '../lib/roles';

export default function ClubCoordinatorDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Проверяем пользователя
        const meRes = await fetch('https://dod-backend.relaxdev.ru/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!meRes.ok) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        const user = await meRes.json();
        setProfile(user);

        if (user.role !== 'club_coordinator') {
          navigate('/dashboard');
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Ошибка:', err);
        setError('Ошибка загрузки');
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>{error}</h2>
        <button onClick={() => window.location.reload()}>Обновить</button>
      </div>
    );
  }

  return (
    <div>
      <Navigation profile={profile} />
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Дашборд координатора КЮДа</h1>
        <div style={{ background: 'var(--color-gray-50)', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <p><strong>ФИО:</strong> {profile?.full_name}</p>
          <p><strong>Почта:</strong> {profile?.email}</p>
          <p><strong>Роль:</strong> {roleLabel(profile?.role)}</p>
          <p><strong>КЮД:</strong> {profile?.club_id || 'Не указан'}</p>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => navigate('/events')}
            style={{ padding: '10px 20px', background: 'var(--color-primary-light)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}
          >
            Мероприятия
          </button>
          <button 
            onClick={() => navigate('/participants')}
            style={{ padding: '10px 20px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}
          >
            Участники
          </button>
          <button 
            onClick={() => navigate('/profile')}
            style={{ padding: '10px 20px', background: 'var(--color-gold)', color: 'var(--color-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Профиль
          </button>
        </div>
      </div>
    </div>
  );
}