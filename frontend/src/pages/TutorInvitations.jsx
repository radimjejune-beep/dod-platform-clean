// frontend/src/pages/TutorInvitations.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TutorInvitations() {
  const [profile, setProfile] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    tutor_id: '',
    event_id: '',
    club_id: '',
    message: '',
    role: 'Тьютор',
    responsibilities: [],
    start_date: '',
    end_date: ''
  });
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorResults, setTutorResults] = useState([]);
  const [showTutorDropdown, setShowTutorDropdown] = useState(false);
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

      const [invitationsData, usersData, eventsData, clubsData] = await Promise.all([
        api.getTutorInvitations(),
        api.getUsers(),
        api.getEvents(),
        api.getClubs()
      ]);

      setInvitations(invitationsData || []);
      setUsers(usersData || []);
      setEvents(eventsData || []);
      setClubs(clubsData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTutor = (query) => {
    setTutorSearch(query);
    if (query.length > 1) {
      const filtered = users.filter(u => 
        u.role === 'tutor' && 
        u.full_name?.toLowerCase().includes(query.toLowerCase())
      );
      setTutorResults(filtered);
      setShowTutorDropdown(filtered.length > 0);
    } else {
      setTutorResults([]);
      setShowTutorDropdown(false);
    }
  };

  const handleSelectTutor = (tutor) => {
    setForm({ ...form, tutor_id: tutor.id });
    setTutorSearch(tutor.full_name);
    setShowTutorDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const result = await api.createTutorInvitation(form);
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Приглашение отправлено тьютору!');
      setMessageType('success');
      setForm({
        tutor_id: '',
        event_id: '',
        club_id: '',
        message: '',
        role: 'Тьютор',
        responsibilities: [],
        start_date: '',
        end_date: ''
      });
      setTutorSearch('');
      setShowForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id, status) => {
    if (!confirm(`Подтвердить ${status === 'accepted' ? 'принятие' : 'отклонение'} приглашения?`)) return;

    try {
      const result = await api.respondToTutorInvitation(id, status);
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(status === 'accepted' ? '✅ Приглашение принято!' : '❌ Приглашение отклонено');
      setMessageType(status === 'accepted' ? 'success' : 'error');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#8A6A00', bg: '#FBF4DC', label: '⏳ Ожидает' },
      'accepted': { color: '#16845B', bg: '#E8F5EF', label: '✅ Принято' },
      'declined': { color: '#B3262E', bg: '#FCEBEC', label: '❌ Отклонено' },
      'cancelled': { color: '#667085', bg: '#F4F6F9', label: '✖ Отменено' }
    };
    return badges[status] || badges['pending'];
  };

  const canCreate = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);
  const isTutor = profile?.role === 'tutor';
  const canView = isTutor || canCreate;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>Только тьюторы и администраторы</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📨</span>
          <div>
            <h1>{isTutor ? 'Мои приглашения' : 'Приглашения тьюторов'}</h1>
            <p>
              {isTutor 
                ? 'Приглашения на мероприятия от координаторов' 
                : 'Управление приглашениями для тьюторов'}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) setTutorSearch('');
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать приглашение'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Создать приглашение для тьютора
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Тьютор *</label>
                  <input
                    type="text"
                    value={tutorSearch}
                    onChange={(e) => handleSearchTutor(e.target.value)}
                    onFocus={() => {
                      if (tutorSearch.length > 1) {
                        const filtered = users.filter(u => 
                          u.role === 'tutor' && 
                          u.full_name?.toLowerCase().includes(tutorSearch.toLowerCase())
                        );
                        setTutorResults(filtered);
                        setShowTutorDropdown(filtered.length > 0);
                      }
                    }}
                    placeholder="Начните вводить ФИО тьютора..."
                    required
                  />
                  {showTutorDropdown && tutorResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E7EF',
                      borderRadius: '10px',
                      boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}>
                      {tutorResults.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectTutor(t)}
                        >
                          <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                            {t.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            📧 {t.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.tutor_id && (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 12px',
                      background: '#E8F5EF',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#16845B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ✅ Выбран: <strong>{tutorSearch}</strong>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#B3262E', cursor: 'pointer', marginLeft: 'auto' }}
                        onClick={() => {
                          setForm({ ...form, tutor_id: '' });
                          setTutorSearch('');
                          setTutorResults([]);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Мероприятие *</label>
                  <select
                    value={form.event_id}
                    onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите мероприятие</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({new Date(e.event_date).toLocaleDateString('ru-RU')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Клуб</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Роль</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="Тьютор">📚 Тьютор</option>
                    <option value="Старший тьютор">⭐ Старший тьютор</option>
                    <option value="Организатор">📋 Организатор</option>
                    <option value="Медиа">📸 Медиа</option>
                    <option value="Сопровождение">🤝 Сопровождение</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Сообщение для тьютора</label>
                  <textarea
                    rows="2"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Приветственное сообщение для тьютора..."
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Обязанности</label>
                  <input
                    type="text"
                    value={form.responsibilities.join(', ')}
                    onChange={(e) => setForm({
                      ...form,
                      responsibilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Фото, видео, логистика, координация"
                  />
                </div>

                <div className="form-group">
                  <label>Дата начала</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Отправка...' : '📤 Отправить приглашение'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>{isTutor ? 'У вас пока нет приглашений' : 'Приглашений пока нет'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {invitations.map((inv) => {
              const status = getStatusBadge(inv.status);
              return (
                <div
                  key={inv.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${status.color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                          {inv.event_title || 'Мероприятие'}
                        </h3>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                        {inv.club_name && (
                          <span className="tag tag-blue">🏫 {inv.club_name}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#475467', marginTop: '8px' }}>
                        👤 {inv.tutor_name || 'Тьютор'}
                        {inv.tutor_email && ` (${inv.tutor_email})`}
                      </div>
                      {inv.event_date && (
                        <div style={{ fontSize: '14px', color: '#475467' }}>
                          📅 {new Date(inv.event_date).toLocaleDateString('ru-RU')}
                          {inv.start_date && inv.end_date && (
                            <> • 📅 Период: {new Date(inv.start_date).toLocaleDateString('ru-RU')} — {new Date(inv.end_date).toLocaleDateString('ru-RU')}</>
                          )}
                        </div>
                      )}
                      {inv.role && (
                        <div style={{ fontSize: '14px', color: '#475467' }}>
                          🎯 {inv.role}
                        </div>
                      )}
                      {inv.responsibilities && inv.responsibilities.length > 0 && (
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                          📋 Обязанности: {inv.responsibilities.join(', ')}
                        </div>
                      )}
                      {inv.message && (
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                          💬 {inv.message}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                        👤 От: {inv.created_by_name || 'Неизвестно'}
                        {' • '}
                        📅 {new Date(inv.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    {isTutor && inv.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          className="btn-success"
                          style={{ padding: '6px 16px', fontSize: '12px' }}
                          onClick={() => handleRespond(inv.id, 'accepted')}
                        >
                          ✅ Принять
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 16px', fontSize: '12px' }}
                          onClick={() => handleRespond(inv.id, 'declined')}
                        >
                          ❌ Отклонить
                        </button>
                      </div>
                    )}
                    {canCreate && inv.status === 'pending' && (
                      <button
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => {
                          if (confirm('Отменить приглашение?')) {
                            api.cancelTutorInvitation(inv.id).then(() => loadData());
                          }
                        }}
                      >
                        🗑️ Отменить
                      </button>
                    )}
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