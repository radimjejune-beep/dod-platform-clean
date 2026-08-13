// frontend/src/pages/Appeals.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Appeals() {
  const [profile, setProfile] = useState(null);
  const [appeals, setAppeals] = useState([]);
  const [allAppeals, setAllAppeals] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [form, setForm] = useState({
    subject: '',
    message: '',
    priority: 'medium'
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

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      const role = userData.role;
      let filteredAppeals = [];

      // ============================================================
      // ЛОГИКА ПО РОЛЯМ
      // ============================================================

      if (role === 'participant' || role === 'parent' || role === 'tutor') {
        // УЧАСТНИК, РОДИТЕЛЬ, ТЬЮТОР — не видят обращения
        filteredAppeals = [];
      } 
      else if (role === 'club_coordinator') {
        // КООРДИНАТОР КЮДА — видит свои обращения
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        // TODO: добавить API для получения обращений по координатору
        filteredAppeals = [];
      } 
      else if (role === 'movement_coordinator' || 
               role === 'admin' || 
               role === 'president' || 
               role === 'vice_president') {
        // КООРДИНАТОР, АДМИН, ПРЕЗИДЕНТ, ВИЦЕ — видят все обращения
        // TODO: добавить API для получения всех обращений
        filteredAppeals = [];
      } 
      else {
        filteredAppeals = [];
      }

      setAllAppeals(filteredAppeals);
      setAppeals(filteredAppeals);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтр по клубу
  const canFilterByClub = profile?.role === 'admin' || 
                          profile?.role === 'movement_coordinator' || 
                          profile?.role === 'president' ||
                          profile?.role === 'vice_president';

  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      setAppeals(allAppeals.filter(a => a.club_id === selectedClubId));
    } else {
      setAppeals(allAppeals);
    }
  }, [selectedClubId, allAppeals, canFilterByClub]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      const result = await api.addAppeal({
        subject: form.subject,
        message: form.message,
        priority: form.priority
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Обращение отправлено!');
      setMessageType('success');
      setForm({ subject: '', message: '', priority: 'medium' });
      setShowForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': '🟢 Низкий',
      'medium': '🟡 Средний',
      'high': '🔴 Высокий',
      'urgent': '🔥 Срочный'
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': '⏳ Ожидает',
      'in_progress': '🔄 В работе',
      'resolved': '✅ Решено',
      'closed': '📌 Закрыто'
    };
    return labels[status] || status;
  };

  // Кто может создавать обращения
  const canCreate = profile?.role === 'club_coordinator';

  // Кто может просматривать обращения
  const canView = profile?.role === 'club_coordinator' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'admin' ||
                  profile?.role === 'president' ||
                  profile?.role === 'vice_president';

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
            <p style={{ color: '#667085' }}>Только координаторы и администраторы</p>
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
            <h1>Обращения</h1>
            <p>
              {profile?.role === 'club_coordinator' 
                ? 'Ваши обращения к руководству' 
                : 'Все обращения от координаторов КЮДов'}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowForm(!showForm)}
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
                <span>📋 Все обращения</span>
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
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              ✍️ Новое обращение
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Тема *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  placeholder="Кратко опишите вопрос"
                />
              </div>

              <div className="form-group">
                <label>Приоритет</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">🟢 Низкий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="high">🔴 Высокий</option>
                  <option value="urgent">🔥 Срочный</option>
                </select>
              </div>

              <div className="form-group">
                <label>Текст обращения *</label>
                <textarea
                  rows="5"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  placeholder="Опишите ваше обращение подробно..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={sending}>
                  {sending ? '⏳ Отправка...' : '📤 Отправить'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК ОБРАЩЕНИЙ */}
        {appeals.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Обращений пока нет</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    appeal.priority === 'urgent' ? '#B3262E' :
                    appeal.priority === 'high' ? '#B3262E' :
                    appeal.priority === 'medium' ? '#C9A227' : '#667085'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                        {appeal.subject}
                      </h3>
                      <span className="tag" style={{
                        background: appeal.priority === 'urgent' ? '#FCEBEC' :
                                  appeal.priority === 'high' ? '#FCEBEC' :
                                  appeal.priority === 'medium' ? '#FBF4DC' : '#F4F6F9',
                        color: appeal.priority === 'urgent' ? '#B3262E' :
                               appeal.priority === 'high' ? '#B3262E' :
                               appeal.priority === 'medium' ? '#8A6A00' : '#667085'
                      }}>
                        {getPriorityLabel(appeal.priority)}
                      </span>
                      <span className="tag" style={{
                        background: appeal.status === 'resolved' ? '#E8F5EF' :
                                  appeal.status === 'in_progress' ? '#EAF2FA' :
                                  appeal.status === 'closed' ? '#F4F6F9' : '#FBF4DC',
                        color: appeal.status === 'resolved' ? '#16845B' :
                               appeal.status === 'in_progress' ? '#174A7E' :
                               appeal.status === 'closed' ? '#667085' : '#8A6A00'
                      }}>
                        {getStatusLabel(appeal.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#475467', marginTop: '8px' }}>
                      {appeal.message}
                    </div>
                    <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                      📅 {new Date(appeal.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}