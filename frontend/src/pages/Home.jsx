// frontend/src/pages/Home.jsx - ТОЛЬКО СТИЛИ МЕНЯЕМ!

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import NewsSection from '../components/NewsSection';
import logo from '../assets/Image.png';
import ardLogo from '../assets/АРДЛОГО.png';

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const user = await response.json();
          setProfile(user);
        }
      } catch (err) {
        console.error('Ошибка:', err);
      }
    }
    setLoading(false);
  };

  const handleGetStarted = () => {
    if (profile) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0B1F3A' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="home-page">
      <Navigation profile={profile} />

      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="home-hero-content">
          <div className="home-hero-emblem">
            <img 
              src={logo} 
              alt="ДОД «Дипломаты будущего»" 
              className="home-hero-logo"
            />
          </div>
          <h1>
            Детское общественное движение<br />
            <span>«Дипломаты будущего»</span>
          </h1>
          <p className="home-hero-motto">
            «Воспитываем новое поколение дипломатов,<br />
            развиваем лидерские качества и формируем<br />
            гражданскую позицию у молодёжи»
          </p>
          <div className="home-hero-buttons">
            {profile ? (
              <button className="home-hero-btn-primary" onClick={handleGetStarted}>
                📊 Перейти в кабинет
              </button>
            ) : (
              <>
                <button className="home-hero-btn-secondary" onClick={handleLogin}>
                  🔑 Вход
                </button>
                <button className="home-hero-btn-primary" onClick={handleGetStarted}>
                  🚀 Присоединиться
                </button>
              </>
            )}
          </div>
          {!profile && (
            <p className="home-hero-register">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
          )}
          <div className="home-hero-partners">
            <span className="home-hero-partner-label">При поддержке</span>
            <img 
              src={ardLogo} 
              alt="Ассоциация российских дипломатов" 
              className="home-hero-ard"
            />
          </div>
        </div>
      </section>

      <section className="home-stats">
        <div className="home-stats-container">
          <div className="home-stat-item">
            <span className="home-stat-number">10+</span>
            <span className="home-stat-label">КЮДов</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat-item">
            <span className="home-stat-number">500+</span>
            <span className="home-stat-label">Участников</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat-item">
            <span className="home-stat-number">50+</span>
            <span className="home-stat-label">Мероприятий</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat-item">
            <span className="home-stat-number">8</span>
            <span className="home-stat-label">Лет работы</span>
          </div>
        </div>
      </section>

      <section className="home-mission">
        <div className="home-mission-container">
          <div className="home-mission-icon">🕊️</div>
          <h2>Наша миссия</h2>
          <p>
            Воспитание нового поколения дипломатов,<br />
            развитие лидерских качеств и формирование<br />
            гражданской позиции у молодёжи
          </p>
          <div className="home-mission-values">
            <div className="home-mission-value">
              <span>🤝</span>
              <span>Дипломатия</span>
            </div>
            <div className="home-mission-value">
              <span>🎯</span>
              <span>Лидерство</span>
            </div>
            <div className="home-mission-value">
              <span>🌐</span>
              <span>Международное общение</span>
            </div>
            <div className="home-mission-value">
              <span>⭐</span>
              <span>Гражданская позиция</span>
            </div>
          </div>
        </div>
      </section>

      <NewsSection limit={3} />

      <Footer />

      <style>{`
        .home-page {
          min-height: 100vh;
          background: #F5F2ED;
        }

        .home-hero {
          position: relative;
          min-height: 460px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 50px 24px;
          overflow: hidden;
          background: linear-gradient(145deg, #0B1F3A 0%, #051224 100%);
        }

        .home-hero-bg {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image:
            radial-gradient(ellipse at 30% 40%, rgba(201, 162, 39, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(23, 74, 126, 0.06) 0%, transparent 50%);
          animation: heroFloat 30s ease-in-out infinite alternate;
        }

        @keyframes heroFloat {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.05); }
          100% { transform: translate(20px, -20px) scale(0.95); }
        }

        .home-hero-content {
          position: relative;
          z-index: 1;
          max-width: 820px;
        }

        .home-hero-emblem {
          width: 72px;
          height: 72px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .home-hero-logo {
          height: 48px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 20px rgba(201, 162, 39, 0.15));
        }

        .home-hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
          line-height: 1.2;
        }

        .home-hero h1 span {
          background: linear-gradient(135deg, #C9A227, #E8D9A8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .home-hero-motto {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
          margin-bottom: 26px;
          font-weight: 300;
          letter-spacing: 0.3px;
        }

        .home-hero-buttons {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .home-hero-btn-primary {
          padding: 12px 34px;
          background: linear-gradient(135deg, #C9A227, #B8921F);
          color: #0B1F3A;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 24px rgba(201, 162, 39, 0.25);
          letter-spacing: 0.3px;
        }

        .home-hero-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
        }

        .home-hero-btn-secondary {
          padding: 12px 30px;
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.3px;
        }

        .home-hero-btn-secondary:hover {
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-3px);
        }

        .home-hero-register {
          margin-top: 14px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
        }

        .home-hero-register a {
          color: #C9A227;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .home-hero-register a:hover {
          color: #E8D9A8;
        }

        .home-hero-partners {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .home-hero-partner-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .home-hero-ard {
          height: 26px;
          width: auto;
          object-fit: contain;
          opacity: 0.4;
          transition: opacity 0.3s ease;
        }

        .home-hero-ard:hover {
          opacity: 0.8;
        }

        .home-stats {
          margin-top: -28px;
          position: relative;
          z-index: 2;
          padding: 0 24px;
        }

        .home-stats-container {
          max-width: 920px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: white;
          border-radius: 14px;
          padding: 24px 28px;
          box-shadow: 0 12px 48px rgba(11, 31, 58, 0.06);
          border: 1px solid #E2E7EF;
        }

        .home-stat-item {
          text-align: center;
        }

        .home-stat-number {
          display: block;
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: #0B1F3A;
        }

        .home-stat-label {
          display: block;
          font-size: 12px;
          color: #667085;
          margin-top: 2px;
        }

        .home-stat-divider {
          width: 1px;
          background: #E2E7EF;
        }

        .home-mission {
          padding: 50px 24px;
          background: linear-gradient(145deg, #0B1F3A 0%, #051224 100%);
          margin-top: 36px;
          position: relative;
          overflow: hidden;
        }

        .home-mission::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(201, 162, 39, 0.03), transparent 70%);
          border-radius: 50%;
        }

        .home-mission-container {
          max-width: 820px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .home-mission-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .home-mission h2 {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
        }

        .home-mission p {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.8;
          margin-bottom: 24px;
          font-weight: 300;
        }

        .home-mission-values {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          max-width: 700px;
          margin: 0 auto;
        }

        .home-mission-value {
          text-align: center;
          padding: 14px 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }

        .home-mission-value:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-3px);
          border-color: rgba(201, 162, 39, 0.15);
        }

        .home-mission-value span:first-child {
          display: block;
          font-size: 22px;
          margin-bottom: 4px;
        }

        .home-mission-value span:last-child {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 400;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .home-hero {
            min-height: 360px;
            padding: 36px 20px;
          }

          .home-hero h1 {
            font-size: 26px;
          }

          .home-hero-motto {
            font-size: 14px;
          }

          .home-hero-btn-primary,
          .home-hero-btn-secondary {
            padding: 10px 22px;
            font-size: 14px;
          }

          .home-hero-logo {
            height: 38px;
          }

          .home-hero-ard {
            height: 20px;
          }

          .home-stats-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
            padding: 18px;
          }

          .home-stat-divider:nth-child(2) {
            display: none;
          }

          .home-mission-values {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .home-hero {
            min-height: 320px;
            padding: 28px 16px;
          }

          .home-hero h1 {
            font-size: 20px;
          }

          .home-hero-motto {
            font-size: 12px;
          }

          .home-hero-buttons {
            flex-direction: column;
            align-items: center;
          }

          .home-hero-btn-primary,
          .home-hero-btn-secondary {
            width: 100%;
            text-align: center;
            padding: 10px 16px;
            font-size: 13px;
          }

          .home-hero-emblem {
            width: 56px;
            height: 56px;
          }

          .home-hero-logo {
            height: 32px;
          }

          .home-stats-container {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 14px;
          }

          .home-stat-number {
            font-size: 20px;
          }

          .home-mission h2 {
            font-size: 20px;
          }

          .home-mission p {
            font-size: 13px;
          }

          .home-mission-values {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .home-mission-value span:first-child {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}