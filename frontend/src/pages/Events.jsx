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
  const [filterType, setFilterType] = useState('all'); // 'all', 'club', 'global'
  const [pendingEvents, setPendingEvents] = useState([]);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [moderationComment, setModerationComment] = useState('');
  
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
    form_url: '',
    is_global: false
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
      
      // Фильтруем мероприятия, ожидающие модерации
      const pending = eventsData.filter(e => e.moderation_status === 'pending');
      setPendingEvents(pending || []);
      
      // Применяем фильтр
      applyFilter(eventsData || [], 'all');
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (eventsData, filter) => {
    const role = profile?.role;
    let filtered = eventsData;

    if (filter === 'club' && role === 'club_coordinator') {
      // Только мероприятия клуба координатора
      const userClub = clubs.find(c => c.coordinator_id === profile?.id || c.leader_id === profile?.id);
      if (userClub) {
        filtered = eventsData.filter(e => e.club_id === userClub.id);
      } else {
        filtered = [];
      }
    } else if (filter === 'global') {
      // Только глобальные мероприятия
      filtered = eventsData.filter(e => e.is_global === true);
    }

    setEvents(filtered);
    setFilterType(filter);
  };

  const handleFilterChange = (filter) => {
    applyFilter(allEvents, filter);
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
        form_url: form.form_url || null,
        is_global: form.is_global || false
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

      if (result.moderation_status === 'pending') {
        setMessage('✅ Мероприятие отправлено на модерацию!');
      } else {
        setMessage(form.id ? '✅ Мероприятие обновлено!' : '✅ Мероприятие создано!');
      }
      
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

  const handleModerate = async (id, status) => {
    if (!confirm(`Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'} мероприятия?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${id}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: status,
          comment: moderationComment
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(status === 'approved' ? '✅ Мероприятие одобрено!' : '❌ Мероприятие отклонено');
      setMessageType(status === 'approved' ? 'success' : 'error');
      setShowModerationModal(false);
      setModerationComment('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
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
      form_url: '',
      is_global: false
    });
    setShowForm(false);
  };

  const canCreate = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator' ||
                    profile?.role === 'president' ||
                    profile?.role === 'vice_president';

  const canModerate = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);
  const isClubCoordinator = profile?.role === 'club_coordinator';

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
              {isClubCoordinator 
                ? `Всего мероприятий: ${events.length}` 
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

        {/* Ожидающие модерации */}
        {canModerate && pendingEvents.length > 0 && (
          <div className="card" style={{ 
            marginBottom: '20px', 
            background: '#FBF4DC',
            border: '2px solid #C9A227'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#8A6A00', marginBottom: '8px' }}>
              ⏳ Ожидают модерации ({pendingEvents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingEvents.map((e) => (
                <div key={e.id} style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E2E7EF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>{e.title}</div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      🏫 {e.club_name || 'Без клуба'} • 📅 {new Date(e.event_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                    onClick={() => {
                      setSelectedEvent(e);
                      setShowModerationModal(true);
                    }}
                  >
                    📋 Рассмотреть
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ФИЛЬТРЫ */}
        {isClubCoordinator && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              className={filterType === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 20px', fontSize: '13px' }}
              onClick={() => handleFilterChange('all')}
            >
              📋 Все мероприятия
            </button>
            <button
              className={filterType === 'club' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 20px', fontSize: '13px' }}
              onClick={() => handleFilterChange('club')}
            >
              🏫 Наши мероприятия
            </button>
            <button
              className={filterType === 'global' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 20px', fontSize: '13px' }}
              onClick={() => handleFilterChange('global')}
            >
              🌍 Мероприятия ДОД
            </button>
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

              {/* ЧЕКБОКС ДЛЯ ГЛОБАЛЬНОГО МЕРОПРИЯТИЯ */}
              {isClubCoordinator && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_global}
                      onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      🌍 Глобальное мероприятие ДОД
                    </span>
                  </label>
                  {form.is_global && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      background: '#FBF4DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#8A6A00'
                    }}>
                      ⚠️ Глобальное мероприятие будет отправлено на модерацию координатору движения
                    </div>
                  )}
                </div>
              )}

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
            {filterType === 'club' ? '🏫 Наши мероприятия' : 
             filterType === 'global' ? '🌍 Мероприятия ДОД' : 
             'Все мероприятия'}
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
                    borderLeftColor: event.moderation_status === 'pending' ? '#C9A227' :
                                  event.is_global ? '#6B46C1' :
                                  event.type === 'internal' ? '#174A7E' :
                                  event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                  }}
                >
                  <div className="title">
                    {event.title}
                    {event.is_global && (
                      <span className="tag" style={{ 
                        marginLeft: '8px',
                        background: '#EDE7F6',
                        color: '#6B46C1',
                        fontSize: '10px'
                      }}>
                        🌍 Глобальное
                      </span>
                    )}
                    {event.moderation_status === 'pending' && (
                      <span className="tag" style={{ 
                        marginLeft: '8px',
                        background: '#FBF4DC',
                        color: '#8A6A00',
                        fontSize: '10px'
                      }}>
                        ⏳ На модерации
                      </span>
                    )}
                    {event.moderation_status === 'rejected' && (
                      <span className="tag" style={{ 
                        marginLeft: '8px',
                        background: '#FCEBEC',
                        color: '#B3262E',
                        fontSize: '10px'
                      }}>
                        ❌ Отклонено
                      </span>
                    )}
                  </div>
                  <div className="subtitle">
                    📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                    {event.location && ` 📍 ${event.location}`}
                    {event.club_name && ` 🏫 ${event.club_name}`}
                  </div>
                  {event.description && <div className="meta">{event.description}</div>}
                  {(canCreate || canModerate) && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      {canCreate && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => {
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
                              form_url: event.form_url || '',
                              is_global: event.is_global || false
                            });
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                      {canModerate && event.moderation_status === 'pending' && (
                        <>
                          <button
                            className="btn-success"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowModerationModal(true);
                            }}
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowModerationModal(true);
                            }}
                          >
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЛЯ МОДЕРАЦИИ */}
      {showModerationModal && selectedEvent && (
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
          onClick={() => setShowModerationModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '4px' }}>
              📋 Модерация мероприятия
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              <strong>{selectedEvent.title}</strong>
              <br />
              🏫 {selectedEvent.club_name || 'Без клуба'}
              <br />
              📅 {new Date(selectedEvent.event_date).toLocaleDateString('ru-RU')}
            </p>

            <div className="form-group">
              <label>Комментарий (необязательно)</label>
              <textarea
                rows="3"
                value={moderationComment}
                onChange={(e) => setModerationComment(e.target.value)}
                placeholder="Причина одобрения или отклонения..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-success"
                style={{ flex: 1 }}
                onClick={() => handleModerate(selectedEvent.id, 'approved')}
              >
                ✅ Одобрить
              </button>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => handleModerate(selectedEvent.id, 'rejected')}
              >
                ❌ Отклонить
              </button>
            </div>
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setShowModerationModal(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}