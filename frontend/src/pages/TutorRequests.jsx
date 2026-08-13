// frontend/src/pages/TutorRequests.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TutorRequests() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    tutor_name: '',
    tutor_email: '',
    tutor_phone: '',
    event_date: '',
    event_name: '',
    event_description: '',
    role: 'Тьютор',
    responsibilities: [],
    notes: ''
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

      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/tutor-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('📥 Запросы:', data);
      setRequests(data || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const cleanPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^0-9+]/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/tutor-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          tutor_phone: cleanPhone(form.tutor_phone)
        })
      });

      const result = await response.json();
      console.log('📥 Результат:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Запрос отправлен координатору движения!');
      setMessageType('success');
      setForm({
        tutor_name: '',
        tutor_email: '',
        tutor_phone: '',
        event_date: '',
        event_name: '',
        event_description: '',
        role: 'Тьютор',
        responsibilities: [],
        notes: ''
      });
      setShowForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    if (!confirm(`Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'} запроса?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/tutor-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(status === 'approved' ? '✅ Запрос одобрен!' : '❌ Запрос отклонён');
      setMessageType(status === 'approved' ? 'success' : 'error');
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
      'approved': { color: '#16845B', bg: '#E8F5EF', label: '✅ Одобрено' },
      'rejected': { color: '#B3262E', bg: '#FCEBEC', label: '❌ Отклонено' },
      'cancelled': { color: '#667085', bg: '#F4F6F9', label: '✖ Отменено' }
    };
    return badges[status] || badges['pending'];
  };

  const canCreate = profile?.role === 'club_coordinator';
  const canReview = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);
  const canView = canCreate || canReview;

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
            <p style={{ color: '#667085' }}>Только координаторы КЮДа и администраторы</p>
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
          <span style={{ fontSize: '32px' }}>🤝</span>
          <div>
            <h1>Запросы на тьюторов</h1>
            <p>
              {canCreate 
                ? 'Отправьте запрос координатору движения на приглашение тьютора' 
                : 'Управление запросами от координаторов КЮДов'}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать запрос'}
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
              📝 Запрос на приглашение тьютора
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>ФИО тьютора *</label>
                  <input
                    type="text"
                    value={form.tutor_name}
                    onChange={(e) => setForm({ ...form, tutor_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div className="form-group">
                  <label>Email тьютора</label>
                  <input
                    type="email"
                    value={form.tutor_email}
                    onChange={(e) => setForm({ ...form, tutor_email: e.target.value })}
                    placeholder="tutor@mail.com"
                  />
                </div>
                <div className="form-group">
                  <label>Телефон тьютора</label>
                  <input
                    type="tel"
                    value={form.tutor_phone}
                    onChange={(e) => setForm({ ...form, tutor_phone: e.target.value })}
                    placeholder="+7 999 123 45 67"
                  />
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    Введите номер без скобок, например: +7 999 123 45 67
                  </div>
                </div>
                <div className="form-group">
                  <label>Дата мероприятия *</label>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Название мероприятия *</label>
                  <input
                    type="text"
                    value={form.event_name}
                    onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                    required
                    placeholder="Название мероприятия"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Описание мероприятия</label>
                  <textarea
                    rows="2"
                    value={form.event_description}
                    onChange={(e) => setForm({ ...form, event_description: e.target.value })}
                    placeholder="Краткое описание мероприятия..."
                  />
                </div>
                <div className="form-group">
                  <label>Роль тьютора</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="Тьютор">📚 Тьютор</option>
                    <option value="Старший тьютор">⭐ Старший тьютор</option>
                    <option value="Организатор">📋 Организатор</option>
                    <option value="Медиа">📸 Медиа</option>
                    <option value="Сопровождение">🤝 Сопровождение</option>
                    <option value="Образовательная работа">📚 Образовательная работа</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Обязанности</label>
                  <input
                    type="text"
                    value={form.responsibilities.join(', ')}
                    onChange={(e) => setForm({
                      ...form,
                      responsibilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Фото, видео, логистика"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Дополнительная информация</label>
                  <textarea
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Любая дополнительная информация..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Отправка...' : '📤 Отправить запрос'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Запросов пока нет</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map((req) => {
              const status = getStatusBadge(req.status);
              return (
                <div
                  key={req.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${status.color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                          {req.tutor_name}
                        </h3>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                        {req.club_name && (
                          <span className="tag tag-blue">🏫 {req.club_name}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#475467', marginTop: '8px' }}>
                        📅 {new Date(req.event_date).toLocaleDateString('ru-RU')}
                        {' • '}
                        📋 {req.event_name}
                      </div>
                      {req.event_description && (
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                          {req.event_description}
                        </div>
                      )}
                      {req.role && (
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                          🎯 {req.role}
                        </div>
                      )}
                      {req.responsibilities && req.responsibilities.length > 0 && (
                        <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                          📋 Обязанности: {req.responsibilities.join(', ')}
                        </div>
                      )}
                      {req.notes && (
                        <div style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                          📝 {req.notes}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                        👤 {req.requested_by_name || 'Координатор'}
                        {' • '}
                        📅 {new Date(req.created_at).toLocaleString('ru-RU')}
                      </div>
                      {req.comment && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          background: '#F8FAFC',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#475467',
                          border: '1px solid #E2E7EF'
                        }}>
                          💬 {req.comment}
                        </div>
                      )}
                      {req.reviewed_by_name && req.status !== 'pending' && (
                        <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                          {req.status === 'approved' ? '✅' : '❌'} Рассмотрел: {req.reviewed_by_name}
                          {req.reviewed_at && ` • ${new Date(req.reviewed_at).toLocaleString('ru-RU')}`}
                        </div>
                      )}
                    </div>
                    {canReview && req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          className="btn-success"
                          style={{ padding: '6px 16px', fontSize: '12px' }}
                          onClick={() => handleReview(req.id, 'approved')}
                        >
                          ✅ Одобрить
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 16px', fontSize: '12px' }}
                          onClick={() => handleReview(req.id, 'rejected')}
                        >
                          ❌ Отклонить
                        </button>
                      </div>
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