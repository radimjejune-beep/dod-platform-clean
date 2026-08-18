// frontend/src/pages/Clubs.jsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const user = await api.getMe();
        setProfile(user);

        const data = await api.getClubs();
        setClubs(data || []);
      } catch (err) {
        console.error('Ошибка загрузки клубов:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F5F6F8' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="container-page">
      {clubs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <h3>Нет клубов</h3>
          <p>Клубы юных дипломатов пока не созданы</p>
        </div>
      ) : (
        <div className="clubs-grid">
          {clubs.map((club) => (
            <Link key={club.id} to={`/club/${club.id}`} className="club-card">
              <div className="club-card-icon">🏫</div>
              <h3>{club.name}</h3>
              <p>{club.city || 'Город не указан'}</p>
              <div className="club-card-stats">
                <span>👥 {club.participants_count || 0} участников</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
          width: 100%;
        }

        .clubs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }

        .club-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-decoration: none;
          color: #0A1628;
          transition: all 0.3s ease;
          text-align: center;
        }

        .club-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.10);
          border-color: #C9A227;
        }

        .club-card-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .club-card h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .club-card p {
          font-size: 14px;
          color: #8A8480;
          margin: 0 0 12px 0;
        }

        .club-card-stats {
          font-size: 13px;
          color: #6B6561;
          padding-top: 12px;
          border-top: 1px solid #F0EDE8;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 1px dashed #E4DFD8;
          grid-column: 1 / -1;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: #4D4744;
          margin-bottom: 4px;
        }

        .empty-state p {
          font-size: 14px;
          color: #8A8480;
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px 16px 32px;
          }
          .clubs-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px 12px 24px;
          }
          .clubs-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}