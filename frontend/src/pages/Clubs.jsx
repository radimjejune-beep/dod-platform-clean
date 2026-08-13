// frontend/src/pages/Clubs.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Clubs() {
  const [profile, setProfile] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participantsCount, setParticipantsCount] = useState({});
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

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      // Считаем количество участников для каждого клуба
      const counts = {};
      const participantsData = await api.getParticipants();
      const participants = participantsData || [];
      
      clubsData.forEach(club => {
        counts[club.id] = participants.filter(p => p.club_id === club.id).length;
      });
      setParticipantsCount(counts);
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

  const isCoordinator = profile?.role === 'club_coordinator';

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>🏫</span>
          <div>
            <h1>{isCoordinator ? 'Мой КЮД' : 'Клубы юных дипломатов'}</h1>
            <p>
              {isCoordinator 
                ? 'Клуб, в котором вы являетесь координатором' 
                : `Всего клубов: ${clubs.length}`}
            </p>
          </div>
        </div>

        {clubs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏫</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>
              {isCoordinator ? 'Клуб не найден' : 'КЮДов пока нет'}
            </p>
            {isCoordinator && (
              <p style={{ color: '#667085' }}>
                Вы не привязаны ни к одному клубу. Обратитесь к администратору для назначения.
              </p>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px' 
          }}>
            {clubs.map((club) => (
              <div 
                key={club.id} 
                className="card"
                style={{
                  cursor: 'pointer',
                  border: isCoordinator ? '2px solid #C9A227' : '1px solid #E2E7EF',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(`/club/${club.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isCoordinator && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#C9A227',
                    color: '#0B1F3A',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    boxShadow: '0 2px 8px rgba(201, 162, 39, 0.3)'
                  }}>
                    ⭐ Ваш КЮД
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🏛️
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                      {club.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      👥 {participantsCount[club.id] || 0} участников
                    </div>
                  </div>
                </div>

                {club.description && (
                  <p style={{ 
                    color: '#667085', 
                    fontSize: '14px', 
                    margin: '8px 0 16px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {club.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid #F4F6F9'
                }}>
                  <span style={{ fontSize: '13px', color: '#98A2B3' }}>
                    {club.created_at && `Создан: ${new Date(club.created_at).toLocaleDateString('ru-RU')}`}
                  </span>
                  <span style={{ color: '#C9A227', fontWeight: '600', fontSize: '14px' }}>
                    Подробнее →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}