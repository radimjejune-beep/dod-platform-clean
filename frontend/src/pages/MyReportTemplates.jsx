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

      // Координатор КЮДа или тьютор
      if (!['club_coordinator', 'tutor'].includes(userData.role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const data = await api.getReportTemplates();
      console.log('📥 Загружено шаблонов:', data?.length || 0);
      setTemplates(data || []);

    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка загрузки шаблонов');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template) => {
    // Переход на страницу создания отчёта с шаблоном
    navigate(`/reports?template=${template.id}`);
    setMessage(`📝 Шаблон "${template.name}" загружен в форму отчёта`);
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
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
            <p>Используйте готовые шаблоны для быстрого создания отчётов</p>
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
                ? 'Вы можете создать свой шаблон в разделе "Шаблоны отчётов" у координатора движения'
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
                onClick={() => handleUseTemplate(template)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                      {template.name}
                    </h3>
                    <span className="tag" style={{ marginTop: '4px', background: '#F4F6F9', color: '#667085', fontSize: '11px' }}>
                      {getCategoryLabel(template.category)}
                    </span>
                    {template.club_name && (
                      <span className="tag" style={{ marginLeft: '4px', background: '#EAF2FA', color: '#174A7E', fontSize: '11px' }}>
                        🏫 {template.club_name}
                      </span>
                    )}
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
    </div>
  );
}