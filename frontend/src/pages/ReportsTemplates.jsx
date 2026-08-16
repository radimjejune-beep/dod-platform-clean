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
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
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

  const handleOpenModal = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
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
                    style={{ 
                      borderLeftColor: '#C9A227',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleOpenModal(template)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(template);
                        }}
                      >
                        👁️ Открыть
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                      >
                        📝 Использовать
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
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

      {/* ===== МОДАЛЬНОЕ ОКНО ПРОСМОТРА ШАБЛОНА ===== */}
      {showModal && selectedTemplate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '700px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '28px',
                color: '#98A2B3',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '28px' }}>📋</span>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                  {selectedTemplate.name}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                  {categories.find(c => c.id === selectedTemplate.category)?.label || selectedTemplate.category}
                </span>
                {selectedTemplate.club_name && (
                  <span className="tag" style={{ background: '#EAF2FA', color: '#174A7E' }}>
                    🏫 {selectedTemplate.club_name}
                  </span>
                )}
              </div>

              {selectedTemplate.description && (
                <div style={{ fontSize: '14px', color: '#667085', marginTop: '8px' }}>
                  📝 {selectedTemplate.description}
                </div>
              )}

              <div style={{ fontSize: '13px', color: '#98A2B3', marginTop: '8px' }}>
                👤 {selectedTemplate.created_by_name || 'Неизвестно'}
                {' • '}
                📅 {new Date(selectedTemplate.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: '#F8FAFC',
              borderRadius: '12px',
              borderLeft: '4px solid #C9A227',
              marginBottom: '16px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <div style={{ 
                fontSize: '15px', 
                color: '#0B1F3A', 
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontFamily: 'monospace',
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #E2E7EF'
              }}>
                {selectedTemplate.template_data || 'Содержание шаблона отсутствует'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              borderTop: '1px solid #E2E7EF',
              paddingTop: '16px'
            }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowModal(false);
                  handleUseTemplate(selectedTemplate);
                }}
              >
                📝 Использовать
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  handleEdit(selectedTemplate);
                }}
              >
                ✏️ Редактировать
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowModal(false);
                  handleDelete(selectedTemplate.id);
                }}
              >
                🗑️ Удалить
              </button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}