// frontend/src/pages/AchievementsCategories.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { confirmAction } from '../lib/confirm';
import Navigation from '../components/Navigation';
import Icon, { DataIcon } from '../components/Icon';

export default function AchievementsCategories() {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'trophy',
    color: '#C9A227',
    points: 10,
    is_active: true
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

      const data = await api.getAchievementCategories();
      setCategories(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || '',
        icon: form.icon || '',
        color: form.color || '#C9A227',
        points: Number(form.points) || 0,
        is_active: form.is_active !== false
      };

      const result = editingCategory
        ? await api.updateAchievementCategory(editingCategory.id, payload)
        : await api.createAchievementCategory(payload);

      if (result?.error) throw new Error(api.describeApiError(result));

      setMessage(editingCategory ? 'Категория обновлена!' : 'Категория создана!');
      setMessageType('success');
      resetForm();
      loadData();
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
      icon: 'trophy',
      color: '#C9A227',
      points: 10,
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || 'trophy',
      color: category.color || 'var(--color-gold)',
      points: category.points || 10,
      is_active: category.is_active !== undefined ? category.is_active : true
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!await confirmAction({ title: 'Удалить категорию?', tone: 'danger' })) return;

    try {
      const result = await api.deleteAchievementCategory(id);
      if (result?.error) throw new Error(api.describeApiError(result));

      if (result.archived) {
        // Категорию уже присвоили достижениям — сервер её скрыл, а не удалил
        setMessage(result.message);
        setMessageType('success');
        loadData();
        setTimeout(() => setMessage(''), 6000);
        return;
      }

      setCategories(categories.filter(c => c.id !== id));
      setMessage('Категория удалена');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  // Иконка категории хранится в базе строкой. Раньше туда писали эмодзи,
  // теперь — имя иконки из components/Icon.jsx. Старые записи с эмодзи
  // продолжают показываться как есть (см. DataIcon).
  const commonIcons = ['trophy', 'target', 'star', 'book', 'flag', 'handshake',
                       'megaphone', 'crown', 'club', 'chart', 'consent', 'shield'];

  // Цвет категории хранится в базе и проверяется сервером по формату
  // #RRGGBB — здесь это данные, а не оформление, поэтому переменные CSS
  // использовать нельзя. Значения взяты из дипломатической палитры.
  const commonColors = ['#C9A227', '#174A7E', '#16845B', '#B3262E', '#6B46C1', '#E85D04', '#D62828', '#003049'];

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
          <span className="page-header-icon"><Icon name="trophy" size={28} /></span>
          <div>
            <h1>Категории достижений</h1>
            <p>Управление категориями и баллами достижений</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Закрыть' : 'Создать категорию'}
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
              {editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
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
                    placeholder="Участие"
                  />
                </div>
                <div className="form-group">
                  <label>Иконка</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      style={{ flex: 1, minWidth: '60px' }}
                      placeholder="trophy"
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {commonIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          style={{
                            padding: '4px 8px',
                            border: form.icon === icon ? '2px solid var(--color-gold)' : '1px solid var(--color-gray-200)',
                            borderRadius: '6px',
                            background: form.icon === icon ? 'var(--color-gold-pale)' : 'transparent',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: form.icon === icon ? 'var(--color-gold-dark)' : 'var(--color-gray-500)'
                          }}
                          title={icon}
                          onClick={() => setForm({ ...form, icon })}
                        >
                          <Icon name={icon} size={18} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Цвет</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      style={{ width: '50px', height: '40px', padding: '2px', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {commonColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: form.color === color ? '3px solid var(--color-primary)' : '2px solid var(--color-gray-200)',
                            background: color,
                            cursor: 'pointer'
                          }}
                          onClick={() => setForm({ ...form, color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Баллы</label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: parseInt(e.target.value, 10) || 0 })}
                    min="0"
                    step="5"
                    placeholder="10"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Описание</label>
                  <textarea
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Описание категории достижений..."
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '500', color: 'var(--color-primary)' }}>
                      Активна
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? 'Сохранение...' : editingCategory ? 'Обновить' : 'Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
              Все категории
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
              {categories.length} категорий
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><Icon name="flag" /></div>
              <p>Категорий пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="card"
                  style={{
                    padding: '16px',
                    borderTop: `4px solid ${category.color || 'var(--color-gold)'}`,
                    opacity: category.is_active === false ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', color: category.color || 'var(--color-gold-dark)' }}>
                      <DataIcon value={category.icon} fallback="trophy" size={28} />
                    </span>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-primary)', margin: 0 }}>
                        {category.name}
                      </h4>
                      {category.description && (
                        <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: '2px 0 0 0' }}>
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{
                      padding: '2px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: 'var(--color-gray-100)',
                      color: 'var(--color-gray-500)'
                    }}>
                      {category.points || 0} баллов
                    </span>
                    {category.is_active === false && (
                      <span className="tag" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: '10px' }}>
                        Неактивна
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleEdit(category)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleDelete(category.id)}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
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