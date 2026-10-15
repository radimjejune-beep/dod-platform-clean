// frontend/src/pages/MyClubEvents.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { confirmAction } from '../lib/confirm';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';
import TelemostInfo from '../components/TelemostInfo';
import { eventStatus, EVENT_STATUS_BADGES } from '../lib/events';

export default function MyClubEvents() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
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

      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/my-club-events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки мероприятий');
      }

      const data = await response.json();
      setEvents(data || []);
      
    } catch (err) {
      console.error('Ошибка:', err);
      setMessage('Ошибка загрузки мероприятий: ' + err.message);
      setMessageType('error');
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isCoordinator = profile?.role === 'club_coordinator';

  // Раньше ответ сервера не проверялся: «Мероприятие одобрено!» появлялось
  // даже тогда, когда запрос не прошёл (а адрес, к которому он обращался,
  // на сервере вообще не существовал).
  const moderate = async (eventId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) {
        throw new Error(api.describeApiError(result, `Ошибка ${response.status}`));
      }
      setMessage(status === 'approved' ? 'Мероприятие одобрено!' : 'Мероприятие отклонено');
      setMessageType(status === 'approved' ? 'success' : 'error');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span className="page-header-icon"><Icon name="calendar" size={26} /></span>
          <div>
            <h1>Мероприятия моего клуба</h1>
            <p>
              {isCoordinator 
                ? 'Все внутренние мероприятия вашего КЮДа' 
                : 'Мероприятия вашего клуба'}
            </p>
          </div>
          {isCoordinator && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => navigate('/events')}
            >
              Создать мероприятие
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><Icon name="archive" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
              В вашем клубе пока нет внутренних мероприятий
            </p>
            {isCoordinator && (
              <p style={{ color: 'var(--color-gray-500)' }}>
                Создайте первое мероприятие для участников вашего клуба
              </p>
            )}
            {isCoordinator && (
              <button
                className="btn-primary"
                onClick={() => navigate('/events')}
                style={{ marginTop: '16px' }}
              >
                Создать мероприятие
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {events.map((event) => {
              const currentStatus = eventStatus(event);
              const status = EVENT_STATUS_BADGES[currentStatus] || EVENT_STATUS_BADGES.approved;
              return (
                <div
                  key={event.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${status.color}`,
                    padding: '20px 24px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', margin: 0 }}>
                          {event.title}
                        </h3>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                        {event.club_name && (
                          <span className="tag tag-blue">{event.club_name}</span>
                        )}
                      </div>

                      {event.description && (
                        <p style={{ color: 'var(--color-gray-500)', marginTop: '8px', fontSize: '14px' }}>
                          {event.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-gray-400)', marginTop: '8px' }}>
                        <span>{formatDate(event.event_date)}</span>
                        {event.end_date && event.end_date !== event.event_date && (
                          <span>— {formatDate(event.end_date)}</span>
                        )}
                        {event.start_time && (
                          <span>{event.start_time}{event.end_time && ` — ${event.end_time}`}</span>
                        )}
                        {event.location && (
                          <span>{event.location}</span>
                        )}
                        <span>{event.registrations_count || 0}/{event.max_participants > 0 ? event.max_participants : '∞'}</span>
                      </div>

                      <TelemostInfo event={event} />

                      {event.proposed_by_name && (
                        <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                          Предложил: {event.proposed_by_name}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {isCoordinator && currentStatus === 'pending' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => moderate(event.id, 'approved')}
                          >
                            Одобрить
                          </button>
                          <button
                            className="btn btn-danger-soft btn-sm"
                            onClick={async () => {
                              if (!await confirmAction({ title: 'Отклонить мероприятие?', tone: 'danger' })) return;
                              moderate(event.id, 'rejected');
                            }}
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
    </div>
  );
}