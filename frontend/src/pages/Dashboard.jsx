// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    participants: 0,
    clubs: 0,
    events: 0,
    achievements: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await api.getMe();
        if (userData && userData.id) {
          setUser(userData);
          
          const [users, clubs, events, achievements] = await Promise.all([
            api.getUsers(),
            api.getClubs(),
            api.getEvents(),
            api.getAchievements()
          ]);
          
          setStats({
            participants: users.filter(u => u.role === 'participant').length,
            clubs: clubs.length,
            events: events.length,
            achievements: achievements.length
          });
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Ошибка:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={user} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📊</span>
          <div>
            <h1>👋 Привет, {user?.full_name || 'Гость'}!</h1>
            <p>Добро пожаловать в систему управления ДОД «Дипломаты будущего»</p>
          </div>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-4">
          <div className="stat-card">
            <div className="number">{stats.participants}</div>
            <div className="label">👥 Участников</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.clubs}</div>
            <div className="label">🏫 Клубов</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.events}</div>
            <div className="label">📅 Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.achievements}</div>
            <div className="label">🏆 Достижений</div>
          </div>
        </div>

        {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            🚀 Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/clubs" className="btn-primary" style={{ textDecoration: 'none' }}>
              🏫 Клубы
            </Link>
            <Link to="/events" className="btn-primary" style={{ textDecoration: 'none' }}>
              📅 Мероприятия
            </Link>
            <Link to="/participants" className="btn-primary" style={{ textDecoration: 'none' }}>
              👥 Участники
            </Link>
            <Link to="/profile" className="btn-secondary" style={{ textDecoration: 'none' }}>
              👤 Профиль
            </Link>
          </div>
        </div>

        {/* ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#667085' }}>Email</div>
              <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#667085' }}>Роль</div>
              <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{user?.role}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#667085' }}>Статус</div>
              <div className="status-active">🟢 Активен</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}