// frontend/src/components/ClubEvents.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { describeApiError } from '../lib/api';
import { confirmAction } from '../lib/confirm';
import TelemostInfo from './TelemostInfo';
import { eventStatus, EVENT_STATUS_BADGES } from '../lib/events';

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
    registration_deadline: '',
    telemost_allowed: false,
    telemost_url: ''
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
          setMessage('У вас нет доступа к мероприятиям этого клуба');
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
      setMessage('Ошибка загрузки мероприятий');
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
      // Адреса /api/club-events для создания на сервере нет — мероприятия
      // клуба создаются общим /api/events. Пустые поля шлём как null:
      // пустая строка не проходит проверку даты и времени.
      const response = await fetch('https://dod-backend.relaxdev.ru/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description,
          location: form.location,
          event_date: form.event_date,
          end_date: form.end_date || null,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          max_participants: parseInt(form.max_participants, 10) || 0,
          registration_deadline: form.registration_deadline || null,
          type: 'internal',
          club_id: clubId,
          is_club_event: true,
          telemost_allowed: !!form.telemost_allowed,
          telemost_url: form.telemost_allowed ? (form.telemost_url || '').trim() : ''
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(describeApiError(result));
      }

      setMessage(result.moderation_status === 'pending'
        ? 'Мероприятие отправлено на одобрение руководителю клуба.'
        : 'Мероприятие создано!');
      setMessageType('success');
      setShowForm(false);
      resetForm();
      loadEvents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
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
      registration_deadline: '',
      telemost_allowed: false,
      telemost_url: ''
    });
  };

  const handleRegister = async (eventId) => {
    if (!await confirmAction({ title: 'Записаться на мероприятие?' })) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/event-registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ event_id: eventId })
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(describeApiError(result));
      }
      
      setMessage('Заявка отправлена!');
      setMessageType('success');
      loadEvents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleModerate = async (eventId, status) => {
    if (!await confirmAction({ title: `Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'}?` })) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/moderate`, {
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
        throw new Error(describeApiError(result));
      }
      
      setMessage(status === 'approved' ? 'Мероприятие одобрено!' : 'Мероприятие отклонено');
      setMessageType(status === 'approved' ? 'success' : 'error');
      loadEvents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
  };


  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-gray-500)' }}>Загрузка...</div>;
  }

  return (
    <div className="club-events">
      {/* ШАПКА */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
          Внутренние мероприятия клуба
          <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginLeft: '8px' }}>
            ({events.length})
          </span>
        </h3>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Закрыть' : 'Создать мероприятие'}
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
          <h4 style={{ marginBottom: '12px' }}>Создать внутреннее мероприятие</h4>
          <div style={{ padding: '8px 12px', background: 'var(--color-info-bg)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-primary-light)', marginBottom: '12px' }}>
            Это мероприятие увидят только участники вашего клуба
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
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!form.telemost_allowed}
                  onChange={(e) => setForm({ ...form, telemost_allowed: e.target.checked, telemost_url: e.target.checked ? form.telemost_url : '' })}
                  style={{ width: 'auto' }}
                />
                Можно подключиться по Телемосту
              </label>
              {form.telemost_allowed && (
                <input
                  type="url"
                  value={form.telemost_url || ''}
                  onChange={(e) => setForm({ ...form, telemost_url: e.target.value })}
                  placeholder="https://telemost.yandex.ru/j/..."
                  style={{ marginTop: '8px' }}
                />
              )}
            </div>
            <button type="submit" className="btn btn-primary">
              Создать мероприятие
            </button>
          </form>
        </div>
      )}

      {/* СПИСОК МЕРОПРИЯТИЙ */}
      {events.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><Icon name="archive" /></div>
          <p>В клубе пока нет внутренних мероприятий</p>
          {canCreate && <p style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>Создайте первое мероприятие для участников клуба!</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((event) => {
            const currentStatus = eventStatus(event);
            const status = EVENT_STATUS_BADGES[currentStatus] || EVENT_STATUS_BADGES.approved;
            const isApproved = currentStatus === 'approved';
            const isPending = currentStatus === 'pending';
            const myReg = event.my_registration_status;
            const full = event.max_participants > 0 && (event.registrations_count || 0) >= event.max_participants;
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
                      <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--color-primary)' }}>{event.title}</h4>
                      <span className="tag" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      {event.proposed_by_name && (
                        <span className="tag" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-500)', fontSize: '10px' }}>
                          {event.proposed_by_name}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--color-gray-500)' }}>{event.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                      <span>{new Date(event.event_date).toLocaleDateString('ru-RU')}</span>
                      {event.location && <span>{event.location}</span>}
                      <span>{event.registrations_count || 0}/{event.max_participants > 0 ? event.max_participants : '∞'}</span>
                    </div>
                    <TelemostInfo event={event} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* ЗАПИСЬ НА МЕРОПРИЯТИЕ */}
                    {isParticipant && isApproved && !myReg && !full && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRegister(event.id)}
                      >
                        Записаться
                      </button>
                    )}
                    {isParticipant && myReg === 'pending' && <span className="tag">Заявка отправлена</span>}
                    {isParticipant && myReg === 'confirmed' && <span className="tag">Вы записаны</span>}
                    {isParticipant && myReg === 'rejected' && <span className="tag">Заявка отклонена</span>}
                    {isParticipant && isApproved && !myReg && full && <span className="tag">Мест нет</span>}
                    
                    {/* МОДЕРАЦИЯ */}
                    {canModerate && isPending && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleModerate(event.id, 'approved')}
                        >
                          Одобрить
                        </button>
                        <button
                          className="btn btn-danger-soft btn-sm"
                          onClick={() => handleModerate(event.id, 'rejected')}
                        >
                          Отклонить
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