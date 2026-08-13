// frontend/src/components/Footer.jsx

import { Link } from 'react-router-dom';
import ardLogo from '../assets/АРДЛОГО.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: '#0B1F3A',
      color: 'white',
      marginTop: '60px',
      padding: '40px 24px 20px',
      borderTop: '3px solid #C9A227'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '30px',
        paddingBottom: '30px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#C9A227', marginBottom: '12px' }}>
            🌍 О движении
          </h4>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
            Детское общественное движение «Дипломаты будущего» — это сообщество юных дипломатов,
            развивающих навыки международного общения и дипломатии.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#C9A227', marginBottom: '12px' }}>
            📌 Быстрые ссылки
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px' }}>
                Главная
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/events" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px' }}>
                Мероприятия
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/clubs" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px' }}>
                КЮДы
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/achievements" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px' }}>
                Достижения
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#C9A227', marginBottom: '12px' }}>
            📞 Контакты
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
            <li>📍 Москва, Россия</li>
            <li>📧 info@diplomats-future.ru</li>
            <li>📱 +7 (495) 123-45-67</li>
          </ul>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '20px auto 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)'
      }}>
        <span>© {currentYear} ДОД «Дипломаты будущего». Все права защищены.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src={ardLogo} 
            alt="Ассоциация российских дипломатов" 
            style={{ height: '32px', width: 'auto', objectFit: 'contain', opacity: 0.7 }}
          />
          <span>При поддержке Ассоциации российских дипломатов</span>
        </div>
      </div>
    </footer>
  );
}