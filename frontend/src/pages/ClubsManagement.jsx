// frontend/src/pages/ClubsManagement.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubsManagement() {
  const [profile, setProfile] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    school: '',
    leader_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'active'
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

      if (userData.role !== 'movement_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // Проверка обязательных полей
      if (!form.name.trim()) {
        setMessage('❌ Название клуба обязательно');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // TODO: добавить API для создания/обновления клуба
      // Пока имитация
      await new Promise(resolve => setTimeout(resolve, 500));

      const newClub = {
        id: editingClub?.id || `club-${Date.now()}`,
        ...form,
        created_at: editingClub?.created_at || new Date().toISOString()
      };

      if (editingClub) {
        setClubs(clubs.map(c => c.id === editingClub.id ? newClub : c));
        setMessage('✅ КЮД обновлён!');
      } else {
        setClubs([...clubs, newClub]);
        setMessage('✅ КЮД создан!');
      }

      setMessageType('success');
      resetForm();
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
      name: '',
      description: '',
      city: '',
      school: '',
      leader_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'active'
    });
    setEditingClub(null);
    setShowForm(false);
  };

  const handleEdit = (club) => {
    setEditingClub(club);
    setForm({
      name: club.name || '',
      description: club.description || '',
      city: club.city || '',
      school: club.school || '',
      leader_name: club.leader_name || '',
      contact_email: club.contact_email || '',
      contact_phone: club.contact_phone || '',
      status: club.status || 'active'
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот КЮД? Все данные будут потеряны.')) return;

    try {
      // TODO: добавить API для удаления клуба
      await new Promise(resolve => setTimeout(resolve, 300));
      setClubs(clubs.filter(c => c.id !== id));
      setMessage('✅ КЮД удалён');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Архивировать этот КЮД? Он станет неактивным.')) return;

    try {
      setClubs(clubs.map(c => 
        c.id === id ? { ...c, status: 'archived' } : c
      ));
      setMessage('📦 КЮД архивирован');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { label: '🟢 Активен', color: '#16845B', bg: '#E8F5EF' },
      'inactive': { label: '🔴 Неактивен', color: '#B3262E', bg: '#FCEBEC' },
      'archived': { label: '📦 Архивирован', color: '#667085', bg: '#F4F6F9' }
    };
    return badges[status] || badges['active'];
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
          <span style={{ fontSize: '32px' }}>🏫</span>
          <div>
            <h1>Управление КЮДами</h1>
            <p>Всего клубов: {clubs.length}</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? '✖ Закрыть' : '➕ Создать КЮД'}
          </button>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {editingClub ? '✏️ Редактировать КЮД' : '📝 Создать КЮД'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="КЮД Москва"
                  />
                </div>
                <div className="form-group">
                  <label>Город</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Москва"
                  />
                </div>
                <div className="form-group">
                  <label>Школа/Организация</label>
                  <input
                    type="text"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="ГБОУ Школа №1468"
                  />
                </div>
                <div className="form-group">
                  <label>Руководитель</label>
                  <input
                    type="text"
                    value={form.leader_name}
                    onChange={(e) => setForm({ ...form, leader_name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div className="form-group">
                  <label>Контактный email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="club@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Контактный телефон</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>
                <div className="form-group">
                  <label>Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">🔴 Неактивен</option>
                    <option value="archived">📦 Архивирован</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Подробное описание клуба..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingClub ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Все КЮДы
          </h3>
          {clubs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏫</div>
              <p>КЮДов пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clubs.map((club) => {
                const status = getStatusBadge(club.status);
                return (
                  <div
                    key={club.id}
                    className="list-item"
                    style={{
                      borderLeftColor: club.status === 'active' ? '#16845B' : 
                                    club.status === 'archived' ? '#667085' : '#B3262E',
                      opacity: club.status === 'archived' ? 0.7 : 1
                    }}
                  >
                    <div className="title">
                      {club.name}
                      <span className="tag" style={{ background: status.bg, color: status.color, marginLeft: '8px', fontSize: '10px' }}>
                        {status.label}
                      </span>
                    </div>
                    <div className="subtitle">
                      {club.city && `📍 ${club.city}`}
                      {club.school && ` • 🏫 ${club.school}`}
                      {club.leader_name && ` • 👤 ${club.leader_name}`}
                    </div>
                    {club.description && <div className="meta">{club.description}</div>}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleEdit(club)}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => navigate(`/club/${club.id}`)}
                      >
                        👁️ Просмотр
                      </button>
                      {club.status !== 'archived' && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px', background: '#667085', color: 'white' }}
                          onClick={() => handleArchive(club.id)}
                        >
                          📦 Архивировать
                        </button>
                      )}
                      {(profile?.role === 'admin') && (
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(club.id)}
                        >
                          🗑️ Удалить
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
    </div>
  );
}