// frontend/src/pages/Calendar.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function CalendarPage() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

      const eventsData = await api.getEvents();
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayEvents = events.filter(event => {
        const start = new Date(event.event_date);
        const end = event.end_date ? new Date(event.end_date) : start;
        return date >= start && date <= end;
      });
      if (dayEvents.length > 0) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            marginTop: '2px',
            flexWrap: 'wrap'
          }}>
            {dayEvents.slice(0, 3).map((e, i) => (
              <div key={i} style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: e.type === 'internal' ? '#174A7E' : 
                           e.type === 'outgoing' ? '#C9A227' : '#B3262E',
                display: 'inline-block'
              }} />
            ))}
            {dayEvents.length > 3 && (
              <span style={{ fontSize: '8px', color: '#667085' }}>
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayEvents = events.filter(event => {
        const start = new Date(event.event_date);
        const end = event.end_date ? new Date(event.end_date) : start;
        return date >= start && date <= end;
      });
      if (dayEvents.length > 0) {
        return 'event-day';
      }
    }
    return null;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const start = new Date(event.event_date);
      const end = event.end_date ? new Date(event.end_date) : start;
      return date >= start && date <= end;
    });
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
          <span style={{ fontSize: '32px' }}>📅</span>
          <div>
            <h1>Календарь мероприятий</h1>
            <p>Наглядный календарь событий ДОД «Дипломаты будущего»</p>
          </div>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate('/events')}
          >
            📋 Список
          </button>
        </div>

        {/* КАЛЕНДАРЬ */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <style>
            {`
              .react-calendar {
                border: none !important;
                width: 100% !important;
                font-family: 'Inter', sans-serif !important;
              }
              .react-calendar__tile {
                padding: 12px 4px !important;
                height: 65px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                border-radius: 8px !important;
                transition: all 0.2s ease !important;
                font-size: 14px !important;
              }
              .react-calendar__tile:hover {
                background: #F4F6F9 !important;
              }
              .react-calendar__tile--active {
                background: #0B1F3A !important;
                color: white !important;
              }
              .react-calendar__tile--now {
                background: #E8EDF3 !important;
              }
              .react-calendar__month-view__weekdays {
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #667085 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
              }
              .react-calendar__month-view__weekdays__weekday {
                padding: 8px 0 !important;
              }
              .react-calendar__month-view__weekdays abbr {
                text-decoration: none !important;
              }
              .react-calendar__navigation {
                margin-bottom: 12px !important;
              }
              .react-calendar__navigation button {
                font-size: 16px !important;
                font-weight: 600 !important;
                color: #0B1F3A !important;
                padding: 8px 16px !important;
                border-radius: 8px !important;
                transition: all 0.2s ease !important;
              }
              .react-calendar__navigation button:hover {
                background: #F4F6F9 !important;
              }
              .event-day {
                background: #F0F7FF !important;
                font-weight: 600 !important;
              }
              .event-day:hover {
                background: #E2E8F0 !important;
              }
              .react-calendar__month-view__days__day--weekend {
                color: #B3262E !important;
              }
            `}
          </style>

          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            onClickDay={handleDateClick}
          />
        </div>

        {/* МЕРОПРИЯТИЯ НА ВЫБРАННЫЙ ДЕНЬ */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {getEventsForDate(selectedDate).length} мероприятий
            </span>
          </div>

          {getEventsForDate(selectedDate).length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>На этот день мероприятий нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getEventsForDate(selectedDate).map((event) => (
                <div
                  key={event.id}
                  className="list-item"
                  style={{
                    borderLeftColor: event.type === 'internal' ? '#174A7E' : 
                                   event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                  }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowModal(true);
                  }}
                >
                  <div className="title">{event.title}</div>
                  <div className="subtitle">
                    📍 {event.location || 'Место не указано'}
                    {event.start_time && ` • ⏰ ${event.start_time}`}
                    {event.club_name && ` • 🏫 ${event.club_name}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && selectedEvent && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '100%', padding: '32px', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', fontSize: '24px', color: '#98A2B3', cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>
                {selectedEvent.type === 'internal' ? '📌' : 
                 selectedEvent.type === 'outgoing' ? '🌍' : '🏛️'}
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A' }}>
                {selectedEvent.title}
              </h2>
            </div>

            {selectedEvent.club_name && (
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
                🏫 {selectedEvent.club_name}
              </p>
            )}

            <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
              📅 {new Date(selectedEvent.event_date).toLocaleDateString('ru-RU')}
              {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date && (
                <> — {new Date(selectedEvent.end_date).toLocaleDateString('ru-RU')}</>
              )}
            </p>

            {selectedEvent.start_time && (
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
                ⏰ {selectedEvent.start_time}
                {selectedEvent.end_time && <> — {selectedEvent.end_time}</>}
              </p>
            )}

            {selectedEvent.location && (
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '4px' }}>
                📍 {selectedEvent.location}
              </p>
            )}

            <div className="tag" style={{
              marginTop: '8px',
              background: selectedEvent.type === 'internal' ? '#EAF2FA' : 
                         selectedEvent.type === 'outgoing' ? '#FBF4DC' : '#FCEBEC',
              color: selectedEvent.type === 'internal' ? '#174A7E' : 
                     selectedEvent.type === 'outgoing' ? '#C9A227' : '#B3262E'
            }}>
              {selectedEvent.type === 'internal' ? 'Внутреннее' : 
               selectedEvent.type === 'outgoing' ? 'Выездное' : 'Форум'}
            </div>

            {selectedEvent.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '4px' }}>
                  Описание
                </h4>
                <p style={{ fontSize: '14px', color: '#667085', lineHeight: '1.6' }}>
                  {selectedEvent.description}
                </p>
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
              <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                👥 Лимит мест: {selectedEvent.capacity || 'Не ограничен'}
              </p>
            </div>

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setShowModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}