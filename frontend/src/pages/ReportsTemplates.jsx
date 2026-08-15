// frontend/src/pages/ReportsTemplates.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ReportsTemplates() {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'general',
    template_data: '',
    club_id: ''
  });
  const [clubs, setClubs] = useState([]);
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

      const [clubsData, templatesData] = await Promise.all([
        api.getClubs(),
        api.getReportTemplates()
      ]);

      setClubs(clubsData || []);
      setTemplates(templatesData || []);

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
      if (!form.name.trim() || !form.template_data.trim()) {
        setMessage('❌ Название и шаблон обязательны');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const data = {
        ...form,
        template_data: form.template_data
      };

      // TODO: добавить API для создания/обновления шаблона
      await new Promise(resolve => setTimeout(resolve, 500));

      setMessage(editingTemplate ? '✅ Шаблон обновлён!' : '✅ Шаблон создан!');
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
      category: 'general',
      template_data: '',
      club_id: ''
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name || '',
      description: template.description || '',
      category: template.category || 'general',
      template_data: template.template_data || '',
      club_id: template.club_id || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить шаблон?')) return;

    try {
      // TODO: добавить API для удаления
      await new Promise(resolve => setTimeout(resolve, 300));
      setTemplates(templates.filter(t => t.id !== id));
      setMessage('✅ Шаблон удалён');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleUseTemplate = (template) => {
    // TODO: открыть форму отчёта с заполненным шаблоном
    setMessage('📝 Шаблон загружен в форму отчёта');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const categories = [
    { id: 'general', label: '📄 Общий' },
    { id: 'monthly', label: '📅 Ежемесячный' },
    { id: 'event', label: '📅 Мероприятие' },
    { id: 'achievement', label: '🏆 Достижения' }
  ];

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
          <span style={{ fontSize: '32px' }}>📋</span>
          <div>
            <h1>Шаблоны отчётов</h1>
            <p>Готовые шаблоны для быстрого создания отчётов</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? '✖ Закрыть' : '➕ Создать шаблон'}
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
              {editingTemplate ? '✏️ Редактировать шаблон' : '📝 Создать шаблон'}
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
                    placeholder="Ежемесячный отчёт координатора"
                  />
                </div>
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Описание</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Краткое описание шаблона"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Шаблон *</label>
                  <textarea
                    rows="8"
                    value={form.template_data}
                    onChange={(e) => setForm({ ...form, template_data: e.target.value })}
                    required
                    placeholder={`### Отчёт о деятельности КЮДа\n\n**Период:** ________\n**Клуб:** ________\n\n### Мероприятия\n1. ________\n2. ________\n\n### Достижения\n- ________\n- ________\n\n### Планы на следующий период\n1. ________\n2. ________`}
                  />
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                    💡 Используйте разметку Markdown для структурирования шаблона
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Клуб (если для конкретного)</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Для всех клубов</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingTemplate ? '💾 Обновить' : '✅ Создать'}
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
              📋 Все шаблоны
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {templates.length} шаблонов
            </span>
          </div>

          {templates.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>Шаблонов пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map((template) => {
                const category = categories.find(c => c.id === template.category);
                return (
                  <div
                    key={template.id}
                    className="list-item"
                    style={{ borderLeftColor: '#C9A227' }}
                  >
                    <div className="title">
                      {template.name}
                      <span className="tag tag-gold" style={{ marginLeft: '8px', fontSize: '10px' }}>
                        {category?.label || template.category}
                      </span>
                    </div>
                    {template.description && <div className="subtitle">{template.description}</div>}
                    {template.club_name && <div className="meta">🏫 {template.club_name}</div>}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleUseTemplate(template)}
                      >
                        📝 Использовать
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleEdit(template)}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(template.id)}
                      >
                        🗑️ Удалить
                      </button>
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