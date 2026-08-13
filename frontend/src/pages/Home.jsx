// frontend/src/pages/Home.jsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
// import logo from '../assets/Image.png';
// import logoArd from '../assets/АРДЛОГО.png';

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
        // Простая проверка — если есть токен, пользователь авторизован
        setProfile({ token });
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

  // Настройки (статические)
  const settings = {
    site_name: 'Дипломаты будущего',
    hero_title: 'Добро пожаловать в ДОД «Дипломаты будущего»',
    hero_subtitle: 'Система управления движением',
    primary_color: '#0B1F3A',
    accent_color: '#C9A227'
  };

  const heroStyle = {
    background: `linear-gradient(135deg, ${settings.primary_color} 0%, #174A7E 100%)`
  };

  const buttonStyle = {
    background: settings.accent_color,
    color: settings.primary_color,
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    padding: '16px 48px'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      {/* ===== HERO ===== */}
      <section style={{
        ...heroStyle,
        padding: '80px 24px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '400px'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0
        }}>
          <div style={{
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'white',
            margin: '0 auto'
          }} />
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: `rgba(201, 162, 39, 0.15)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            border: `2px solid ${settings.accent_color}4D`
          }}>
            🕊️
          </div>
          
          <h1 style={{
            fontSize: '52px',
            fontWeight: '800',
            marginBottom: '16px',
            letterSpacing: '-1px',
            background: `linear-gradient(135deg, #FFFFFF 0%, ${settings.accent_color} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {settings.hero_title}
          </h1>
          <p style={{
            fontSize: '22px',
            opacity: 0.85,
            marginBottom: '36px',
            lineHeight: '1.6',
            maxWidth: '700px',
            margin: '0 auto 36px',
            fontWeight: '300',
            color: 'rgba(255,255,255,0.9)'
          }}>
            {settings.hero_subtitle}
          </p>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {profile ? (
              <button
                onClick={handleGetStarted}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = `0 8px 30px ${settings.accent_color}4D`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                📊 Перейти в кабинет
              </button>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  style={{
                    padding: '16px 40px',
                    fontSize: '18px',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                    e.target.style.borderColor = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                  }}
                >
                  🔑 Вход
                </button>
                <button
                  onClick={handleGetStarted}
                  style={buttonStyle}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = `0 8px 30px ${settings.accent_color}4D`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  🚀 Присоединиться
                </button>
              </>
            )}
          </div>

          {!profile && (
            <p style={{
              marginTop: '20px',
              fontSize: '15px',
              opacity: 0.6,
              color: 'rgba(255,255,255,0.7)'
            }}>
              Уже есть аккаунт? <Link to="/login" style={{ color: settings.accent_color, textDecoration: 'none', fontWeight: '600' }}>Войти</Link>
            </p>
          )}
        </div>
      </section>

      {/* ===== СТАТИСТИКА ===== */}
      <section style={{ 
        maxWidth: '1200px', 
        margin: '-30px auto 0', 
        padding: '0 24px',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          background: 'white',
          borderRadius: '20px',
          padding: '32px 40px',
          boxShadow: '0 12px 35px rgba(11, 31, 58, 0.10)',
          border: '1px solid #E2E7EF'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>10+</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>КЮДов</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>500+</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Участников</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>50+</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Мероприятий</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>8</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Лет работы</div>
          </div>
        </div>
      </section>

      {/* ===== МИССИЯ ===== */}
      <section style={{ 
        background: settings.primary_color,
        padding: '60px 24px',
        marginTop: '40px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 20px',
            background: 'rgba(201, 162, 39, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px'
          }}>
            🌍
          </div>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: 'white',
            marginBottom: '16px'
          }}>
            Наша миссия
          </h2>
          <p style={{ 
            fontSize: '18px', 
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: 1.8
          }}>
            Воспитание нового поколения дипломатов,<br />
            развитие лидерских качеств и формирование<br />
            гражданской позиции у молодёжи
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            marginTop: '32px',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🤝</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Дипломатия</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎯</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Лидерство</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🌐</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Международное общение</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>⭐</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Гражданская позиция</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}