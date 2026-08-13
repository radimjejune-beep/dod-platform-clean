// frontend/src/pages/Events.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Events() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
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
  const [clubs, setClubs] = useState([]);
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

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      const eventsData = await api.getEvents();
      setEvents(eventsData || []);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

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
    }
    setLoading(false);
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
      if (result.error) {
        throw new Error(result.error);
      }
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

  const canCreate = profile?.role === 'admin' || profile?.role === 'movement_coordinator' || profile?.role === 'club_coordinator';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              📅 Мероприятия
            </h1>
            <p style={{ color: '#667085', fontSize: '15px' }}>
              Всего мероприятий: {events.length}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              style={{
                padding: '10px 24px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ */}
        {showForm && canCreate && (
          <div className="card" style={{ background: 'white', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>
              {form.id ? '✏️ Редактировать мероприятие' : '📝 Создать мероприятие'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Название *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Введите название"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Описание
                </label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Описание мероприятия"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Место
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Адрес или место проведения"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Дата начала *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Время начала
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Время окончания
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Тип
                  </label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="internal">Внутреннее</option>
                    <option value="outgoing">Выездное</option>
                    <option value="global_forum">Глобальный форум</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Лимит мест
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    min="1"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Клуб
                  </label>
                  <select
                    className="form-select"
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Ссылка на форму сбора данных
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={form.form_url}
                  onChange={(e) => setForm({ ...form, form_url: e.target.value })}
                  placeholder="https://docs.google.com/forms/..."
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading}
                  style={{
                    padding: '10px 28px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  style={{
                    padding: '10px 28px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК МЕРОПРИЯТИЙ */}
        <div className="card" style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E2E7EF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              Все мероприятия
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {events.length} мероприятий
            </span>
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <p style={{ color: '#667085', fontSize: '16px' }}>Мероприятий пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${
                      event.type === 'internal' ? '#174A7E' : 
                      event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                    }`,
                    transition: 'all 0.2s ease',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E7EF'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: '#0B1F3A' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                        {event.start_time && ` ⏰ ${event.start_time}`}
                        {event.location && ` 📍 ${event.location}`}
                        {event.club_name && ` 🏫 ${event.club_name}`}
                      </div>
                      {event.description && (
                        <div style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                          {event.description.length > 100 ? event.description.slice(0, 100) + '...' : event.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '2px 12px',
                          borderRadius: '20px',
                          background: event.type === 'internal' ? '#EAF2FA' : 
                                     event.type === 'outgoing' ? '#FBF4DC' : '#FCEBEC',
                          color: event.type === 'internal' ? '#174A7E' : 
                                 event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                        }}>
                          {event.type === 'internal' ? 'Внутреннее' : 
                           event.type === 'outgoing' ? 'Выездное' : 'Форум'}
                        </span>
                        {event.capacity && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '2px 12px',
                            borderRadius: '20px',
                            background: '#F4F6F9',
                            color: '#667085'
                          }}>
                            👥 {event.capacity} мест
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {canCreate && (
                        <>
                          <button
                            style={{
                              padding: '4px 12px',
                              background: '#EAF2FA',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: '#174A7E'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(event);
                            }}
                          >
                            ✏️
                          </button>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(event.id);
                            }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      <button
                        style={{
                          padding: '4px 12px',
                          background: '#F4F6F9',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onClick={() => navigate(`/event/${event.id}/participants`)}
                      >
                        👥
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}