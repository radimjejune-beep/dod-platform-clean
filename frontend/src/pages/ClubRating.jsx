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

      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/club-rating/${coordinatorClub.id}?limit=50`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {/* ❌ УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📊 Таблица лидеров
          </h3>

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
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: index === 0 ? '#C9A227' : index === 1 ? '#A0A0A0' : index === 2 ? '#CD7F32' : '#667085',
                    color: index < 3 ? '#0B1F3A' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: index < 3 ? '20px' : '13px',
                    flexShrink: 0
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {participant.full_name?.charAt(0) || '?'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                      {participant.full_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                      {participant.school || 'Школа не указана'} • {participant.class_name || 'Класс не указан'}
                    </div>
                  </div>

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