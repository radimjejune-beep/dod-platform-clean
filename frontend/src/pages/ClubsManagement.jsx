// frontend/src/pages/ClubsManagement.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

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

      // На экране управления архивные клубы нужны: иначе их некуда вернуть
      const clubsData = await api.getClubs({ include_archived: 'true' });
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
        setMessage('Название клуба обязательно');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description || '',
        city: form.city || '',
        school: form.school || '',
        leader_name: form.leader_name || '',
        contact_email: form.contact_email || '',
        contact_phone: form.contact_phone || ''
      };

      const result = editingClub
        ? await api.updateClub(editingClub.id, payload)
        : await api.createClub(payload);

      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось сохранить КЮД'));
        setMessageType('error');
        setLoading(false);
        return;
      }

      setMessage(editingClub ? 'КЮД обновлён' : 'КЮД создан');
      setMessageType('success');
      resetForm();
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
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

  // Удаления у КЮДа нет и быть не может: на клуб ссылаются участники,
  // мероприятия, отчёты и достижения. Клуб уходит в архив — пропадает из
  // списков, но вся история остаётся на месте.
  const handleArchive = async (id, { force = false } = {}) => {
    if (!force && !confirm('Перенести этот КЮД в архив? Он исчезнет из списков, история сохранится.')) return;

    try {
      const result = await api.archiveClub(id, { force });

      if (result?.code === 'CLUB_NOT_EMPTY') {
        const ok = confirm(
          `${result.error}\n\nПеренести в архив вместе с ними?`
        );
        if (ok) return handleArchive(id, { force: true });
        return;
      }

      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось перенести КЮД в архив'));
        setMessageType('error');
        return;
      }

      setMessage('КЮД перенесён в архив');
      setMessageType('success');
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка архивации КЮДа:', err);
      setMessage('Не удалось перенести КЮД в архив');
      setMessageType('error');
    }
  };

  const handleRestore = async (id) => {
    try {
      const result = await api.restoreClub(id);
      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось вернуть КЮД из архива'));
        setMessageType('error');
        return;
      }
      setMessage('КЮД возвращён из архива');
      setMessageType('success');
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка возврата КЮДа:', err);
      setMessage('Не удалось вернуть КЮД из архива');
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { label: 'Активен', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
      'inactive': { label: 'Неактивен', color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
      'archived': { label: 'Архивирован', color: 'var(--color-gray-500)', bg: 'var(--color-gray-100)' }
    };
    return badges[status] || badges['active'];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span className="page-header-icon"><Icon name="club" size={26} /></span>
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
            {showForm ? 'Закрыть' : 'Создать КЮД'}
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
              {editingClub ? 'Редактировать КЮД' : 'Создать КЮД'}
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
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                    <option value="archived">Архивирован</option>
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
                  {loading ? 'Сохранение...' : editingClub ? 'Обновить' : 'Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Отмена
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
              <div className="icon"><Icon name="club" /></div>
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
                      borderLeftColor: club.status === 'active' ? 'var(--color-success)' : 
                                    club.status === 'archived' ? 'var(--color-gray-500)' : 'var(--color-error)',
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
                      {club.city && `${club.city}`}
                      {club.school && ` • ${club.school}`}
                      {club.leader_name && ` • ${club.leader_name}`}
                    </div>
                    {club.description && <div className="meta">{club.description}</div>}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleEdit(club)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => navigate(`/club/${club.id}`)}
                      >
                        Просмотр
                      </button>
                      {club.status !== 'archived' ? (
                        <button
                          className="btn-danger-soft btn-sm"
                          onClick={() => handleArchive(club.id)}
                        >
                          В архив
                        </button>
                      ) : (
                        <button
                          className="btn-outline btn-sm"
                          onClick={() => handleRestore(club.id)}
                        >
                          Вернуть из архива
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