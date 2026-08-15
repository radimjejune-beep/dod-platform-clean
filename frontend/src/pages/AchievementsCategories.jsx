// frontend/src/pages/AchievementsCategories.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

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
    icon: '🏆',
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
      setCategories(data || []);

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
      // TODO: добавить API для создания/обновления категории
      await new Promise(resolve => setTimeout(resolve, 500));

      setMessage(editingCategory ? '✅ Категория обновлена!' : '✅ Категория создана!');
      setMessageType('success');
      resetForm();
      loadData();
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
      icon: '🏆',
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
      icon: category.icon || '🏆',
      color: category.color || '#C9A227',
      points: category.points || 10,
      is_active: category.is_active !== undefined ? category.is_active : true
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить категорию?')) return;

    try {
      // TODO: добавить API для удаления
      await new Promise(resolve => setTimeout(resolve, 300));
      setCategories(categories.filter(c => c.id !== id));
      setMessage('✅ Категория удалена');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const commonIcons = ['🏆', '🎯', '🌟', '⭐', '🏅', '📚', '🌍', '🎨', '⚽', '❤️', '💪', '🎭', '🎵', '📝', '🔬'];

  const commonColors = ['#C9A227', '#174A7E', '#16845B', '#B3262E', '#6B46C1', '#E85D04', '#D62828', '#003049'];

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
          <span style={{ fontSize: '32px' }}>🏷️</span>
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
            {showForm ? '✖ Закрыть' : '➕ Создать категорию'}
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
              {editingCategory ? '✏️ Редактировать категорию' : '📝 Создать категорию'}
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
                      placeholder="🏆"
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {commonIcons.slice(0, 8).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          style={{
                            padding: '4px 8px',
                            border: form.icon === icon ? '2px solid #C9A227' : '1px solid #E2E7EF',
                            borderRadius: '6px',
                            background: form.icon === icon ? '#FBF4DC' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '18px'
                          }}
                          onClick={() => setForm({ ...form, icon })}
                        >
                          {icon}
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
                            border: form.color === color ? '3px solid #0B1F3A' : '2px solid #E2E7EF',
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
                    onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
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
                    <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      ✅ Активна
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingCategory ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 Все категории
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {categories.length} категорий
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏷️</div>
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
                    borderTop: `4px solid ${category.color || '#C9A227'}`,
                    opacity: category.is_active === false ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '32px' }}>{category.icon || '🏆'}</span>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                        {category.name}
                      </h4>
                      {category.description && (
                        <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0 0' }}>
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
                      background: '#F4F6F9',
                      color: '#667085'
                    }}>
                      ⭐ {category.points || 0} баллов
                    </span>
                    {category.is_active === false && (
                      <span className="tag" style={{ background: '#FCEBEC', color: '#B3262E', fontSize: '10px' }}>
                        Неактивна
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleEdit(category)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleDelete(category.id)}
                      >
                        🗑️
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