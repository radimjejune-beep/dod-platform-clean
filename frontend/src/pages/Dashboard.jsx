// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PageLayout from '../components/PageLayout';

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
          
          // Загружаем статистику
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
      title={`👋 Привет, ${user?.full_name || 'Гость'}!`}
      subtitle="Добро пожаловать в систему управления ДОД «Дипломаты будущего»"
      icon="📊"
      profile={user}
    >
      {/* СТАТИСТИКА */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#F8FAFC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #E2E7EF'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
            {stats.participants}
          </div>
          <div style={{ fontSize: '14px', color: '#667085' }}>👥 Участников</div>
        </div>
        <div style={{
          background: '#F8FAFC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #E2E7EF'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
            {stats.clubs}
          </div>
          <div style={{ fontSize: '14px', color: '#667085' }}>🏫 Клубов</div>
        </div>
        <div style={{
          background: '#F8FAFC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #E2E7EF'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
            {stats.events}
          </div>
          <div style={{ fontSize: '14px', color: '#667085' }}>📅 Мероприятий</div>
        </div>
        <div style={{
          background: '#F8FAFC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #E2E7EF'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
            {stats.achievements}
          </div>
          <div style={{ fontSize: '14px', color: '#667085' }}>🏆 Достижений</div>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ */}
      <div style={{
        background: '#F8FAFC',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #E2E7EF'
      }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '13px', color: '#667085' }}>Email</span>
            <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{user?.email}</div>
          </div>
          <div>
            <span style={{ fontSize: '13px', color: '#667085' }}>Роль</span>
            <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{user?.role}</div>
          </div>
          <div>
            <span style={{ fontSize: '13px', color: '#667085' }}>Статус</span>
            <div style={{ 
              fontWeight: '500', 
              color: '#16845B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#16845B'
              }}></span>
              Активен
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}