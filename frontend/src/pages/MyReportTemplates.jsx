// frontend/src/pages/MyReportTemplates.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function MyReportTemplates() {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showModal, setShowModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState({
    club_id: '',
    report_month: ''
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

      if (!['club_coordinator', 'tutor', 'movement_coordinator', 'admin'].includes(userData.role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [templatesData, clubsData] = await Promise.all([
        api.getReportTemplates(),
        api.getClubs()
      ]);

      console.log('📥 Загружено шаблонов:', templatesData?.length || 0);
      setTemplates(templatesData || []);
      setClubs(clubsData || []);

      if (userData.role === 'club_coordinator' && userData.club_id) {
        setForm(prev => ({ ...prev, club_id: userData.club_id }));
      }

    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка загрузки шаблонов');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTemplate = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setForm({
      club_id: profile?.club_id || '',
      report_month: ''
    });
    setShowUseModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Нет авторизации');
      }

      let finalClubId = form.club_id;
      if (!finalClubId && profile?.role === 'club_coordinator' && profile?.club_id) {
        finalClubId = profile.club_id;
      }

      if (!finalClubId) {
        setMessage('❌ Выберите клуб для отчёта');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (!form.report_month) {
        setMessage('❌ Выберите месяц отчёта');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // Проверяем формат месяца
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(form.report_month)) {
        setMessage('❌ Неверный формат месяца. Используйте YYYY-MM (например: 2026-08)');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const data = {
        club_id: finalClubId,
        report_month: form.report_month,
        report_data: {}
      };

      console.log('📤 Отправка отчёта из шаблона:', data);

      const response = await fetch(`https://dod-backend.relaxdev.ru/api/reports/from-template/${selectedTemplate.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      console.log('📥 Ответ сервера:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка создания отчёта');
      }

      setMessage('✅ Отчёт создан из шаблона!');
      setMessageType('success');
      setShowUseModal(false);
      setSelectedTemplate(null);
      setForm({
        club_id: profile?.club_id || '',
        report_month: ''
      });
      
      setTimeout(() => setMessage(''), 3000);
      navigate('/reports');
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'general': '📄 Общий',
      'monthly': '📅 Ежемесячный',
      'event': '📅 Мероприятие',
      'achievement': '🏆 Достижения',
      'club': '🏫 Клубный'
    };
    return labels[category] || category;
  };

  const getRoleSpecificMessage = () => {
    const role = profile?.role;
    if (role === 'club_coordinator') {
      return 'Используйте готовые шаблоны для отчётов вашего клуба';
    }
    if (role === 'tutor') {
      return 'Используйте готовые шаблоны для отчётов';
    }
    return 'Используйте готовые шаблоны для быстрого создания отчётов';
  };

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
            <p>{getRoleSpecificMessage()}</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>Шаблонов пока нет</p>
            <p style={{ fontSize: '13px', color: '#98A2B3' }}>
              {profile?.role === 'club_coordinator' 
                ? 'Координатор движения создаст шаблоны, которые появятся здесь'
                : 'Обратитесь к координатору движения для создания шаблонов'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {templates.map((template) => (
              <div
                key={template.id}
                className="card"
                style={{
                  borderTop: `4px solid ${template.club_id ? '#174A7E' : '#C9A227'}`,
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => handleOpenTemplate(template)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                      {template.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span className="tag" style={{ background: '#F4F6F9', color: '#667085', fontSize: '11px' }}>
                        {getCategoryLabel(template.category)}
                      </span>
                      {template.club_name && (
                        <span className="tag" style={{ background: '#EAF2FA', color: '#174A7E', fontSize: '11px' }}>
                          🏫 {template.club_name}
                        </span>
                      )}
                    </div>
                    {template.created_by_name && (
                      <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                        👤 {template.created_by_name}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                  >
                    📝 Использовать
                  </button>
                </div>

                {template.description && (
                  <p style={{ color: '#667085', fontSize: '13px', marginTop: '8px', lineHeight: '1.4' }}>
                    {template.description}
                  </p>
                )}

                <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '8px' }}>
                  📅 {new Date(template.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА ШАБЛОНА ===== */}
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
          onClick={() => {
            setShowModal(false);
            setSelectedTemplate(null);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
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
              onClick={() => {
                setShowModal(false);
                setSelectedTemplate(null);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              📋 {selectedTemplate.name}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                {getCategoryLabel(selectedTemplate.category)}
              </span>
              {selectedTemplate.club_name && (
                <span className="tag" style={{ background: '#EAF2FA', color: '#174A7E' }}>
                  🏫 {selectedTemplate.club_name}
                </span>
              )}
            </div>

            {selectedTemplate.description && (
              <p style={{ color: '#667085', marginBottom: '12px' }}>
                {selectedTemplate.description}
              </p>
            )}

            <div style={{
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E7EF',
              maxHeight: '200px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {selectedTemplate.template_data || 'Нет данных'}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
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
                  setSelectedTemplate(null);
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛЬНОЕ ОКНО ДЛЯ СОЗДАНИЯ ОТЧЁТА ИЗ ШАБЛОНА ===== */}
      {showUseModal && selectedTemplate && (
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
          onClick={() => {
            setShowUseModal(false);
            setSelectedTemplate(null);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowUseModal(false);
                setSelectedTemplate(null);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              📝 Создать отчёт из шаблона
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Шаблон: <strong>{selectedTemplate.name}</strong>
            </p>

            <form onSubmit={handleSubmitReport}>
              <div className="form-group">
                <label>Клуб *</label>
                <select
                  value={form.club_id}
                  onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  required
                >
                  <option value="">Выберите клуб</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                {profile?.role === 'club_coordinator' && profile?.club_id && (
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    💡 Ваш клуб: {clubs.find(c => c.id === profile.club_id)?.name || 'не найден'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Отчётный месяц *</label>
                <input
                  type="month"
                  value={form.report_month}
                  onChange={(e) => setForm({ ...form, report_month: e.target.value })}
                  required
                />
                <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                  📅 Формат: YYYY-MM (например: 2026-08)
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#667085',
                border: '1px solid #E2E7EF',
                marginBottom: '16px',
                maxHeight: '100px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                <strong>📋 Предпросмотр шаблона:</strong>
                <div style={{ marginTop: '4px', fontSize: '13px', lineHeight: '1.5' }}>
                  {selectedTemplate.template_data?.substring(0, 150) || 'Нет данных'}
                  {selectedTemplate.template_data?.length > 150 && '...'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading} style={{ flex: 1 }}>
                  {loading ? '⏳ Создание...' : '✅ Создать отчёт'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowUseModal(false);
                    setSelectedTemplate(null);
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
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