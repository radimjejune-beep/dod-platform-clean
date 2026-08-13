// frontend/src/pages/ClubDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showEditForm, setShowEditForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    school: '',
    leader_name: '',
    contact_email: '',
    contact_phone: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      // Загружаем клуб
      const clubsData = await api.getClubs();
      const foundClub = clubsData.find(c => c.id === id);

      if (!foundClub) {
        setLoading(false);
        return;
      }

      setClub(foundClub);
      setForm({
        name: foundClub.name || '',
        description: foundClub.description || '',
        city: foundClub.city || '',
        school: foundClub.school || '',
        leader_name: foundClub.leader_name || '',
        contact_email: foundClub.contact_email || '',
        contact_phone: foundClub.contact_phone || ''
      });

      // Загружаем участников клуба
      const participantsData = await api.getParticipants();
      const clubParticipants = participantsData.filter(p => p.club_id === id);
      setParticipants(clubParticipants || []);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ПРОВЕРКА ПРАВ НА РЕДАКТИРОВАНИЕ
  // ============================================================
  const canEdit = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'club_coordinator';

  // Проверка, что это клуб координатора
  const isMyClub = profile?.role === 'club_coordinator' && 
                   (club?.coordinator_id === profile?.id || club?.leader_id === profile?.id);

  const canEditThis = canEdit && (profile?.role === 'admin' || profile?.role === 'movement_coordinator' || isMyClub);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // TODO: добавить API для обновления клуба
      setMessage('✅ Информация о КЮДе обновлена!');
      setMessageType('success');
      setShowEditForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">❌</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>КЮД не найден</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <button
          className="btn-secondary"
          onClick={() => navigate('/clubs')}
          style={{ marginBottom: '20px' }}
        >
          ← Назад к списку
        </button>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ИНФОРМАЦИЯ О КЛУБЕ */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                🏫 {club.name}
              </h1>
              {club.description && <p style={{ color: '#667085', marginTop: '8px' }}>{club.description}</p>}
              {club.city && <p style={{ color: '#667085' }}>📍 {club.city}</p>}
              {club.leader_name && <p style={{ color: '#667085' }}>👤 Руководитель: {club.leader_name}</p>}
              {club.contact_email && <p style={{ color: '#667085' }}>📧 {club.contact_email}</p>}
              {club.contact_phone && <p style={{ color: '#667085' }}>📞 {club.contact_phone}</p>}
              <div style={{ marginTop: '12px' }}>
                <span className="status-active">👥 {participants.length} участников</span>
              </div>
            </div>
            {canEditThis && (
              <button
                className="btn-primary"
                onClick={() => setShowEditForm(!showEditForm)}
              >
                {showEditForm ? '✖ Закрыть' : '✏️ Редактировать'}
              </button>
            )}
          </div>
        </div>

        {/* ФОРМА РЕДАКТИРОВАНИЯ */}
        {showEditForm && canEditThis && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              ✏️ Редактировать КЮД
            </h3>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
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
                  {loading ? '⏳ Сохранение...' : '💾 Сохранить'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* УЧАСТНИКИ */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            👥 Участники КЮДа
          </h3>
          {participants.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👀</div>
              <p>В этом КЮДе пока нет участников</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {participants.map((p) => (
                <div key={p.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                  <div className="title">
                    {p.full_name}
                    {p.status === 'active' ? (
                      <span className="status-active" style={{ marginLeft: '8px', fontSize: '11px' }}>
                        Активен
                      </span>
                    ) : (
                      <span className="status-inactive" style={{ marginLeft: '8px', fontSize: '11px' }}>
                        Неактивен
                      </span>
                    )}
                  </div>
                  <div className="subtitle">
                    {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
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