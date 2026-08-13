// frontend/src/pages/Events.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Events() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [form, setForm] = useState({
    id: null,
    title: '',
    description: '',
    location: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    type: 'internal',
    capacity: 20,
    club_id: '',
    form_url: ''
  });
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

      const [clubsData, eventsData] = await Promise.all([
        api.getClubs(),
        api.getEvents()
      ]);

      setClubs(clubsData || []);
      setAllEvents(eventsData || []);

      const role = userData.role;
      let filtered = [];

      // ============================================================
      // ЛОГИКА ПО РОЛЯМ
      // ============================================================

      if (role === 'participant' || role === 'parent') {
        // УЧАСТНИК и РОДИТЕЛЬ — видят все мероприятия
        filtered = eventsData;
      } 
      else if (role === 'club_coordinator') {
        // КООРДИНАТОР КЮДА — видит мероприятия своего клуба
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          filtered = eventsData.filter(e => e.club_id === coordinatorClub.id || !e.club_id);
        } else {
          filtered = eventsData;
        }
      } 
      else if (role === 'tutor' || 
               role === 'movement_coordinator' || 
               role === 'admin' || 
               role === 'president' || 
               role === 'vice_president') {
        // ТЬЮТОР, КООРДИНАТОР, АДМИН, ПРЕЗИДЕНТ, ВИЦЕ — видят все
        filtered = eventsData;
      } 
      else {
        filtered = eventsData;
      }

      setEvents(filtered);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтр по клубу
  const canFilterByClub = profile?.role === 'admin' || 
                          profile?.role === 'movement_coordinator' || 
                          profile?.role === 'tutor' ||
                          profile?.role === 'president' ||
                          profile?.role === 'vice_president' ||
                          profile?.role === 'club_coordinator';

  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      setEvents(allEvents.filter(e => e.club_id === selectedClubId));
    } else {
      setEvents(allEvents);
    }
  }, [selectedClubId, allEvents, canFilterByClub]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const eventData = {
        title: form.title,
        description: form.description,
        location: form.location,
        event_date: form.event_date,
        end_date: form.end_date || form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        type: form.type,
        capacity: parseInt(form.capacity),
        club_id: form.club_id || null,
        form_url: form.form_url || null
      };

      let result;
      if (form.id) {
        result = await api.updateEvent(form.id, eventData);
      } else {
        result = await api.createEvent(eventData);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(form.id ? '✅ Мероприятие обновлено!' : '✅ Мероприятие создано!');
      setMessageType('success');
      resetForm();
      loadData();
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
      id: null,
      title: '',
      description: '',
      location: '',
      event_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      type: 'internal',
      capacity: 20,
      club_id: '',
      form_url: ''
    });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить мероприятие?')) return;
    try {
      const result = await api.deleteEvent(id);
      if (result.error) throw new Error(result.error);
      setMessage('✅ Мероприятие удалено');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleEdit = (event) => {
    setForm({
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      event_date: event.event_date || '',
      end_date: event.end_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      type: event.type || 'internal',
      capacity: event.capacity || 20,
      club_id: event.club_id || '',
      form_url: event.form_url || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Кто может создавать/редактировать мероприятия
  const canCreate = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' ||
                    profile?.role === 'club_coordinator';

  // Кто может удалять мероприятия
  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

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
            <h1>Мероприятия</h1>
            <p>
              {profile?.role === 'club_coordinator' 
                ? `Мероприятия вашего клуба (${events.length})` 
                : `Всего мероприятий: ${events.length}`}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ФИЛЬТР ПО КЮДАМ */}
        {canFilterByClub && clubs.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ minWidth: '200px' }}>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>
              {selectedClubId ? (
                <span>🔍 Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>📋 Все мероприятия</span>
              )}
            </div>
            {selectedClubId && (
              <button
                style={{
                  padding: '4px 12px',
                  background: '#FCEBEC',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#B3262E'
                }}
                onClick={() => setSelectedClubId('')}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ */}
        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>
              {form.id ? '✏️ Редактировать мероприятие' : '📝 Создать мероприятие'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Введите название"
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
                  placeholder="Адрес или место проведения"
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Дата начала *</label>
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

              <div className="grid-3">
                <div className="form-group">
                  <label>Тип</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="internal">Внутреннее</option>
                    <option value="outgoing">Выездное</option>
                    <option value="global_forum">Глобальный форум</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Лимит мест</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Клуб</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Ссылка на форму сбора данных</label>
                <input
                  type="url"
                  value={form.form_url}
                  onChange={(e) => setForm({ ...form, form_url: e.target.value })}
                  placeholder="https://docs.google.com/forms/..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК МЕРОПРИЯТИЙ */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            Все мероприятия
          </h3>

          {events.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>Мероприятий пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="list-item"
                  style={{
                    borderLeftColor: event.type === 'internal' ? '#174A7E' :
                                    event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                  }}
                >
                  <div className="title">{event.title}</div>
                  <div className="subtitle">
                    📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                    {event.location && ` 📍 ${event.location}`}
                    {event.club_name && ` 🏫 ${event.club_name}`}
                  </div>
                  {event.description && <div className="meta">{event.description}</div>}
                  {(canCreate || canDelete) && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      {canCreate && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleEdit(event)}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(event.id)}
                        >
                          🗑️ Удалить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}