// frontend/src/pages/Home.jsx

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
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#0B1F3A' 
      }}>
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
          <div className="home-hero-badge">🇷🇺 Официальное движение</div>
          
          <div className="home-hero-emblem">
            <img 
              src={logo} 
              alt="ДОД «Дипломаты будущего»" 
              className="home-hero-logo"
            />
          </div>
          
          <h1>
            <span>«Дипломаты Будущего»</span>
          </h1>
          <p className="home-hero-motto">
            Воспитываем новое поколение дипломатов, развиваем лидерские качества<br />
            и формируем гражданскую позицию у молодёжи
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

      <section className="home-about">
        <div className="home-about-container">
          <div className="home-about-grid">
            <div className="home-about-text">
              <span className="home-about-tag">О движении</span>
              <h2>Воспитываем<br />дипломатов будущего</h2>
              <p>
                <strong>Межрегиональное детское общественное Движение по формированию дипломатической культуры «Дипломаты Будущего»</strong> 
                — это пространство для развития лидерских качеств, дипломатических навыков и гражданской позиции у молодёжи.
              </p>
              <div className="home-about-values">
                <div className="home-about-value">
                  <div className="home-about-value-icon">🤝</div>
                  <div>
                    <h4>Дипломатия</h4>
                    <p>Развитие навыков переговоров и международного общения</p>
                  </div>
                </div>
                <div className="home-about-value">
                  <div className="home-about-value-icon">🎯</div>
                  <div>
                    <h4>Лидерство</h4>
                    <p>Формирование активной гражданской позиции</p>
                  </div>
                </div>
                <div className="home-about-value">
                  <div className="home-about-value-icon">🌐</div>
                  <div>
                    <h4>Международное общение</h4>
                    <p>Участие в международных проектах и программах</p>
                  </div>
                </div>
                <div className="home-about-value">
                  <div className="home-about-value-icon">⭐</div>
                  <div>
                    <h4>Гражданская позиция</h4>
                    <p>Воспитание ответственности и патриотизма</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="home-about-image">
              <div className="home-about-image-placeholder">
                <span>🕊️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-numbers">
        <div className="home-numbers-container">
          <div className="home-numbers-item">
            <span className="home-numbers-number">10+</span>
            <span className="home-numbers-label">Клубов юных дипломатов</span>
          </div>
          <div className="home-numbers-item">
            <span className="home-numbers-number">500+</span>
            <span className="home-numbers-label">Активных участников</span>
          </div>
          <div className="home-numbers-item">
            <span className="home-numbers-number">50+</span>
            <span className="home-numbers-label">Мероприятий проведено</span>
          </div>
          <div className="home-numbers-item">
            <span className="home-numbers-number">8</span>
            <span className="home-numbers-label">Лет успешной работы</span>
          </div>
        </div>
      </section>

      <NewsSection limit={3} />

      <section className="home-contacts-section">
        <div className="home-contacts-container">
          <div className="home-contacts-header">
            <span className="home-contacts-tag">Свяжитесь с нами</span>
            <h2>Мы всегда на связи</h2>
            <p>Официальные контакты ДОД «Дипломаты будущего»</p>
          </div>
          <div className="home-contacts-grid">
            <div className="home-contacts-card">
              <div className="home-contacts-card-icon">📍</div>
              <h4>Адрес</h4>
              <p>119200, Москва,<br />Смоленская-Сенная площадь,<br />дом 32/34 (АРД)</p>
            </div>
            <div className="home-contacts-card">
              <div className="home-contacts-card-icon">📞</div>
              <h4>Телефон</h4>
              <p><a href="tel:+74992443285">+7 (499) 244-32-85</a></p>
            </div>
            <div className="home-contacts-card">
              <div className="home-contacts-card-icon">✉️</div>
              <h4>Email</h4>
              <p><a href="mailto:diplomatsothefuture@mail.ru">diplomatsothefuture@mail.ru</a></p>
            </div>
            <div className="home-contacts-card">
              <div className="home-contacts-card-icon">🌐</div>
              <h4>Сайт</h4>
              <p><a href="https://www.diplomatsothefuture.ru" target="_blank" rel="noopener noreferrer">diplomatsothefuture.ru</a></p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .home-page {
          min-height: 100vh;
          background: #F5F2ED;
        }

        .home-hero {
          position: relative;
          min-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 24px 40px;
          overflow: hidden;
          background: linear-gradient(160deg, #0B1F3A 0%, #051224 100%);
        }

        .home-hero-bg {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image:
            radial-gradient(ellipse at 30% 30%, rgba(201, 162, 39, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, rgba(23, 74, 126, 0.08) 0%, transparent 50%);
          animation: heroFloat 30s ease-in-out infinite alternate;
        }

        @keyframes heroFloat {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.05); }
          100% { transform: translate(30px, -30px) scale(0.95); }
        }

        .home-hero-content {
          position: relative;
          z-index: 1;
          max-width: 900px;
        }

        .home-hero-badge {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 20px;
          background: rgba(201, 162, 39, 0.15);
          color: #E8D9A8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 16px;
          border: 1px solid rgba(201, 162, 39, 0.12);
        }

        .home-hero-emblem {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .home-hero-logo {
          height: 40px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 4px 20px rgba(201, 162, 39, 0.15));
        }

        .home-hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
          line-height: 1.2;
          letter-spacing: -0.5px;
        }

        .home-hero h1 span {
          background: linear-gradient(135deg, #C9A227, #F5E6A8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .home-hero-motto {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.7;
          margin-bottom: 24px;
          font-weight: 300;
        }

        .home-hero-buttons {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .home-hero-btn-primary {
          padding: 14px 36px;
          background: linear-gradient(135deg, #C9A227, #B8921F);
          color: #0B1F3A;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 24px rgba(201, 162, 39, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .home-hero-btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 40px rgba(201, 162, 39, 0.3);
        }

        .home-hero-btn-secondary {
          padding: 14px 32px;
          background: rgba(255, 255, 255, 0.06);
          color: white;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .home-hero-btn-secondary:hover {
          border-color: rgba(201, 162, 39, 0.4);
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-3px);
        }

        .home-hero-register {
          margin-top: 14px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.35);
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
          gap: 14px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .home-hero-partner-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.2);
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .home-hero-ard {
          height: 24px;
          width: auto;
          object-fit: contain;
          opacity: 0.35;
          transition: opacity 0.3s ease;
        }

        .home-hero-ard:hover {
          opacity: 0.7;
        }

        .home-about {
          padding: 60px 24px;
          background: #FFFFFF;
        }

        .home-about-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .home-about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          align-items: center;
        }

        .home-about-tag {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 12px;
          background: #FBF4DC;
          color: #8A6A00;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .home-about-text h2 {
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 700;
          color: #0B1F3A;
          line-height: 1.2;
          margin-bottom: 14px;
        }

        .home-about-text p {
          font-size: 15px;
          color: #667085;
          line-height: 1.8;
          margin-bottom: 24px;
        }

        .home-about-text p strong {
          color: #0B1F3A;
        }

        .home-about-values {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .home-about-value {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #F8FAFC;
          border-radius: 12px;
          border: 1px solid #F4F6F9;
          transition: all 0.3s ease;
        }

        .home-about-value:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.06);
          border-color: #C9A227;
        }

        .home-about-value-icon {
          font-size: 22px;
          flex-shrink: 0;
        }

        .home-about-value h4 {
          font-size: 14px;
          font-weight: 600;
          color: #0B1F3A;
          margin: 0 0 2px 0;
        }

        .home-about-value p {
          font-size: 12px;
          color: #98A2B3;
          margin: 0;
          line-height: 1.4;
        }

        .home-about-image-placeholder {
          width: 100%;
          aspect-ratio: 4/3;
          background: linear-gradient(145deg, #F5F2ED, #E8E3DC);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 72px;
          border: 1px solid #E2E7EF;
          position: relative;
          overflow: hidden;
        }

        .home-about-image-placeholder::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(201, 162, 39, 0.05), transparent 70%);
        }

        .home-numbers {
          padding: 50px 24px;
          background: linear-gradient(135deg, #0B1F3A, #07152B);
        }

        .home-numbers-container {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .home-numbers-item {
          text-align: center;
        }

        .home-numbers-number {
          display: block;
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 700;
          color: #E8D9A8;
          line-height: 1.2;
        }

        .home-numbers-label {
          display: block;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 4px;
          font-weight: 300;
        }

        .home-contacts-section {
          padding: 60px 24px;
          background: #FFFFFF;
        }

        .home-contacts-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .home-contacts-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .home-contacts-tag {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 12px;
          background: #EAF2FA;
          color: #174A7E;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .home-contacts-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #0B1F3A;
          margin-bottom: 6px;
        }

        .home-contacts-header p {
          font-size: 15px;
          color: #667085;
        }

        .home-contacts-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .home-contacts-card {
          text-align: center;
          padding: 24px 16px;
          background: #F8FAFC;
          border-radius: 14px;
          border: 1px solid #F4F6F9;
          transition: all 0.3s ease;
        }

        .home-contacts-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.06);
          border-color: #C9A227;
        }

        .home-contacts-card-icon {
          font-size: 28px;
          margin-bottom: 10px;
        }

        .home-contacts-card h4 {
          font-size: 14px;
          font-weight: 600;
          color: #0B1F3A;
          margin: 0 0 6px 0;
        }

        .home-contacts-card p {
          font-size: 13px;
          color: #667085;
          margin: 0;
          line-height: 1.5;
        }

        .home-contacts-card p a {
          color: #174A7E;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .home-contacts-card p a:hover {
          color: #C9A227;
        }

        @media (max-width: 992px) {
          .home-hero {
            min-height: 60vh;
            padding: 50px 20px 30px;
          }
          .home-hero h1 {
            font-size: 30px;
          }
          .home-about-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          .home-about-image-placeholder {
            aspect-ratio: 16/9;
          }
          .home-numbers-container {
            grid-template-columns: repeat(2, 1fr);
          }
          .home-contacts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .home-hero {
            min-height: 50vh;
            padding: 40px 16px 24px;
          }

          .home-hero h1 {
            font-size: 24px;
          }

          .home-hero-motto {
            font-size: 14px;
          }

          .home-hero-emblem {
            width: 56px;
            height: 56px;
          }

          .home-hero-logo {
            height: 34px;
          }

          .home-hero-btn-primary,
          .home-hero-btn-secondary {
            padding: 12px 24px;
            font-size: 14px;
            width: 100%;
            justify-content: center;
          }

          .home-hero-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
          }

          .home-about {
            padding: 40px 16px;
          }

          .home-about-text h2 {
            font-size: 26px;
          }

          .home-about-values {
            grid-template-columns: 1fr;
          }

          .home-numbers {
            padding: 32px 16px;
          }

          .home-numbers-container {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .home-numbers-number {
            font-size: 28px;
          }

          .home-contacts-section {
            padding: 40px 16px;
          }

          .home-contacts-header h2 {
            font-size: 26px;
          }

          .home-contacts-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .home-contacts-card {
            padding: 16px 12px;
          }

          .home-hero-badge {
            font-size: 10px;
            padding: 3px 12px;
          }
        }

        @media (max-width: 480px) {
          .home-hero h1 {
            font-size: 20px;
          }

          .home-hero-motto {
            font-size: 13px;
          }

          .home-hero-emblem {
            width: 48px;
            height: 48px;
          }

          .home-hero-logo {
            height: 28px;
          }

          .home-hero-btn-primary,
          .home-hero-btn-secondary {
            padding: 10px 20px;
            font-size: 13px;
          }

          .home-contacts-grid {
            grid-template-columns: 1fr;
          }

          .home-numbers-container {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .home-numbers-number {
            font-size: 24px;
          }

          .home-numbers-label {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}