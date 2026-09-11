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

  // Пока баннер виден, освобождаем под него место в конце страницы:
  // иначе он просто ложится поверх последних строк и кнопок, и до них
  // нельзя добраться ни прокруткой, ни нажатием.
  useEffect(() => {
    if (!visible) return undefined;
    document.body.classList.add('has-cookie-banner');
    return () => document.body.classList.remove('has-cookie-banner');
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-banner-content">
        <p>
          Платформа использует файлы cookie.{' '}
          <Link to="/privacy-policy">Политика конфиденциальности</Link>.
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
          padding: 10px 24px;
          z-index: 9999;
          border-top: 1px solid var(--color-gold);
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
          padding: 6px 22px;
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
            padding: 10px 16px;
          }

          .cookie-banner-content {
            flex-direction: row;
            text-align: left;
            gap: 12px;
          }

          .cookie-banner-content p {
            font-size: 12px;
          }

          .cookie-banner-actions {
            flex-shrink: 0;
          }
        }

        @media (max-width: 480px) {
          .cookie-banner {
            padding: 10px 12px;
          }

          .cookie-banner-content p {
            font-size: 11px;
          }

          .cookie-accept {
            padding: 6px 16px;
          }
        }
      `}</style>
    </div>
  );
}