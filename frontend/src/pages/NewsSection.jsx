// frontend/src/components/NewsSection.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NewsSection({ limit = 3 }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/news', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки новостей');
      }
      
      const data = await response.json();
      setNews(data || []);
    } catch (err) {
      console.error('Ошибка загрузки новостей:', err);
      setError('Не удалось загрузить новости');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="news-loading">
        <div className="spinner-small" />
        <span>Загрузка новостей...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-error">
        <span>📭</span>
        <p>{error}</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="news-empty">
        <span>📰</span>
        <p>Новостей пока нет</p>
      </div>
    );
  }

  const displayNews = news.slice(0, limit);

  return (
    <div className="news-section">
      <div className="news-header">
        <h2>📰 Последние новости</h2>
        {news.length > limit && (
          <Link to="/news" className="news-all-link">Все новости →</Link>
        )}
      </div>
      
      <div className="news-grid">
        {displayNews.map((item) => (
          <div key={item.id} className="news-card">
            {item.image_url && (
              <div className="news-image">
                <img src={item.image_url} alt={item.title} />
              </div>
            )}
            <div className="news-body">
              <div className="news-date">{formatDate(item.created_at)}</div>
              <h3 className="news-title">{item.title}</h3>
              <p className="news-excerpt">
                {item.content.length > 120 
                  ? item.content.substring(0, 120) + '...' 
                  : item.content}
              </p>
              <Link to={`/news/${item.id}`} className="news-read-more">
                Читать далее →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .news-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .news-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .news-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0;
        }

        .news-all-link {
          color: #C9A227;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .news-all-link:hover {
          color: #B8921F;
          transform: translateX(4px);
        }

        .news-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .news-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(11, 31, 58, 0.06);
          border: 1px solid #E2E7EF;
          transition: all 0.3s ease;
        }

        .news-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.1);
        }

        .news-image {
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #F4F6F9;
        }

        .news-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .news-card:hover .news-image img {
          transform: scale(1.05);
        }

        .news-body {
          padding: 20px;
        }

        .news-date {
          font-size: 12px;
          color: #98A2B3;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .news-title {
          font-size: 18px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0 0 10px 0;
          line-height: 1.3;
          font-family: 'Playfair Display', serif;
        }

        .news-excerpt {
          font-size: 14px;
          color: #667085;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }

        .news-read-more {
          color: #C9A227;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .news-read-more:hover {
          color: #B8921F;
          gap: 8px;
        }

        .news-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px;
          color: #667085;
        }

        .spinner-small {
          width: 24px;
          height: 24px;
          border: 3px solid #E2E7EF;
          border-top-color: #C9A227;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .news-error,
        .news-empty {
          text-align: center;
          padding: 40px;
          color: #98A2B3;
        }

        .news-error span,
        .news-empty span {
          font-size: 32px;
          display: block;
          margin-bottom: 12px;
        }

        @media (max-width: 768px) {
          .news-grid {
            grid-template-columns: 1fr;
          }
          
          .news-header h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}