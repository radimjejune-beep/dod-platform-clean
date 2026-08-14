// frontend/src/pages/ClubRating.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubRating() {
  const [profile, setProfile] = useState(null);
  const [rating, setRating] = useState([]);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
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

      if (userData.role !== 'club_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Получаем клуб координатора
      const clubsData = await api.getClubs();
      const coordinatorClub = clubsData.find(c => 
        c.coordinator_id === userData.id || 
        c.leader_id === userData.id
      );

      if (!coordinatorClub) {
        setLoading(false);
        return;
      }

      setClub(coordinatorClub);

      // Загружаем рейтинг
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/club-rating/${coordinatorClub.id}?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      setRating(data || []);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (position) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `#${position + 1}`;
  };

  const getMedalColor = (position) => {
    if (position === 0) return '#C9A227';
    if (position === 1) return '#A0A0A0';
    if (position === 2) return '#CD7F32';
    return '#667085';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">🏫</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Клуб не найден</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>🏆</span>
          <div>
            <h1>Рейтинг участников</h1>
            <p>
              {club.name} • {rating.length} участников
            </p>
          </div>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-3" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="number">{rating.length}</div>
            <div className="label">👥 Участников</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="number">
              {rating.reduce((sum, p) => sum + (p.events_count || 0), 0)}
            </div>
            <div className="label">📅 Всего мероприятий</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="number">
              {rating.reduce((sum, p) => sum + (p.achievements_count || 0), 0)}
            </div>
            <div className="label">🏆 Всего достижений</div>
          </div>
        </div>

        {/* ТАБЛИЦА РЕЙТИНГА */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📊 Таблица лидеров
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={selectedPeriod === 'all' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setSelectedPeriod('all')}
              >
                Все время
              </button>
              <button
                className={selectedPeriod === 'month' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setSelectedPeriod('month')}
              >
                Месяц
              </button>
              <button
                className={selectedPeriod === 'week' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setSelectedPeriod('week')}
              >
                Неделя
              </button>
            </div>
          </div>

          {rating.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📊</div>
              <p>Нет данных для рейтинга</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rating.map((participant, index) => (
                <div
                  key={participant.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 16px',
                    background: index < 3 ? '#FBF4DC' : '#F8FAFC',
                    borderRadius: '10px',
                    border: index < 3 ? '1.5px solid #C9A227' : '1px solid #E2E7EF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => navigate(`/participant/${participant.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  {/* МЕСТО */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: getMedalColor(index),
                    color: index < 3 ? '#0B1F3A' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: index < 3 ? '20px' : '13px',
                    flexShrink: 0
                  }}>
                    {getMedalEmoji(index)}
                  </div>

                  {/* АВАТАР */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: participant.avatar_url ? `url(${participant.avatar_url}) center/cover` : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {!participant.avatar_url && participant.full_name?.charAt(0)}
                  </div>

                  {/* ИНФОРМАЦИЯ */}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#0B1F3A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {participant.full_name}
                      {participant.is_president && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          background: '#C9A227',
                          color: '#0B1F3A',
                          borderRadius: '12px',
                          fontWeight: '700'
                        }}>
                          👑 Президент
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                      {participant.school || 'Школа не указана'} • {participant.class_name || 'Класс не указан'}
                    </div>
                  </div>

                  {/* ОЧКИ */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: '#667085',
                    flexShrink: 0
                  }}>
                    <span>📅 {participant.events_count || 0}</span>
                    <span>🏆 {participant.achievements_count || 0}</span>
                    <span style={{
                      fontWeight: '700',
                      color: '#C9A227',
                      fontSize: '16px',
                      minWidth: '50px',
                      textAlign: 'right'
                    }}>
                      {participant.rating_points || 0} ⭐
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