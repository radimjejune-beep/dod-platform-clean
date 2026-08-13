// frontend/src/pages/ParentDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ParentDashboard() {
  const [profile, setProfile] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [childStats, setChildStats] = useState({
    events: 0,
    achievements: 0,
    level: 1,
    progress: 0
  });
  const [showConsentStatus, setShowConsentStatus] = useState(false);
  
  // ===== ДЛЯ ПРИВЯЗКИ РЕБЁНКА =====
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ child_email: '', child_password: '' });
  const [linking, setLinking] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      if (userData.role !== 'parent') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // ===== ЗАГРУЖАЕМ ДЕТЕЙ =====
      const childrenData = await api.getParentChildren();
      console.log('📥 Загружено детей:', childrenData?.length || 0);
      console.log('📥 Данные детей:', childrenData);
      
      setChildren(childrenData || []);
      
      if (childrenData && childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
        loadChildStats(childrenData[0].id);
      } else {
        setSelectedChild(null);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setMessage('❌ Ошибка загрузки данных: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadChildStats = async (childId) => {
    try {
      const stats = await api.getParticipantStats(childId);
      setChildStats({
        events: stats?.total_events || 0,
        achievements: stats?.achievements_count || 0,
        level: stats?.level || 1,
        progress: stats?.progress || 0
      });
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleChildSelect = (child) => {
    setSelectedChild(child);
    loadChildStats(child.id);
  };

  const getConsentStatus = (child) => {
    if (!child) return { total: 0, given: 0, percentage: 0 };
    const consents = ['consent_personal_data', 'consent_photo_publication', 'consent_event_participation'];
    const total = consents.length;
    const given = consents.filter(c => child[c]).length;
    return { total, given, percentage: Math.round((given / total) * 100) };
  };

  // ===== ПРИВЯЗКА РЕБЁНКА =====
  const handleLinkChild = async (e) => {
    e.preventDefault();
    setLinking(true);
    setMessage('');

    try {
      const result = await api.parentLinkChild({
        child_email: linkForm.child_email.trim(),
        child_password: linkForm.child_password
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(`✅ Ребёнок "${result.child.full_name}" успешно привязан!`);
      setMessageType('success');
      setLinkForm({ child_email: '', child_password: '' });
      setShowLinkModal(false);
      await loadData(); // Обновляем список детей
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLinking(false);
    }
  };

  // ===== ОБНОВЛЕНИЕ СПИСКА =====
  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage('');
    await loadData();
    setMessage('🔄 Список обновлён');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
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
          <span style={{ fontSize: '32px' }}>👨‍👩‍👦</span>
          <div>
            <h1>Родительский кабинет</h1>
            <p>
              {children.length > 0 
                ? `У вас привязано ${children.length} ребёнок(а)` 
                : 'У вас пока нет привязанных детей'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? '⏳ Обновление...' : '🔄 Обновить'}
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowLinkModal(true)}
            >
              ➕ Привязать ребёнка
            </button>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ВЫБОР РЕБЁНКА */}
        {children.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            {children.map((child) => {
              const status = getConsentStatus(child);
              const allConsents = status.percentage === 100;
              return (
                <button
                  key={child.id}
                  className={selectedChild?.id === child.id ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => handleChildSelect(child)}
                  style={{
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative'
                  }}
                >
                  {child.full_name}
                  {child.class_name && ` (${child.class_name})`}
                  {allConsents ? (
                    <span style={{ color: '#16845B', fontSize: '14px' }}>✅</span>
                  ) : (
                    <span style={{ color: '#C9A227', fontSize: '14px' }}>⚠️</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {children.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👨‍👩‍👦</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>У вас пока нет привязанных детей</p>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Нажмите кнопку <strong>"Привязать ребёнка"</strong> и введите логин и пароль ребёнка.
              <br />
              <span style={{ fontSize: '13px', color: '#98A2B3' }}>
                Для привязки нужны email и пароль, которые ребёнок использует для входа в систему.
              </span>
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowLinkModal(true)}
            >
              ➕ Привязать ребёнка
            </button>
          </div>
        ) : selectedChild && (
          <>
            {/* ПРОФИЛЬ РЕБЁНКА */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A' }}>
                    {selectedChild.full_name}
                  </h2>
                  <p style={{ color: '#667085' }}>
                    {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                    {selectedChild.club_name && ` • 🏫 ${selectedChild.club_name}`}
                  </p>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={selectedChild.status === 'active' ? 'status-active' : 'status-inactive'}>
                      {selectedChild.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => navigate(`/participant/${selectedChild.id}`)}
                >
                  👁️ Полный профиль
                </button>
              </div>
            </div>

            {/* СТАТИСТИКА РЕБЁНКА */}
            <div className="grid-4" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <div className="number">{childStats.events}</div>
                <div className="label">📅 Мероприятий</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#C9A227' }}>{childStats.achievements}</div>
                <div className="label">🏆 Достижений</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
                <div className="number">{childStats.level}</div>
                <div className="label">📊 Уровень</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ fontSize: '14px', color: '#667085' }}>
                  {getConsentStatus(selectedChild).percentage}%
                </div>
                <div className="label">📝 Согласия</div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: '#F4F6F9',
                  borderRadius: '2px',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getConsentStatus(selectedChild).percentage}%`,
                    height: '100%',
                    background: getConsentStatus(selectedChild).percentage === 100 ? '#16845B' : '#C9A227',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

            {/* ИНФОРМАЦИЯ О СОГЛАСИЯХ */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A' }}>
                  📝 Статус согласий
                </h3>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={() => setShowConsentStatus(!showConsentStatus)}
                >
                  {showConsentStatus ? 'Скрыть' : 'Подробнее'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedChild.consent_personal_data ? '#16845B' : '#B3262E' }}>
                    {selectedChild.consent_personal_data ? '✅' : '❌'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#667085' }}>Персональные данные</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedChild.consent_photo_publication ? '#16845B' : '#B3262E' }}>
                    {selectedChild.consent_photo_publication ? '✅' : '❌'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#667085' }}>Публикация фото</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedChild.consent_event_participation ? '#16845B' : '#B3262E' }}>
                    {selectedChild.consent_event_participation ? '✅' : '❌'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#667085' }}>Участие в мероприятиях</span>
                </div>
                {selectedChild.consent_agreement_date && (
                  <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                    📅 Подписаны: {new Date(selectedChild.consent_agreement_date).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>

              {showConsentStatus && (
                <div style={{ marginTop: '12px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px', fontSize: '13px', color: '#667085' }}>
                  <p style={{ margin: 0 }}>
                    <strong>Для участия в мероприятиях необходимы все три согласия.</strong>
                    {getConsentStatus(selectedChild).percentage < 100 && (
                      <span style={{ color: '#B3262E' }}>
                        {' '}Недостающие согласия можно оформить в профиле участника.
                      </span>
                    )}
                    {getConsentStatus(selectedChild).percentage === 100 && (
                      <span style={{ color: '#16845B' }}>
                        {' '}Все согласия оформлены. Ребёнок может участвовать в мероприятиях.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ============================================================
          МОДАЛЬНОЕ ОКНО: ПРИВЯЗКА РЕБЁНКА
          ============================================================ */}
      {showLinkModal && (
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
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '32px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              👨‍👩‍👦 Привязать ребёнка
            </h3>
            <p style={{ color: '#667085', marginBottom: '20px', fontSize: '14px' }}>
              Введите email и пароль ребёнка для привязки.
              <br />
              <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                Данные ребёнка должны соответствовать его учётной записи в системе.
              </span>
            </p>

            <form onSubmit={handleLinkChild}>
              <div className="form-group">
                <label>Email ребёнка *</label>
                <input
                  type="email"
                  value={linkForm.child_email}
                  onChange={(e) => setLinkForm({ ...linkForm, child_email: e.target.value })}
                  required
                  placeholder="child@example.com"
                />
              </div>

              <div className="form-group">
                <label>Пароль ребёнка *</label>
                <input
                  type="password"
                  value={linkForm.child_password}
                  onChange={(e) => setLinkForm({ ...linkForm, child_password: e.target.value })}
                  required
                  placeholder="Введите пароль ребёнка"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn-success"
                  disabled={linking}
                  style={{ flex: 1 }}
                >
                  {linking ? '⏳ Проверка...' : '✅ Привязать'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>

            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#FBF4DC',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#8A6A00'
            }}>
              💡 Если ребёнок забыл пароль — обратитесь к администратору для сброса.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}