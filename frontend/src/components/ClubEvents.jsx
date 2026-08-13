// frontend/src/components/ClubEvents.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClubEvents({ clubId, profile }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    max_participants: 20,
    registration_deadline: ''
  });
  const navigate = useNavigate();

  const role = profile?.role;
  const isClubCoordinator = role === 'club_coordinator';
  const isAdminOrMovement = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role);
  const isParticipant = role === 'participant';
  const canCreate = isClubCoordinator || isAdminOrMovement || isParticipant;

  useEffect(() => {
    loadEvents();
  }, [clubId]);

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/club-events/${clubId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Ошибка загрузки мероприятий клуба:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/club-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          club_id: clubId,
          is_club_event: true
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setMessage(isParticipant ? '✅ Мероприятие предложено! Ожидает одобрения координатора.' : '✅ Мероприятие создано!');
      setMessageType('success');
      setShowForm(false);
      resetForm();
      loadEvents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      location: '',
      event_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      max_participants: 20,
      registration_deadline: ''
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { label: '⏳ На модерации', color: '#C9A227', bg: '#FBF4DC' },
      'approved': { label: '✅ Одобрено', color: '#16845B', bg: '#E8F5EF' },
      'rejected': { label: '❌ Отклонено', color: '#B3262E', bg: '#FCEBEC' },
      'completed': { label: '📌 Завершено', color: '#667085', bg: '#F4F6F9' }
    };
    return badges[status] || badges['pending'];
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#667085' }}>⏳ Загрузка...</div>;
  }

  return (
    <div className="club-events">
      {/* ШАПКА */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
          📅 Мероприятия клуба
        </h3>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✖ Закрыть' : '➕ Предложить мероприятие'}
          </button>
        )}
      </div>

      {message && (
        <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
          {message}
        </div>
      )}

      {/* ФОРМА СОЗДАНИЯ */}
      {showForm && canCreate && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '12px' }}>
            {isParticipant ? '📝 Предложить мероприятие' : '📝 Создать мероприятие'}
          </h4>
          {isParticipant && (
            <div style={{ padding: '8px 12px', background: '#EAF2FA', borderRadius: '8px', fontSize: '13px', color: '#174A7E', marginBottom: '12px' }}>
              💡 После отправки мероприятие будет отправлено на модерацию координатору клуба
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Название мероприятия"
              />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание мероприятия"
              />
            </div>
            <div className="form-group">
              <label>Место</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Место проведения"
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Дата *</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Дата окончания</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Время начала</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Время окончания</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Максимум участников</label>
                <input
                  type="number"
                  value={form.max_participants}
                  onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Дедлайн регистрации</label>
                <input
                  type="date"
                  value={form.registration_deadline}
                  onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn-success">
              {isParticipant ? '📤 Предложить' : '✅ Создать'}
            </button>
          </form>
        </div>
      )}

      {/* СПИСОК МЕРОПРИЯТИЙ */}
      {events.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>В клубе пока нет мероприятий</p>
          {canCreate && <p style={{ color: '#98A2B3', fontSize: '13px' }}>Станьте первым, кто предложит мероприятие!</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((event) => {
            const status = getStatusBadge(event.status);
            const canModerate = isClubCoordinator || isAdminOrMovement;
            const canView = canModerate || event.status === 'approved';

            if (!canView) return null;

            return (
              <div
                key={event.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${status.color}`,
                  padding: '16px 20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#0B1F3A' }}>{event.title}</h4>
                      <span className="tag" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      {event.proposed_by_name && (
                        <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                          👤 {event.proposed_by_name}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#667085' }}>{event.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                      <span>📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}</span>
                      {event.location && <span>📍 {event.location}</span>}
                      <span>👥 {event.current_participants || 0}/{event.max_participants || '∞'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      Подробнее
                    </button>
                    {canModerate && event.status === 'pending' && (
                      <>
                        <button
                          className="btn-success"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              await fetch(`https://dod-backend.relaxdev.ru/api/club-events/${event.id}/moderate`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'approved' })
                              });
                              loadEvents();
                            } catch (err) {
                              console.error('Ошибка:', err);
                            }
                          }}
                        >
                          ✅ Одобрить
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            if (confirm('Отклонить мероприятие?')) {
                              try {
                                const token = localStorage.getItem('token');
                                await fetch(`https://dod-backend.relaxdev.ru/api/club-events/${event.id}/moderate`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ status: 'rejected' })
                                });
                                loadEvents();
                              } catch (err) {
                                console.error('Ошибка:', err);
                              }
                            }
                          }}
                        >
                          ❌ Отклонить
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}