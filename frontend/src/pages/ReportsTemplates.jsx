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
      console.log('📥 Загружено шаблонов:', templatesData?.length || 0);

    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки данных');
      setMessageType('error');
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

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Нет авторизации');
      }

      const data = {
        name: form.name.trim(),
        description: form.description || '',
        category: form.category || 'general',
        template_data: form.template_data,
        club_id: form.club_id || null
      };

      console.log('📤 Отправка шаблона:', data);

      let response;
      let result;

      if (editingTemplate) {
        // Обновление шаблона
        response = await fetch(`https://dod-backend.relaxdev.ru/api/report-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
        console.log('📥 Ответ сервера (PUT):', result);
      } else {
        // Создание шаблона
        response = await fetch('https://dod-backend.relaxdev.ru/api/report-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
        console.log('📥 Ответ сервера (POST):', result);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка сохранения шаблона');
      }

      setMessage(editingTemplate ? '✅ Шаблон обновлён!' : '✅ Шаблон создан!');
      setMessageType('success');
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
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
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/report-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка удаления');
      }

      setMessage('✅ Шаблон удалён');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleUseTemplate = (template) => {
    // Загружаем шаблон в форму
    setForm({
      name: template.name || '',
      description: template.description || '',
      category: template.category || 'general',
      template_data: template.template_data || '',
      club_id: template.club_id || ''
    });
    setEditingTemplate(null);
    setShowForm(true);
    setMessage('📝 Шаблон загружен в форму. Отредактируйте и сохраните.');
    setMessageType('success');
    setTimeout(() => setMessage(''), 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = [
    { id: 'general', label: '📄 Общий' },
    { id: 'monthly', label: '📅 Ежемесячный' },
    { id: 'event', label: '📅 Мероприятие' },
    { id: 'achievement', label: '🏆 Достижения' },
    { id: 'club', label: '🏫 Клубный' }
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
            <p>Создание и использование шаблонов для отчётов</p>
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
              <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                Создайте первый шаблон для быстрого заполнения отчётов
              </p>
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
                    {template.created_by_name && (
                      <div className="meta">👤 Создал: {template.created_by_name}</div>
                    )}
                    <div className="meta" style={{ fontSize: '12px', color: '#98A2B3' }}>
                      📅 {new Date(template.created_at).toLocaleDateString('ru-RU')}
                    </div>
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