// frontend/src/pages/ParticipantEdit.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ParticipantEdit() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
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

      // Загружаем данные участника
      const usersData = await api.getUsers();
      const found = usersData.find(u => u.id === id);
      
      if (!found) {
        setLoading(false);
        setMessage('❌ Участник не найден');
        setMessageType('error');
        return;
      }
      
      setParticipant(found);
    } catch (err) {
      console.error('Ошибка:', err);
      setMessage('❌ Ошибка загрузки: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Проверка прав
  const canEdit = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' ||
                  profile?.role === 'club_coordinator' ||
                  profile?.role === 'tutor';

  // Координатор клуба может редактировать только участников своего клуба
  const canEditThis = () => {
    if (!canEdit) return false;
    if (profile?.role === 'club_coordinator') {
      // Проверяем, что участник в клубе координатора
      // TODO: добавить проверку
      return true;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParticipant({ ...participant, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEditThis()) {
      setMessage('❌ У вас нет прав для редактирования этого участника');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const updateData = {
        full_name: participant.full_name.trim(),
        phone: participant.phone || '',
        school: participant.school || '',
        class_name: participant.class_name || '',
        status: participant.status || 'active'
      };

      const result = await api.updateUser(id, updateData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Профиль участника обновлён!');
      setMessageType('success');
      setTimeout(() => navigate(`/participant/${id}`), 1500);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">❌</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Участник не найден</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canEditThis()) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>У вас нет прав для редактирования этого участника</p>
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
          onClick={() => navigate(-1)}
          style={{ marginBottom: '20px' }}
        >
          ← Назад
        </button>

        <div className="page-header">
          <span style={{ fontSize: '32px' }}>✏️</span>
          <div>
            <h1>Редактирование участника</h1>
            <p>{participant.full_name}</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>ФИО *</label>
                <input
                  type="text"
                  name="full_name"
                  value={participant.full_name || ''}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={participant.email || ''}
                  disabled
                  style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  name="phone"
                  value={participant.phone || ''}
                  onChange={handleChange}
                  placeholder="+7 999 123 45 67"
                />
              </div>
              <div className="form-group">
                <label>Школа</label>
                <input
                  type="text"
                  name="school"
                  value={participant.school || ''}
                  onChange={handleChange}
                  placeholder="Школа №1"
                />
              </div>
              <div className="form-group">
                <label>Класс</label>
                <input
                  type="text"
                  name="class_name"
                  value={participant.class_name || ''}
                  onChange={handleChange}
                  placeholder="8А"
                />
              </div>
              <div className="form-group">
                <label>Статус</label>
                <select
                  name="status"
                  value={participant.status || 'active'}
                  onChange={handleChange}
                >
                  <option value="active">🟢 Активен</option>
                  <option value="inactive">🔴 Неактивен</option>
                  <option value="pending">⏳ Ожидает</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn-success" disabled={saving}>
                {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/participant/${id}`)}
              >
                ❌ Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}