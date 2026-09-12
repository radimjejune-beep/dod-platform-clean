// frontend/src/pages/Clubs.jsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { countOf } from '../lib/format';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

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
            background: var(--color-gray-100);
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid var(--color-gray-200);
            border-top-color: var(--color-gold);
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
            <h1>{title}</h1>
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
            <div className="empty-icon"><Icon name="club" /></div>
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
                <div className="club-card-icon"><Icon name="club" /></div>
                <h3 className="club-card-title">{club.name}</h3>
                <p className="club-card-location">{club.city || 'Город не указан'}</p>
                <div className="club-card-stats">
                  <span>{countOf(club.participants_count || 0, 'участник', 'участника', 'участников')}</span>
                  {club.coordinators_count !== undefined && (
                    <span>{club.coordinators_count || 0} координаторов</span>
                  )}
                </div>
                {isClubCoordinator && (
                  <div className="club-card-badge">Ваш КЮД</div>
                )}

                {/* Сотрудники КЮДа — отдельным переходом, чтобы не
                    открывать карточку клуба ради состава */}
                <button
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/clubs/${club.id}/staff`); }}
                >
                  Сотрудники
                </button>

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
          background: var(--color-gray-100);
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
          color: var(--color-primary);
          margin: 0;
        }

        .page-header-left p {
          color: var(--color-gray-500);
          margin: 4px 0 0 0;
        }

        .page-header-count {
          font-size: 14px;
          color: var(--color-gray-500);
          padding: 6px 16px;
          background: var(--color-gray-50);
          border-radius: 20px;
          border: 1px solid var(--color-gray-200);
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
          border: 1px solid var(--color-gray-200);
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-decoration: none;
          color: var(--color-primary-dark);
          transition: all 0.3s ease;
          text-align: center;
          cursor: pointer;
          position: relative;
        }

        .club-card:hover {
          box-shadow: 0 12px 40px rgba(10,22,40,0.10);
          border-color: var(--color-gold);
        }

        .club-card-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .club-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: var(--color-primary-dark);
          margin: 0 0 4px 0;
        }

        .club-card-location {
          font-size: 14px;
          color: var(--color-gray-500);
          margin: 0 0 12px 0;
        }

        .club-card-stats {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 13px;
          color: var(--color-gray-600);
          padding-top: 12px;
          border-top: 1px solid var(--color-gray-100);
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
          background: var(--color-gold-pale);
          color: var(--color-gold);
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .club-card-arrow {
          position: absolute;
          bottom: 12px;
          right: 16px;
          font-size: 18px;
          color: var(--color-gray-200);
          transition: all 0.3s ease;
        }

        .club-card:hover .club-card-arrow {
          color: var(--color-gold);
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
          border: 1px dashed var(--color-gray-200);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: var(--color-gray-700);
          margin-bottom: 4px;
        }

        .empty-state p {
          font-size: 14px;
          color: var(--color-gray-500);
        }

        /* ============================================================
           СПИННЕР
           ============================================================ */
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-gray-200);
          border-top-color: var(--color-gold);
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