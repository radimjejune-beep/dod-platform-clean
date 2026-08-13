// frontend/src/pages/MyReviews.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function MyReviews() {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);
      // TODO: добавить API для получения оценок
      setReviews([]);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { text: 'Черновик', color: '#8A9AAA', bg: '#F4F6F9' },
      'submitted': { text: 'На проверке', color: '#C9A227', bg: '#FBF4DC' },
      'approved': { text: 'Утверждено', color: '#16845B', bg: '#E8F5EF' }
    };
    return badges[status] || badges['draft'];
  };

  const getEngagementLabel = (value) => {
    const labels = {
      'active': '🟢 Активно',
      'moderate': '🟡 Умеренно',
      'passive': '🔴 Пассивно'
    };
    return labels[value] || value;
  };

  const getTeamworkLabel = (value) => {
    const labels = {
      'excellent': '⭐ Отлично',
      'good': '👍 Хорошо',
      'developing': '📈 Развивается'
    };
    return labels[value] || value;
  };

  const getInitiativeLabel = (value) => {
    const labels = {
      'high': '🚀 Высокая',
      'average': '📊 Средняя',
      'low': '📉 Низкая'
    };
    return labels[value] || value;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📊</span>
          <div>
            <h1>Мои оценки</h1>
            <p>Ваши оценки за участие в мероприятиях</p>
          </div>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
          >
            {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📝</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Оценок пока нет</p>
            <p style={{ color: '#667085' }}>Оценки появляются после мероприятий с участием тьюторов</p>
          </div>
        ) : null}

        {viewMode === 'table' && reviews.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Мероприятие</th>
                  <th style={{ textAlign: 'center' }}>Активность</th>
                  <th style={{ textAlign: 'center' }}>Команда</th>
                  <th style={{ textAlign: 'center' }}>Инициатива</th>
                  <th style={{ textAlign: 'center' }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const status = getStatusBadge(review.status);
                  return (
                    <tr key={review.id}>
                      <td>
                        <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                          {review.event_title || 'Мероприятие'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                          📅 {review.event_date ? new Date(review.event_date).toLocaleDateString('ru-RU') : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {review.engagement ? (
                          <span className="tag" style={{
                            background: review.engagement === 'active' ? '#E8F5EF' :
                                       review.engagement === 'moderate' ? '#FBF4DC' : '#FCEBEC',
                            color: review.engagement === 'active' ? '#16845B' :
                                   review.engagement === 'moderate' ? '#8A6A00' : '#B3262E'
                          }}>
                            {getEngagementLabel(review.engagement)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {review.teamwork ? (
                          <span className="tag" style={{
                            background: review.teamwork === 'excellent' ? '#E8F5EF' :
                                       review.teamwork === 'good' ? '#FBF4DC' : '#FCEBEC',
                            color: review.teamwork === 'excellent' ? '#16845B' :
                                   review.teamwork === 'good' ? '#8A6A00' : '#B3262E'
                          }}>
                            {getTeamworkLabel(review.teamwork)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {review.initiative ? (
                          <span className="tag" style={{
                            background: review.initiative === 'high' ? '#E8F5EF' :
                                       review.initiative === 'average' ? '#FBF4DC' : '#FCEBEC',
                            color: review.initiative === 'high' ? '#16845B' :
                                   review.initiative === 'average' ? '#8A6A00' : '#B3262E'
                          }}>
                            {getInitiativeLabel(review.initiative)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="tag" style={{
                          background: status.bg,
                          color: status.color
                        }}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'cards' && reviews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {reviews.map((review) => {
              const status = getStatusBadge(review.status);
              return (
                <div
                  key={review.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${review.is_final ? '#C9A227' : '#174A7E'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                        {review.event_title || 'Мероприятие'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                        📅 {review.event_date ? new Date(review.event_date).toLocaleDateString('ru-RU') : ''}
                      </div>
                    </div>
                    <span className="tag" style={{ background: status.bg, color: status.color }}>
                      {status.text}
                    </span>
                  </div>

                  <div className="grid-3" style={{ fontSize: '12px', marginTop: '8px' }}>
                    {review.engagement && (
                      <div style={{ padding: '4px 8px', background: '#F8FAFC', borderRadius: '4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#98A2B3' }}>Активность</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getEngagementLabel(review.engagement)}
                        </div>
                      </div>
                    )}
                    {review.teamwork && (
                      <div style={{ padding: '4px 8px', background: '#F8FAFC', borderRadius: '4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#98A2B3' }}>Команда</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getTeamworkLabel(review.teamwork)}
                        </div>
                      </div>
                    )}
                    {review.initiative && (
                      <div style={{ padding: '4px 8px', background: '#F8FAFC', borderRadius: '4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#98A2B3' }}>Инициатива</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getInitiativeLabel(review.initiative)}
                        </div>
                      </div>
                    )}
                  </div>

                  {review.comment && (
                    <div style={{ fontSize: '12px', color: '#667085', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F4F6F9' }}>
                      💬 {review.comment}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}