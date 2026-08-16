// frontend/src/pages/TutorJournal.jsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TutorJournal() {
  const { eventId } = useParams();
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [scores, setScores] = useState({});
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      if (userData.role !== 'tutor') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем данные мероприятия
      const events = await api.getEvents();
      const foundEvent = events.find(e => e.id === eventId);
      setEvent(foundEvent || null);

      // Загружаем участников
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data || []);
      }

    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const data = {
        event_id: eventId,
        participant_id: selectedParticipant.id,
        engagement_score: scores.engagement || null,
        teamwork_score: scores.teamwork || null,
        initiative_score: scores.initiative || null,
        communication_score: scores.communication || null,
        responsibility_score: scores.responsibility || null,
        comment: scores.comment || ''
      };

      const response = await fetch('https://dod-backend.relaxdev.ru/api/participant-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка сохранения');
      }

      setMessage('✅ Оценка сохранена!');
      setMessageType('success');
      setShowScoreModal(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    if (!confirm('Отправить все оценки на проверку?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/participant-scores/${eventId}/submit`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка отправки');
      }

      setMessage('✅ Все оценки отправлены на проверку!');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const openScoreModal = (participant) => {
    setSelectedParticipant(participant);
    setScores({
      engagement: participant.engagement_score || null,
      teamwork: participant.teamwork_score || null,
      initiative: participant.initiative_score || null,
      communication: participant.communication_score || null,
      responsibility: participant.responsibility_score || null,
      comment: participant.score_comment || ''
    });
    setShowScoreModal(true);
  };

  const getScoreLabel = (value) => {
    const labels = {
      1: '🌟 Отлично',
      2: '👍 Хорошо',
      3: '📊 Средне',
      4: '📈 Развивается',
      5: '🎯 Требует внимания'
    };
    return labels[value] || 'Не оценено';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { label: '📝 Черновик', color: '#8A9AAA', bg: '#F4F6F9' },
      'submitted': { label: '⏳ На проверке', color: '#C9A227', bg: '#FBF4DC' },
      'approved': { label: '✅ Утверждено', color: '#16845B', bg: '#E8F5EF' }
    };
    return badges[status] || badges['draft'];
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
        <button
          className="btn-secondary"
          onClick={() => navigate('/tutor-assignments')}
          style={{ marginBottom: '20px' }}
        >
          ← Назад к назначениям
        </button>

        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📓</span>
          <div>
            <h1>{event?.title || 'Журнал мероприятия'}</h1>
            <p>
              📅 {event?.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
              {event?.location && ` • 📍 ${event.location}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button
              className="btn-primary"
              style={{ background: '#C9A227', color: '#0B1F3A' }}
              onClick={handleSubmitAll}
            >
              📤 Отправить все оценки
            </button>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              👥 Участники ({participants.length})
            </h3>
          </div>

          {participants.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👀</div>
              <p>Участников пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {participants.map((p) => {
                const status = getStatusBadge(p.score_status);
                const hasScore = p.engagement_score || p.teamwork_score || p.initiative_score || p.communication_score || p.responsibility_score;
                
                return (
                  <div
                    key={p.id}
                    className="list-item"
                    style={{ 
                      borderLeftColor: hasScore ? '#16845B' : '#8A9AAA',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => openScoreModal(p)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div className="title">
                          {p.full_name}
                          {p.score_status === 'submitted' && (
                            <span className="tag" style={{ background: '#FBF4DC', color: '#C9A227', marginLeft: '8px', fontSize: '10px' }}>
                              ⏳ На проверке
                            </span>
                          )}
                          {p.score_status === 'approved' && (
                            <span className="tag" style={{ background: '#E8F5EF', color: '#16845B', marginLeft: '8px', fontSize: '10px' }}>
                              ✅ Утверждено
                            </span>
                          )}
                        </div>
                        <div className="subtitle">
                          {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {hasScore && (
                          <span style={{ fontSize: '12px', color: '#667085' }}>
                            ⭐ {Math.round((p.engagement_score + p.teamwork_score + p.initiative_score + p.communication_score + p.responsibility_score) / 5 * 10) / 10}
                          </span>
                        )}
                        <button
                          className="btn-primary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openScoreModal(p);
                          }}
                        >
                          {hasScore ? '✏️ Оценить' : '📝 Оценить'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ОЦЕНКИ */}
      {showScoreModal && selectedParticipant && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowScoreModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'modalSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowScoreModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              📝 Оценка участника
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              <strong>{selectedParticipant.full_name}</strong>
              {selectedParticipant.school && ` • ${selectedParticipant.school}`}
            </p>

            <form onSubmit={handleSaveScore}>
              <div className="form-group">
                <label>Вовлеченность</label>
                <select
                  value={scores.engagement || ''}
                  onChange={(e) => setScores({ ...scores, engagement: parseInt(e.target.value) || null })}
                >
                  <option value="">Не оценено</option>
                  <option value="5">🎯 Требует внимания</option>
                  <option value="4">📈 Развивается</option>
                  <option value="3">📊 Средне</option>
                  <option value="2">👍 Хорошо</option>
                  <option value="1">🌟 Отлично</option>
                </select>
              </div>

              <div className="form-group">
                <label>Работа в команде</label>
                <select
                  value={scores.teamwork || ''}
                  onChange={(e) => setScores({ ...scores, teamwork: parseInt(e.target.value) || null })}
                >
                  <option value="">Не оценено</option>
                  <option value="5">🎯 Требует внимания</option>
                  <option value="4">📈 Развивается</option>
                  <option value="3">📊 Средне</option>
                  <option value="2">👍 Хорошо</option>
                  <option value="1">🌟 Отлично</option>
                </select>
              </div>

              <div className="form-group">
                <label>Инициативность</label>
                <select
                  value={scores.initiative || ''}
                  onChange={(e) => setScores({ ...scores, initiative: parseInt(e.target.value) || null })}
                >
                  <option value="">Не оценено</option>
                  <option value="5">🎯 Требует внимания</option>
                  <option value="4">📈 Развивается</option>
                  <option value="3">📊 Средне</option>
                  <option value="2">👍 Хорошо</option>
                  <option value="1">🌟 Отлично</option>
                </select>
              </div>

              <div className="form-group">
                <label>Коммуникация</label>
                <select
                  value={scores.communication || ''}
                  onChange={(e) => setScores({ ...scores, communication: parseInt(e.target.value) || null })}
                >
                  <option value="">Не оценено</option>
                  <option value="5">🎯 Требует внимания</option>
                  <option value="4">📈 Развивается</option>
                  <option value="3">📊 Средне</option>
                  <option value="2">👍 Хорошо</option>
                  <option value="1">🌟 Отлично</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ответственность</label>
                <select
                  value={scores.responsibility || ''}
                  onChange={(e) => setScores({ ...scores, responsibility: parseInt(e.target.value) || null })}
                >
                  <option value="">Не оценено</option>
                  <option value="5">🎯 Требует внимания</option>
                  <option value="4">📈 Развивается</option>
                  <option value="3">📊 Средне</option>
                  <option value="2">👍 Хорошо</option>
                  <option value="1">🌟 Отлично</option>
                </select>
              </div>

              <div className="form-group">
                <label>Комментарий</label>
                <textarea
                  rows="3"
                  value={scores.comment || ''}
                  onChange={(e) => setScores({ ...scores, comment: e.target.value })}
                  placeholder="Дополнительные замечания..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={saving} style={{ flex: 1 }}>
                  {saving ? '⏳ Сохранение...' : '💾 Сохранить оценку'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowScoreModal(false)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}