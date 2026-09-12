// frontend/src/pages/ParticipantEdit.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

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

      // Раньше грузили весь список пользователей и искали в нём нужного.
      // Список закрыт для руководителя КЮДа и тьютора, и они видели
      // «Участник не найден» вместо карточки своего же участника.
      const found = await api.getUser(id);

      if (!found || found.error) {
        setLoading(false);
        setMessage(found?.error ? api.describeApiError(found, 'Участник не найден') : 'Участник не найден');
        setMessageType('error');
        return;
      }

      setParticipant(found);
    } catch (err) {
      console.error('Ошибка:', err);
      setMessage('Ошибка загрузки: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' ||
                  profile?.role === 'club_coordinator' ||
                  profile?.role === 'tutor';

  const canEditThis = () => {
    if (!canEdit) return false;
    if (profile?.role === 'club_coordinator') {
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
      setMessage('У вас нет прав для редактирования этого участника');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      // Набор полей повторяет заявку на выездной форум: заполненные здесь
      // один раз, дальше они подставляются в каждую заявку сами
      const updateData = {
        full_name: participant.full_name.trim(),
        phone: participant.phone || '',
        school: participant.school || '',
        class_name: participant.class_name || '',
        birth_date: participant.birth_date ? String(participant.birth_date).slice(0, 10) : '',
        city: participant.city || '',
        parent_full_name: participant.parent_full_name || '',
        parent_phone: participant.parent_phone || '',
        status: participant.status || 'active'
      };

      const result = await api.updateUser(id, updateData);
      
      if (result.error) {
        throw new Error(api.describeApiError(result));
      }

      setMessage('Профиль участника обновлён!');
      setMessageType('success');
      setTimeout(() => navigate(`/participant/${id}`), 1500);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
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
            <div className="icon"><Icon name="error" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Участник не найден</p>
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
            <div className="icon"><Icon name="lock" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Доступ запрещён</p>
            <p style={{ color: 'var(--color-gray-500)' }}>У вас нет прав для редактирования этого участника</p>
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
          <div>
            <h1 className="page-title">Карточка участника</h1>
            <p className="page-subtitle">Редактирование данных участника движения</p>
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '20px' }}
        >
          ← Назад
        </button>

        {/* УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

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
                  style={{ background: 'var(--color-gray-100)', cursor: 'not-allowed' }}
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
                <label>Дата рождения</label>
                <input
                  type="date"
                  name="birth_date"
                  value={participant.birth_date ? String(participant.birth_date).slice(0, 10) : ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Город</label>
                <input
                  type="text"
                  name="city"
                  value={participant.city || ''}
                  onChange={handleChange}
                  placeholder="Нальчик"
                />
              </div>
              <div className="form-group">
                <label>Статус</label>
                <select
                  name="status"
                  value={participant.status || 'active'}
                  onChange={handleChange}
                >
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                  <option value="pending">Ожидает</option>
                </select>
              </div>
            </div>

            {/* Эти поля нужны для заявки на выездной форум. Заполненные
                здесь один раз, дальше они подставляются в каждую заявку
                сами — раньше их вводили заново на каждый форум. */}
            <h3 style={{ marginTop: '24px', marginBottom: '4px' }}>Законный представитель</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '13px', marginBottom: '12px' }}>
              Нужен для заявок на выездные форумы. Это не заменяет согласия —
              их оформляет сам родитель в своём кабинете.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label>ФИО родителя</label>
                <input
                  type="text"
                  name="parent_full_name"
                  value={participant.parent_full_name || ''}
                  onChange={handleChange}
                  placeholder="Иванова Мария Петровна"
                />
              </div>
              <div className="form-group">
                <label>Телефон родителя</label>
                <input
                  type="tel"
                  name="parent_phone"
                  value={participant.parent_phone || ''}
                  onChange={handleChange}
                  placeholder="+7 999 123 45 67"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn-success" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/participant/${id}`)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}