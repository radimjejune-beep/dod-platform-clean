// frontend/src/pages/StaffCalendar.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function StaffCalendar() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState(null);
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

      const usersData = await api.getUsers();
      const staffRoles = ['tutor', 'club_coordinator', 'movement_coordinator', 'admin'];
      const staffData = usersData.filter(u => staffRoles.includes(u.role));
      setStaff(staffData || []);

      // TODO: добавить API для получения назначений
      setAssignments([]);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentsForDate = (date) => {
    return assignments.filter(a => {
      const start = new Date(a.start_date || a.event_date);
      const end = a.end_date ? new Date(a.end_date) : start;
      return date >= start && date <= end;
    });
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || 'Неизвестный';
  };

  const getRoleColor = (role) => {
    const colors = {
      'tutor': '#174A7E',
      'club_coordinator': '#C9A227',
      'movement_coordinator': '#6B46C1',
      'admin': '#B3262E'
    };
    return colors[role] || '#667085';
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayAssignments = getAssignmentsForDate(date);
      if (dayAssignments.length > 0) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            marginTop: '2px',
            flexWrap: 'wrap'
          }}>
            {dayAssignments.slice(0, 3).map((a) => (
              <div
                key={a.id}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: getRoleColor(a.staff_role || 'tutor'),
                  display: 'inline-block'
                }}
              />
            ))}
            {dayAssignments.length > 3 && (
              <span style={{ fontSize: '7px', color: '#667085' }}>
                +{dayAssignments.length - 3}
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
      const dayAssignments = getAssignmentsForDate(date);
      if (dayAssignments.length > 0) {
        return 'staff-event-day';
      }
    }
    return null;
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dayAssignments = getAssignmentsForDate(date);
    if (dayAssignments.length > 0) {
      setSelectedAssignment(dayAssignments[0]);
      setShowModal(true);
    }
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
            <h1>Календарь сотрудников</h1>
            <p>Назначения сотрудников на мероприятия</p>
          </div>
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
              .staff-event-day {
                background: #F0F7FF !important;
                font-weight: 600 !important;
              }
              .staff-event-day:hover {
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

        {/* СПИСОК НАЗНАЧЕНИЙ */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {getAssignmentsForDate(selectedDate).length} назначений
            </span>
          </div>

          {getAssignmentsForDate(selectedDate).length === 0 ? (
            <div className="empty-state">
              <div className="icon">📅</div>
              <p>На этот день назначений нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getAssignmentsForDate(selectedDate).map((a) => (
                <div
                  key={a.id}
                  className="list-item"
                  style={{ borderLeftColor: getRoleColor(a.staff_role || 'tutor') }}
                  onClick={() => {
                    setSelectedAssignment(a);
                    setShowModal(true);
                  }}
                >
                  <div className="title">{a.event_title || 'Мероприятие'}</div>
                  <div className="subtitle">
                    👤 {getStaffName(a.staff_id)}
                    <span className="tag tag-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                      {a.role}
                    </span>
                  </div>
                  {a.notes && <div className="meta">📝 {a.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && selectedAssignment && (
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

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              {selectedAssignment.event_title || 'Назначение'}
            </h2>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Сотрудник:</span>
                <span style={{ color: '#667085' }}>{getStaffName(selectedAssignment.staff_id)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Роль:</span>
                <span className="tag tag-blue">{selectedAssignment.role}</span>
              </div>
              {selectedAssignment.start_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>Даты:</span>
                  <span style={{ color: '#667085' }}>
                    {new Date(selectedAssignment.start_date).toLocaleDateString('ru-RU')}
                    {selectedAssignment.end_date && selectedAssignment.end_date !== selectedAssignment.start_date && (
                      <> — {new Date(selectedAssignment.end_date).toLocaleDateString('ru-RU')}</>
                    )}
                  </span>
                </div>
              )}
              {selectedAssignment.notes && (
                <div style={{ marginTop: '8px', padding: '12px', background: '#F4F6F9', borderRadius: '8px' }}>
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>📝 Примечание:</span>
                  <span style={{ color: '#667085', marginLeft: '4px' }}>{selectedAssignment.notes}</span>
                </div>
              )}
            </div>

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '8px' }}
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