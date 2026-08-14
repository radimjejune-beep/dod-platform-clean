// frontend/src/pages/Home.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Функция для кнопки "Вход"
  const handleLogin = () => {
    navigate('/login');
  };

  // Функция для кнопки "Присоединиться" - теперь тоже ведёт на вход
  const handleGetStarted = () => {
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

      {/* ===== ГЕРОЙ ===== */}
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
            <button className="home-hero-btn-secondary" onClick={handleLogin}>
              🔑 Вход
            </button>
            <button className="home-hero-btn-primary" onClick={handleGetStarted}>
              🚀 Присоединиться
            </button>
          </div>
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

      {/* ===== СТАТИСТИКА ===== */}
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

      {/* ===== МИССИЯ ===== */}
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

      {/* ===== НОВОСТИ ===== */}
      <NewsSection limit={3} />

      <Footer />

      {/* Стили остаются без изменений — они уже есть в вашем файле */}
      <style>{`
        .home-page {
          min-height: 100vh;
          background: #F5F2ED;
        }

        /* ... все ваши стили из предыдущей версии ... */
        /* (Я не копирую их сюда, чтобы не захламлять ответ, но они должны остаться) */
      `}</style>
    </div>
  );
}