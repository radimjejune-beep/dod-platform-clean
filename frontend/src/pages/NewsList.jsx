// frontend/src/pages/NewsList.jsx
//
// Все новости движения. Сюда ведёт ссылка «Все новости →» с главной —
// страницы не существовало, и ссылка открывала пустой экран.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import usePublicProfile from '../components/usePublicProfile';
import { newsImageSrc, formatNewsDate, API_ORIGIN } from '../lib/news';

const PAGE_SIZE = 12;

export default function NewsList() {
  const profile = usePublicProfile();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const load = async (offset) => {
    const response = await fetch(`${API_ORIGIN}/api/news?limit=${PAGE_SIZE}&offset=${offset}`);
    if (!response.ok) throw new Error(`Ошибка ${response.status}`);
    const data = await response.json();
    setHasMore(data.length === PAGE_SIZE);
    return data;
  };

  useEffect(() => {
    (async () => {
      try {
        setItems(await load(0));
      } catch {
        setError('Не удалось загрузить новости');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await load(items.length);
      setItems((prev) => [...prev, ...more]);
    } catch {
      setError('Не удалось загрузить ещё новости');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="page-background" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navigation profile={profile} />

      <main style={{ flex: 1, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 56px' }}>
        <h1 className="page-title" style={{ marginBottom: '24px' }}>Новости</h1>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>}

        {error && <div className="message-error">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-gray-500)' }}>
            Новостей пока нет
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {items.map((item) => {
            const image = newsImageSrc(item);
            return (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="card"
                style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
              >
                {image && (
                  <img src={image} alt={item.title} loading="lazy"
                       style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '18px 20px 22px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                    {formatNewsDate(item.created_at)}
                  </div>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--color-primary-dark)' }}>{item.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                    {item.content.length > 140 ? item.content.substring(0, 140) + '…' : item.content}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <button className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
