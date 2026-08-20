// frontend/src/pages/Clubs.jsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

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
      
      // ============================================================
      // ФИЛЬТРАЦИЯ ДЛЯ КООРДИНАТОРА КЮДА
      // ============================================================
      if (user.role === 'club_coordinator') {
        let coordinatorClubId = user.club_id;
        
        if (!coordinatorClubId) {
          try {
            const coordResponse = await fetch(
              `https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${user.id}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const coordData = await coordResponse.json();
            if (coordData && coordData.length > 0) {
              coordinatorClubId = coordData[0].club_id;
            }
          } catch (e) {
            console.log('Ошибка получения координатора:', e);
          }
        }

        if (coordinatorClubId) {
          const userClub = data.find(c => c.id === coordinatorClubId);
          if (userClub) {
            setClubs([userClub]);
          } else {
            setClubs([]);
          }
        } else {
          setClubs([]);
        }
      } else {
        setClubs(data || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки клубов:', err);
    } finally {
      setLoading(false);
    }
  };

  const isClubCoordinator = profile?.role === 'club_coordinator';
  const title = isClubCoordinator ? 'Мой КЮД' : 'КЮДы';
  const subtitle = isClubCoordinator 
    ? 'Информация о вашем клубе юных дипломатов' 
    : 'Клубы юных дипломатов';

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <style>{`
          .page-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #F0EDE8;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E4DFD8;
            border-top-color: #C9A227;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ============================================================
           ЗАГОЛОВОК
           ============================================================ */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>🏫 {title}</h1>
            <p>{subtitle}</p>
          </div>
          {clubs.length > 0 && (
            <div className="page-header-count">
              {clubs.length} {clubs.length === 1 ? 'клуб' : 'клуба'}
            </div>
          )}
        </div>

        {/* ============================================================
           СПИСОК КЛУБОВ
           ============================================================ */}
        {clubs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏫</div>
            <h3>Нет клубов</h3>
            <p>Клубы юных дипломатов пока не созданы</p>
          </div>
        ) : (
          <div className="clubs-grid">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="club-card"
                onClick={() => navigate(`/club/${club.id}`)}
              >
                <div className="club-card-icon">🏫</div>
                <h3 className="club-card-title">{club.name}</h3>
                <p className="club-card-location">{club.city || 'Город не указан'}</p>
                <div className="club-card-stats">
                  <span>👥 {club.participants_count || 0} участников</span>
                  {club.coordinators_count !== undefined && (
                    <span>👤 {club.coordinators_count || 0} координаторов</span>
                  )}
                </div>
                {isClubCoordinator && (
                  <div className="club-card-badge">👑 Ваш КЮД</div>
                )}
                <div className="club-card-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      <style>{`
        /* ============================================================
           ОСНОВНЫЕ СТИЛИ
           ============================================================ */
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        /* ============================================================
           ЗАГОЛОВОК
           ============================================================ */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0;
        }

        .page-header-left p {
          color: #667085;
          margin: 4px 0 0 0;
        }

        .page-header-count {
          font-size: 14px;
          color: #667085;
          padding: 6px 16px;
          background: #F8FAFC;
          border-radius: 20px;
          border: 1px solid #E2E7EF;
          white-space: nowrap;
        }

        /* ============================================================
           СЕТКА КЛУБОВ
           ============================================================ */
        .clubs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        /* ============================================================
           КАРТОЧКА КЛУБА
           ============================================================ */
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
          cursor: pointer;
          position: relative;
        }

        .club-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px rgba(10,22,40,0.10);
          border-color: #C9A227;
        }

        .club-card-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .club-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #0A1628;
          margin: 0 0 4px 0;
        }

        .club-card-location {
          font-size: 14px;
          color: #8A8480;
          margin: 0 0 12px 0;
        }

        .club-card-stats {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 13px;
          color: #6B6561;
          padding-top: 12px;
          border-top: 1px solid #F0EDE8;
        }

        .club-card-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .club-card-badge {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 14px;
          background: #FBF4DC;
          color: #C9A227;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .club-card-arrow {
          position: absolute;
          bottom: 12px;
          right: 16px;
          font-size: 18px;
          color: #E4DFD8;
          transition: all 0.3s ease;
        }

        .club-card:hover .club-card-arrow {
          color: #C9A227;
          transform: translateX(4px);
        }

        /* ============================================================
           EMPTY STATE
           ============================================================ */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 1px dashed #E4DFD8;
        }

        .empty-icon {
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

        /* ============================================================
           СПИННЕР
           ============================================================ */
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #E4DFD8;
          border-top-color: #C9A227;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .container-page {
            padding: 20px 24px 32px;
          }
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .clubs-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px;
          }

          .club-card {
            padding: 20px;
          }

          .club-card-icon {
            font-size: 34px;
          }

          .club-card-title {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .page-header-left h1 {
            font-size: 20px;
          }

          .clubs-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .club-card {
            padding: 16px;
          }

          .club-card-icon {
            font-size: 28px;
          }

          .club-card-stats {
            flex-direction: column;
            gap: 4px;
          }

          .club-card-arrow {
            display: none;
          }

          .empty-state {
            padding: 40px 16px;
          }

          .empty-icon {
            font-size: 36px;
          }

          .empty-state h3 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}