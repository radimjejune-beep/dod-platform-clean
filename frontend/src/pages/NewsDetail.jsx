// frontend/src/pages/NewsDetail.jsx
//
// Одна новость целиком. Страница публичная: сюда ведёт «Читать далее» с
// главной, а главную видят и те, кто ещё не вошёл. Раньше здесь стояла
// заглушка «Новость в разработке», да ещё и с отправкой гостя на вход.

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import usePublicProfile from '../components/usePublicProfile';
import { newsImageSrc, formatNewsDate, API_ORIGIN } from '../lib/news';

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = usePublicProfile();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('ok'); // ok | notfound | error

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setState('ok');

    (async () => {
      try {
        const response = await fetch(`${API_ORIGIN}/api/news/${encodeURIComponent(id)}`);
        if (cancelled) return;
        if (response.status === 404) {
          setState('notfound');
        } else if (!response.ok) {
          setState('error');
        } else {
          setItem(await response.json());
        }
      } catch {
        if (!cancelled) setState('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const image = item ? newsImageSrc(item) : '';

  return (
    <div className="page-background" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navigation profile={profile} />

      <main style={{ flex: 1, width: '100%', maxWidth: '820px', margin: '0 auto', padding: '32px 24px 56px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          style={{ marginBottom: '24px' }}
        >
          <Icon name="back" /> Назад
        </button>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>}

        {!loading && state === 'notfound' && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <h2 style={{ marginBottom: '8px' }}>Новость не найдена</h2>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: '20px' }}>
              Возможно, она была удалена или ссылка устарела.
            </p>
            <Link to="/news" className="btn btn-secondary">Все новости</Link>
          </div>
        )}

        {!loading && state === 'error' && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <h2 style={{ marginBottom: '8px' }}>Не удалось загрузить новость</h2>
            <p style={{ color: 'var(--color-gray-500)' }}>Проверьте соединение и обновите страницу.</p>
          </div>
        )}

        {!loading && item && (
          <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {image && (
              <img
                src={image}
                alt={item.title}
                style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ padding: '32px 36px 40px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '10px' }}>
                {formatNewsDate(item.created_at)}
              </div>
              <h1 style={{ fontSize: '30px', lineHeight: 1.25, marginBottom: '20px', color: 'var(--color-primary-dark)' }}>
                {item.title}
              </h1>
              {/* Текст выводим как текст, не как разметку: абзацы и переносы
                  строк сохраняются, а вставленный в новость тег ничего не
                  исполнит */}
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '16px', color: 'var(--color-gray-800)', overflowWrap: 'anywhere' }}>
                {item.content}
              </div>
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
