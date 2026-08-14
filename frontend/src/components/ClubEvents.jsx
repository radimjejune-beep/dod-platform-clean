// frontend/src/components/ClubEvents.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClubEvents({ clubId, profile }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [isParticipant, setIsParticipant] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    checkAccess();
    loadEvents();
  }, [clubId, profile]);

  const checkAccess = () => {
    const role = profile?.role;
    
    // Проверяем, является ли пользователь участником клуба
    if (role === 'participant' && profile?.club_id === clubId) {
      setIsParticipant(true);
      setCanCreate(false); // Участники не могут создавать мероприятия
    }
    
    // Проверяем, является ли пользователь координатором клуба
    if (role === 'club_coordinator') {
      // Здесь нужно проверить, что координатор привязан к этому клубу
      setIsCoordinator(true);
      setCanCreate(true);
    }
    
    // Админ, координатор движения, президент, вице могут создавать
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role)) {
      setCanCreate(true);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/club-events/${clubId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setMessage('❌ У вас нет доступа к мероприятиям этого клуба');
          setMessageType('error');
          setEvents([]);
          return;
        }
        throw new Error('Ошибка загрузки');
      }
      
      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Ошибка загрузки мероприятий клуба:', err);
      setMessage('❌ Ошибка загрузки мероприятий');
      setMessageType('error');
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
          club_id: clubId
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Мероприятие создано! Участники клуба будут уведомлены.');
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

  const handleRegister = async (eventId) => {
    if (!confirm('Записаться на мероприятие?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/club-events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      
      setMessage('✅ Вы записаны на мероприятие!');
      setMessageType('success');
      loadEvents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleModerate = async (eventId, status) => {
    if (!confirm(`Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/club-events/${eventId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status,
          comment: status === 'approved' ? 'Мероприятие одобрено' : 'Мероприятие отклонено'
        })
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      
      setMessage(status === 'approved' ? '✅ Мероприятие одобрено!' : '❌ Мероприятие отклонено');
      setMessageType(status === 'approved' ? 'success' : 'error');
      loadEvents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
          📅 Внутренние мероприятия клуба
          <span style={{ fontSize: '12px', color: '#98A2B3', marginLeft: '8px' }}>
            ({events.length})
          </span>
        </h3>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✖ Закрыть' : '➕ Создать мероприятие'}
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
          <h4 style={{ marginBottom: '12px' }}>📝 Создать внутреннее мероприятие</h4>
          <div style={{ padding: '8px 12px', background: '#EAF2FA', borderRadius: '8px', fontSize: '13px', color: '#174A7E', marginBottom: '12px' }}>
            💡 Это мероприятие увидят только участники вашего клуба
          </div>
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
              ✅ Создать мероприятие
            </button>
          </form>
        </div>
      )}

      {/* СПИСОК МЕРОПРИЯТИЙ */}
      {events.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>В клубе пока нет внутренних мероприятий</p>
          {canCreate && <p style={{ color: '#98A2B3', fontSize: '13px' }}>Создайте первое мероприятие для участников клуба!</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((event) => {
            const status = getStatusBadge(event.status);
            const isApproved = event.status === 'approved';
            const isPending = event.status === 'pending';
            const canModerate = isCoordinator || ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);
            
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
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#0B1F3A' }}>{event.title}</h4>
                      <span className="tag" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      {event.proposed_by_name && (
                        <span className="tag" style={{ background: '#F4F6F9', color: '#667085', fontSize: '10px' }}>
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* ЗАПИСЬ НА МЕРОПРИЯТИЕ */}
                    {isParticipant && isApproved && (
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleRegister(event.id)}
                      >
                        📝 Записаться
                      </button>
                    )}
                    
                    {/* МОДЕРАЦИЯ */}
                    {canModerate && isPending && (
                      <>
                        <button
                          className="btn-success"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleModerate(event.id, 'approved')}
                        >
                          ✅ Одобрить
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleModerate(event.id, 'rejected')}
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