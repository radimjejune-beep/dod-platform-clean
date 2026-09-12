// frontend/src/pages/ParentDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { countOf } from '../lib/format';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

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
  // Ребёнок привязывается кодом приглашения. Пароль ребёнка больше не
  // участвует: раньше он требовался здесь, и это приучало семью жить
  // под одной учётной записью — тогда запись «согласие дал законный
  // представитель» переставала что-либо значить.
  const [linkCode, setLinkCode] = useState('');
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
      setMessage('Ошибка загрузки данных: ' + err.message);
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
      const result = await api.claimParentInvitation(linkCode.trim());

      if (result.error) {
        throw new Error(api.describeApiError(result, 'Не удалось привязать участника'));
      }

      setMessage(`Участник «${result.child_name}» привязан`);
      setMessageType('success');
      setLinkCode('');
      setShowLinkModal(false);
      await loadData(); // Обновляем список детей
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
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
    setMessage('Список обновлён');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
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
          <span className="page-header-icon"><Icon name="family" size={26} /></span>
          <div>
            <h1>Родительский кабинет</h1>
            <p>
              {children.length > 0
                ? `У вас ${countOf(children.length, 'ребёнок', 'ребёнка', 'детей')} на платформе`
                : 'У вас пока нет привязанных детей'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Обновление...' : 'Обновить'}
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowLinkModal(true)}
            >
              Привязать ребёнка
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
                    <span style={{ color: 'var(--color-success)', fontSize: '14px' }}><Icon name="success" size={14} /></span>
                  ) : (
                    <span style={{ color: 'var(--color-gold)', fontSize: '14px' }}><Icon name="warning" size={14} /></span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {children.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><Icon name="family" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>У вас пока нет привязанных детей</p>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: '16px' }}>
              Нажмите кнопку <strong>"Привязать ребёнка"</strong> и введите логин и пароль ребёнка.
              <br />
              <span style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>
                Для привязки нужны email и пароль, которые ребёнок использует для входа в систему.
              </span>
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowLinkModal(true)}
            >
              Привязать ребёнка
            </button>
          </div>
        ) : selectedChild && (
          <>
            {/* ПРОФИЛЬ РЕБЁНКА */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                    {selectedChild.full_name}
                  </h2>
                  <p style={{ color: 'var(--color-gray-500)' }}>
                    {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                    {selectedChild.club_name && ` • ${selectedChild.club_name}`}
                  </p>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={selectedChild.status === 'active' ? 'status-active' : 'status-inactive'}>
                      {selectedChild.status === 'active' ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => navigate(`/participant/${selectedChild.id}`)}
                >
                  Полный профиль
                </button>
              </div>
            </div>

            {/* СТАТИСТИКА РЕБЁНКА */}
            <div className="grid-4" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <div className="number">{childStats.events}</div>
                <div className="label">Мероприятий</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: 'var(--color-gold)' }}>{childStats.achievements}</div>
                <div className="label">Достижений</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid var(--color-gold)' }}>
                <div className="number">{childStats.level}</div>
                <div className="label">Уровень</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
                  {getConsentStatus(selectedChild).percentage}%
                </div>
                <div className="label">Согласия</div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'var(--color-gray-100)',
                  borderRadius: '2px',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getConsentStatus(selectedChild).percentage}%`,
                    height: '100%',
                    background: getConsentStatus(selectedChild).percentage === 100 ? 'var(--color-success)' : 'var(--color-gold)',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

            {/* ИНФОРМАЦИЯ О СОГЛАСИЯХ */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-primary)' }}>
                  Статус согласий
                </h3>
                <div className="btn-group">
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => setShowConsentStatus(!showConsentStatus)}
                  >
                    {showConsentStatus ? 'Скрыть' : 'Подробнее'}
                  </button>
                  {/* Оформить согласие можно только здесь — за ребёнка это
                      вправе сделать лишь законный представитель */}
                  <button className="btn-primary btn-sm" onClick={() => navigate('/parent-consents')}>
                    <Icon name="consent" size={14} />
                    Оформить согласия
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedChild.consent_personal_data ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {selectedChild.consent_personal_data ? <Icon name="success" /> : <Icon name="error" />}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Персональные данные</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedChild.consent_photo_publication ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {selectedChild.consent_photo_publication ? <Icon name="success" /> : <Icon name="error" />}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Публикация фото</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedChild.consent_event_participation ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {selectedChild.consent_event_participation ? <Icon name="success" /> : <Icon name="error" />}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Участие в мероприятиях</span>
                </div>
                {selectedChild.consent_agreement_date && (
                  <span style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
                    Подписаны: {new Date(selectedChild.consent_agreement_date).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>

              {showConsentStatus && (
                <div style={{ marginTop: '12px', padding: '12px 16px', background: 'var(--color-gray-50)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-gray-500)' }}>
                  <p style={{ margin: 0 }}>
                    <strong>Для участия в мероприятиях необходимы все три согласия.</strong>
                    {getConsentStatus(selectedChild).percentage < 100 && (
                      <span style={{ color: 'var(--color-error)' }}>
                        {' '}Недостающие согласия можно оформить в профиле участника.
                      </span>
                    )}
                    {getConsentStatus(selectedChild).percentage === 100 && (
                      <span style={{ color: 'var(--color-success)' }}>
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
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>
              Привязать участника
            </h3>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: '20px', fontSize: '14px', lineHeight: 1.6 }}>
              Введите код приглашения. Его присылает руководитель КЮДа — или его
              можно взять у ребёнка: код показан в его профиле.
            </p>

            <form onSubmit={handleLinkChild}>
              <div className="form-group">
                <label className="form-label">Код приглашения<span className="required">*</span></label>
                <input
                  className="form-control"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value)}
                  required
                  placeholder="Например, ABCD-2345"
                  autoFocus
                />
                <span className="form-hint">
                  Пароль ребёнка вводить не нужно — он здесь не используется.
                </span>
              </div>

              <div className="btn-group" style={{ marginTop: '8px' }}>
                <button type="submit" className="btn-primary" disabled={linking} style={{ flex: 1 }}>
                  {linking ? 'Проверяем...' : 'Привязать'}
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowLinkModal(false)}>
                  Отмена
                </button>
              </div>
            </form>

            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'var(--color-gold-pale)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--color-gold-dark)'
            }}>
              Если ребёнок забыл пароль — обратитесь к администратору для сброса.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}