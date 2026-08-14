// frontend/src/components/Footer.jsx

import { Link } from 'react-router-dom';
import logo from '../assets/Image.png';
import ardLogo from '../assets/АРДЛОГО.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-diplomatic">
      <div className="footer-container">
        {/* Левая колонка — логотип и описание */}
        <div className="footer-brand">
          <img src={logo} alt="ДОД «Дипломаты будущего»" className="footer-logo" />
          <p className="footer-description">
            Межрегиональное детское общественное Движение<br />
            по формированию дипломатической культуры<br />
            <strong>«Дипломаты Будущего»</strong>
          </p>
        </div>

        {/* Центральная колонка — контакты */}
        <div className="footer-contacts">
          <h4>Контакты</h4>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">📍</span>
            <span>119200, Москва, Смоленская-Сенная площадь, дом 32/34 (АРД)</span>
          </div>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">📞</span>
            <a href="tel:+74992443285">+7 (499) 244-32-85</a>
          </div>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">✉️</span>
            <a href="mailto:diplomatsothefuture@mail.ru">diplomatsothefuture@mail.ru</a>
          </div>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">🌐</span>
            <a href="https://www.diplomatsothefuture.ru" target="_blank" rel="noopener noreferrer">
              www.diplomatsothefuture.ru
            </a>
          </div>
        </div>

        {/* Правая колонка — партнёры */}
        <div className="footer-partners">
          <h4>При поддержке</h4>
          <img 
            src={ardLogo} 
            alt="Ассоциация российских дипломатов" 
            className="footer-ard-logo"
          />
          <p className="footer-ard-label">Ассоциация российских дипломатов</p>
        </div>
      </div>

      {/* Нижняя часть — копирайт */}
      <div className="footer-bottom">
        <p>
          © {currentYear} ДОД «Дипломаты будущего». Все права защищены.
        </p>
        <div className="footer-links">
          <Link to="/about">О движении</Link>
          <Link to="/privacy">Политика конфиденциальности</Link>
        </div>
      </div>

      <style>{`
        .footer-diplomatic {
          background: #0B1F3A;
          color: rgba(255, 255, 255, 0.8);
          padding: 48px 24px 24px;
          border-top: 3px solid #C9A227;
          margin-top: 60px;
          width: 100%;
        }

        .footer-container {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr;
          gap: 40px;
          padding: 0 24px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-logo {
          height: 48px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }

        .footer-description {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .footer-description strong {
          color: #E8D9A8;
        }

        .footer-contacts h4,
        .footer-partners h4 {
          font-size: 14px;
          font-weight: 600;
          color: #E8D9A8;
          margin: 0 0 12px 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .footer-contact-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
        }

        .footer-contact-icon {
          flex-shrink: 0;
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .footer-contact-item a {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-contact-item a:hover {
          color: #E8D9A8;
        }

        .footer-partners {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .footer-ard-logo {
          height: 50px;
          width: auto;
          object-fit: contain;
          opacity: 0.7;
          transition: opacity 0.3s ease;
          margin-top: 4px;
        }

        .footer-ard-logo:hover {
          opacity: 1;
        }

        .footer-ard-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          margin: 6px 0 0 0;
        }

        .footer-bottom {
          max-width: 1440px;
          margin: 0 auto;
          padding: 16px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .footer-bottom p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
          margin: 0;
        }

        .footer-links {
          display: flex;
          gap: 20px;
        }

        .footer-links a {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: #E8D9A8;
        }

        @media (max-width: 992px) {
          .footer-container {
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }
          .footer-partners {
            grid-column: 1 / -1;
            flex-direction: row;
            justify-content: center;
            gap: 16px;
          }
          .footer-partners h4 {
            margin: 0;
          }
        }

        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 0 16px 24px;
          }
          .footer-brand {
            text-align: center;
            align-items: center;
          }
          .footer-description {
            text-align: center;
          }
          .footer-contacts {
            text-align: center;
          }
          .footer-contact-item {
            justify-content: center;
          }
          .footer-partners {
            flex-direction: column;
            align-items: center;
          }
          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }
          .footer-links {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .footer-diplomatic {
            padding: 32px 12px 16px;
          }
          .footer-container {
            padding: 0 8px 20px;
          }
          .footer-logo {
            height: 36px;
          }
          .footer-description {
            font-size: 13px;
          }
          .footer-contact-item {
            font-size: 12px;
          }
          .footer-ard-logo {
            height: 38px;
          }
        }
      `}</style>
    </footer>
  );
}