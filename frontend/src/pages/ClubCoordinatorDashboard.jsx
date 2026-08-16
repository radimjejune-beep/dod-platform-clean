// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div>⏳ Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>❌ {error}</h2>
        <button onClick={() => window.location.reload()}>Обновить</button>
      </div>
    );
  }

  return (
    <div>
      <Navigation profile={profile} />
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>🏫 Дашборд координатора КЮДа</h1>
        <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <p><strong>👤:</strong> {profile?.full_name}</p>
          <p><strong>📧:</strong> {profile?.email}</p>
          <p><strong>🎭:</strong> {profile?.role}</p>
          <p><strong>🏫:</strong> {profile?.club_id || 'Не указан'}</p>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => navigate('/events')}
            style={{ padding: '10px 20px', background: '#174A7E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}
          >
            📅 Мероприятия
          </button>
          <button 
            onClick={() => navigate('/participants')}
            style={{ padding: '10px 20px', background: '#16845B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}
          >
            👥 Участники
          </button>
          <button 
            onClick={() => navigate('/profile')}
            style={{ padding: '10px 20px', background: '#C9A227', color: '#0B1F3A', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            👤 Профиль
          </button>
        </div>
      </div>
    </div>
  );
}