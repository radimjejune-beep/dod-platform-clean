// frontend/src/pages/ClubDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import ClubEvents from '../components/ClubEvents';

export default function ClubDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
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
  // ПРОВЕРКА ПРАВ
  // ============================================================
  const canEdit = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'club_coordinator';

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

  const tabs = [
    { id: 'info', label: '📋 Информация', icon: '📋' },
    { id: 'events', label: '📅 Мероприятия', icon: '📅' },
    { id: 'members', label: '👥 Участники', icon: '👥' },
  ];

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

        {/* ===== ИНФОРМАЦИЯ О КЛУБЕ ===== */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                🏫 {club.name}
              </h1>
              {club.description && <p style={{ color: '#667085', marginTop: '8px' }}>{club.description}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
                {club.city && <span style={{ color: '#667085' }}>📍 {club.city}</span>}
                {club.school && <span style={{ color: '#667085' }}>🏫 {club.school}</span>}
                {club.leader_name && <span style={{ color: '#667085' }}>👤 {club.leader_name}</span>}
                {club.contact_email && <span style={{ color: '#667085' }}>📧 {club.contact_email}</span>}
                {club.contact_phone && <span style={{ color: '#667085' }}>📞 {club.contact_phone}</span>}
              </div>
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

        {/* ===== ФОРМА РЕДАКТИРОВАНИЯ ===== */}
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

        {/* ===== ВКЛАДКИ ===== */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === tab.id ? '#0B1F3A' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#667085',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            ВКЛАДКА: ИНФОРМАЦИЯ
            ============================================================ */}
        {activeTab === 'info' && (
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Название</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Город</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.city || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Школа</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.school || 'Не указана'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Руководитель</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.leader_name || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Email</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.contact_email || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Телефон</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.contact_phone || 'Не указан'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Участников</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{participants.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Дата создания</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                  {club.created_at ? new Date(club.created_at).toLocaleDateString('ru-RU') : 'Не указана'}
                </div>
              </div>
            </div>
            {club.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF' }}>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Описание</div>
                <div style={{ fontWeight: '500', color: '#0B1F3A', marginTop: '4px' }}>{club.description}</div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: МЕРОПРИЯТИЯ КЛУБА
            ============================================================ */}
        {activeTab === 'events' && (
          <div className="card">
            <ClubEvents clubId={id} profile={profile} />
          </div>
        )}

        {/* ============================================================
            ВКЛАДКА: УЧАСТНИКИ
            ============================================================ */}
        {activeTab === 'members' && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              👥 Участники КЮДа ({participants.length})
            </h3>
            {participants.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👀</div>
                <p>В этом КЮДе пока нет участников</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="list-item"
                    style={{ borderLeftColor: '#174A7E', cursor: 'pointer' }}
                    onClick={() => navigate(`/participant/${p.id}`)}
                  >
                    <div className="title">
                      {p.full_name}
                      {p.status === 'active' ? (
                        <span className="status-active" style={{ marginLeft: '8px', fontSize: '11px' }}>
                          🟢 Активен
                        </span>
                      ) : (
                        <span className="status-inactive" style={{ marginLeft: '8px', fontSize: '11px' }}>
                          🔴 Неактивен
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
        )}
      </div>
    </div>
  );
}