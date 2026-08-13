// src/pages/Participants.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Participants() {
  const [profile, setProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    id: null,
    full_name: '',
    email: '',
    birth_date: '',
    phone: '',
    school: '',
    class_name: '',
    club_id: '',
    interests: '',
    bio: '',
    position: '',
    status: 'active',
    role: 'participant'
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Получаем текущего пользователя
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      // Загружаем клубы
      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      // Загружаем участников
      await loadParticipants(userData);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  const loadParticipants = async (profileData) => {
    try {
      const data = await api.getProfiles();
      // Фильтруем только участников
      const participantsData = data.filter(p => p.role === 'participant');
      setParticipants(participantsData || []);
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // TODO: Добавить эндпоинт для создания/обновления участника
      // Пока просто показываем сообщение
      setMessage('✅ Функция в разработке');
      setMessageType('success');
      resetForm();
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
      full_name: '',
      email: '',
      birth_date: '',
      phone: '',
      school: '',
      class_name: '',
      club_id: '',
      interests: '',
      bio: '',
      position: '',
      status: 'active',
      role: 'participant'
    });
    setShowForm(false);
  };

  const handleEdit = (participant) => {
    setForm({
      id: participant.id,
      full_name: participant.full_name || '',
      email: participant.email || '',
      birth_date: participant.birth_date || '',
      phone: participant.phone || '',
      school: participant.school || '',
      class_name: participant.class_name || '',
      club_id: participant.club_id || '',
      interests: participant.interests || '',
      bio: participant.bio || '',
      position: participant.position || '',
      status: participant.status || 'active',
      role: participant.role || 'participant'
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFilteredParticipants = () => {
    let filtered = participants;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedClub) {
      filtered = filtered.filter(p => p.club_id === selectedClub);
    }

    return filtered;
  };

  const filtered = getFilteredParticipants();
  const role = profile?.role;
  const canManage = role === 'admin' || role === 'movement_coordinator' || role === 'club_coordinator';
  const showClubFilter = role === 'admin' || role === 'movement_coordinator';

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
      
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              👥 Участники
            </h1>
            <p style={{ color: '#667085', fontSize: '15px' }}>
              Все участники движения ({filtered.length})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {showClubFilter && (
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid #D5DCE7', background: 'white', cursor: 'pointer' }}
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              >
                {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
              </button>
            )}
            {canManage && (
              <button 
                className="btn btn-primary" 
                onClick={() => setShowForm(!showForm)}
                style={{ padding: '8px 20px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >
                {showForm ? '✖ Закрыть' : '➕ Добавить'}
              </button>
            )}
          </div>
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

        {/* Форма добавления */}
        {showForm && (
          <div className="card" style={{ background: 'white', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>
              {form.id ? '✏️ Редактировать участника' : '📝 Добавить участника'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">ФИО *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ivan@example.com"
                    disabled={!!form.id}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Телефон</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата рождения</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Школа</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="Школа №1"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Класс</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    placeholder="8А"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Статус</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">🔴 Неактивен</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Интересы</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.interests}
                  onChange={(e) => setForm({ ...form, interests: e.target.value })}
                  placeholder="Дипломатия, история, иностранные языки"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">О себе</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Расскажите о себе..."
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-success" disabled={loading} style={{ padding: '10px 28px', background: '#16845B', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Добавить'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ padding: '10px 28px', background: 'transparent', color: '#0B1F3A', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Фильтры и поиск */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по ФИО, email, школе..."
            />
          </div>

          {showClubFilter && (
            <div style={{ minWidth: '200px' }}>
              <select
                className="form-select"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white' }}
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
              >
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ fontSize: '14px', color: '#667085', padding: '6px 16px', background: 'white', borderRadius: '8px', border: '1px solid #E2E7EF' }}>
            Найдено: <strong>{filtered.length}</strong> участников
          </div>
        </div>

        {/* Табличный вид */}
        {viewMode === 'table' && (
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'auto', border: '1px solid #E2E7EF', boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#F4F6F9', borderBottom: '2px solid #E2E7EF' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>ФИО</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Класс</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Школа</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Статус</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>👀</div>
                      Участников не найдено
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F4F6F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0B1F3A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0B1F3A, #174A7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                            {p.full_name?.charAt(0) || '?'}
                          </div>
                          {p.full_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#667085' }}>{p.class_name || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#667085' }}>{p.school || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC', color: p.status === 'active' ? '#16845B' : '#B3262E' }}>
                          {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            style={{ padding: '4px 12px', background: '#F4F6F9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                            onClick={() => navigate(`/participant/${p.id}`)}
                          >
                            👁️
                          </button>
                          {canManage && (
                            <button
                              style={{ padding: '4px 12px', background: '#EAF2FA', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#174A7E' }}
                              onClick={() => handleEdit(p)}
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Карточный вид */}
        {viewMode === 'cards' && showClubFilter && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', padding: '16px', transition: 'all 0.2s ease', background: 'white', borderRadius: '12px', border: '1px solid #E2E7EF' }}
                onClick={() => navigate(`/participant/${p.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #0B1F3A, #174A7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: '600' }}>
                    {p.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>{p.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>{p.class_name || 'Класс не указан'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC', color: p.status === 'active' ? '#16845B' : '#B3262E' }}>
                    {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                  </span>
                  {p.school && (
                    <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', background: '#F4F6F9', color: '#667085' }}>
                      🏫 {p.school}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}