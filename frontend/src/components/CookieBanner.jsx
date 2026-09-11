// frontend/src/components/CookieBanner.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookiesAccepted');
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-banner-content">
        <p>
          Мы используем файлы cookie для обеспечения работы платформы. 
          Продолжая использовать сайт, вы соглашаетесь с 
          <Link to="/privacy-policy"> Политикой конфиденциальности</Link>.
        </p>
        <div className="cookie-banner-actions">
          <button className="cookie-accept" onClick={acceptCookies}>
            Принять
          </button>
        </div>
      </div>

      <style>{`
        .cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--color-primary-dark);
          color: rgba(255, 255, 255, 0.9);
          padding: 16px 24px;
          z-index: 9999;
          border-top: 2px solid var(--color-gold);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
        }

        .cookie-banner-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .cookie-banner-content p {
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
          flex: 1;
          min-width: 200px;
          color: rgba(255, 255, 255, 0.85);
        }

        .cookie-banner-content p a {
          color: var(--color-gold-light);
          text-decoration: underline;
        }

        .cookie-banner-content p a:hover {
          color: var(--color-gold);
        }

        .cookie-banner-actions {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }

        .cookie-accept {
          padding: 8px 28px;
          background: var(--color-gold);
          color: var(--color-primary-dark);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }

        .cookie-accept:hover {
          box-shadow: 0 4px 16px rgba(201, 162, 39, 0.3);
        }

        @media (max-width: 768px) {
          .cookie-banner {
            padding: 14px 16px;
          }

          .cookie-banner-content {
            flex-direction: column;
            text-align: center;
          }

          .cookie-banner-content p {
            font-size: 12px;
          }

          .cookie-banner-actions {
            width: 100%;
            justify-content: center;
          }

          .cookie-accept {
            flex: 1;
            max-width: 200px;
          }
        }

        @media (max-width: 480px) {
          .cookie-banner {
            padding: 12px 12px;
          }

          .cookie-banner-actions {
            flex-direction: column;
            align-items: center;
          }

          .cookie-accept {
            max-width: 100%;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}