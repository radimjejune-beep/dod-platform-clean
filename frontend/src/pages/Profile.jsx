// frontend/src/pages/Profile.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import AvatarUpload from '../components/AvatarUpload';
import PresidentSection from '../components/PresidentSection';
import Footer from '../components/Footer';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('main');
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getMe();
      if (data && data.id) {
        setProfile(data);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdated = (newAvatarUrl) => {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
    setMessage('✅ Аватар обновлён!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('success');

    try {
      let phone = profile.phone || '';
      phone = phone.replace(/[^0-9+]/g, '');

      // ✅ Безопасная обработка дат
      const formatDate = (val) => {
        if (!val || val === '' || val === 'Invalid Date') return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
      };

      const updateData = {
        full_name: profile.full_name.trim(),
        phone: phone,
        school: profile.school || '',
        class_name: profile.class_name || '',
        interests: profile.interests || '',
        bio: profile.bio || '',
        city: profile.city || '',
        birth_date: formatDate(profile.birth_date),
        social_links: profile.social_links || '',
        skills: profile.skills || '',
        education: profile.education || '',
        achievements: profile.achievements || '',
        telegram: profile.telegram || '',
        vk: profile.vk || '',
        parent_full_name: profile.parent_full_name || '',
        parent_phone: profile.parent_phone || '',
        parent_email: profile.parent_email || '',
        consent_personal_data: profile.consent_personal_data || false,
        consent_photo_publication: profile.consent_photo_publication || false,
        consent_event_participation: profile.consent_event_participation || false,
        consent_agreement_date: formatDate(profile.consent_agreement_date),
        charter_acceptance_date: formatDate(profile.charter_acceptance_date)
      };

      console.log('📤 Отправка данных:', updateData);

      const result = await api.updateProfile(updateData);

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Профиль успешно обновлён!');
      setProfile(result);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile({ 
      ...profile, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const getConsentStatus = () => {
    const consents = [
      { key: 'consent_personal_data', label: 'Персональные данные' },
      { key: 'consent_photo_publication', label: 'Публикация фото' },
      { key: 'consent_event_participation', label: 'Участие в мероприятиях' }
    ];
    const total = consents.length;
    const given = consents.filter(c => profile?.[c.key]).length;
    return { total, given, percentage: Math.round((given / total) * 100) };
  };

  const consentStatus = getConsentStatus();

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
  };

  const getRoleLabel = (role) => {
    const labels = {
      'admin': '🔧 Администратор',
      'movement_coordinator': '⭐ Координатор движения',
      'club_coordinator': '🏫 Координатор КЮДа',
      'tutor': '📚 Тьютор',
      'participant': '👤 Участник',
      'parent': '👨‍👩‍👦 Родитель',
      'president': '👑 Президент',
      'vice_president': '⭐ Вице-президент'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <style>{`
          .page-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #F0EDE8;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E4DFD8;
            border-top-color: #C9A227;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const tabs = [
    { id: 'main', label: '📋 Основное' },
    { id: 'contacts', label: '📞 Контакты' },
    { id: 'interests', label: '🎯 Интересы' },
    { id: 'parents', label: '👨‍👩‍👦 Родители' },
    { id: 'consents', label: '📝 Согласия' },
    { id: 'extra', label: '🌟 Дополнительно' },
  ];

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ============================================================
           ЗАГОЛОВОК
           ============================================================ */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>👤 Профиль</h1>
            <p>Управление вашими данными и настройками</p>
          </div>
          <button
            type="submit"
            className="btn-save-header"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Сохранение...' : '💾 Сохранить'}
          </button>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ============================================================
           КАРТОЧКА ПРОФИЛЯ
           ============================================================ */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-avatar-section">
              <AvatarUpload
                currentAvatar={profile?.avatar_url}
                onAvatarUpdated={handleAvatarUpdated}
                userId={profile?.id}
              />
            </div>
            <div className="profile-info-section">
              <h2>{profile?.full_name}</h2>
              <div className="profile-badges">
                <span className="badge-role">{getRoleLabel(profile?.role)}</span>
                <span className={`badge-status ${profile?.status === 'active' ? 'active' : 'inactive'}`}>
                  {profile?.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                </span>
                {profile?.club_name && (
                  <span className="badge-club">🏫 {profile.club_name}</span>
                )}
              </div>
              <div className="profile-contact-info">
                {profile?.email && (
                  <span className="contact-item">📧 {profile.email}</span>
                )}
                {profile?.phone && (
                  <span className="contact-item">📞 {profile.phone}</span>
                )}
                {profile?.city && (
                  <span className="contact-item">📍 {profile.city}</span>
                )}
              </div>
            </div>
          </div>

          {/* Статус согласий */}
          <div className="profile-consent-status">
            <div className="consent-status-label">
              <span>📝 Согласия</span>
              <span className="consent-count">{consentStatus.given} из {consentStatus.total}</span>
            </div>
            <div className="consent-progress-bar">
              <div 
                className="consent-progress-fill" 
                style={{ 
                  width: `${consentStatus.percentage}%`,
                  background: consentStatus.percentage === 100 
                    ? 'linear-gradient(90deg, #16845B, #1A7A4C)' 
                    : 'linear-gradient(90deg, #C9A227, #E8D9A8)'
                }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================
           ВКЛАДКИ
           ============================================================ */}
        <div className="tabs-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================
           ФОРМА
           ============================================================ */}
        <div className="form-container">
          <form onSubmit={handleSave}>
            {/* ===== ВКЛАДКА: ОСНОВНОЕ ===== */}
            {activeTab === 'main' && (
              <div className="tab-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>ФИО *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={profile?.full_name || ''}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="form-input disabled"
                    />
                  </div>
                  <div className="form-group">
                    <label>Дата рождения</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={profile?.birth_date || ''}
                      onChange={handleChange}
                      className="form-input"
                    />
                    <div className="form-hint">📅 Используется для определения возраста</div>
                  </div>
                  <div className="form-group">
                    <label>Город</label>
                    <input
                      type="text"
                      name="city"
                      value={profile?.city || ''}
                      onChange={handleChange}
                      placeholder="Москва"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Школа</label>
                    <input
                      type="text"
                      name="school"
                      value={profile?.school || ''}
                      onChange={handleChange}
                      placeholder="Школа №1"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Класс</label>
                    <input
                      type="text"
                      name="class_name"
                      value={profile?.class_name || ''}
                      onChange={handleChange}
                      placeholder="8А"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== ВКЛАДКА: КОНТАКТЫ ===== */}
            {activeTab === 'contacts' && (
              <div className="tab-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile?.phone || ''}
                      onChange={handleChange}
                      placeholder="+7 999 123 45 67"
                      className="form-input"
                    />
                    <div className="form-hint">📞 Номер для экстренной связи</div>
                  </div>
                  <div className="form-group">
                    <label>Telegram</label>
                    <input
                      type="text"
                      name="telegram"
                      value={profile?.telegram || ''}
                      onChange={handleChange}
                      placeholder="@username"
                      className="form-input"
                    />
                    <div className="form-hint">💬 Основной мессенджер</div>
                  </div>
                  <div className="form-group">
                    <label>VK</label>
                    <input
                      type="text"
                      name="vk"
                      value={profile?.vk || ''}
                      onChange={handleChange}
                      placeholder="https://vk.com/id..."
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Другие соцсети</label>
                    <input
                      type="text"
                      name="social_links"
                      value={profile?.social_links || ''}
                      onChange={handleChange}
                      placeholder="Ссылки через запятую"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== ВКЛАДКА: ИНТЕРЕСЫ ===== */}
            {activeTab === 'interests' && (
              <div className="tab-content">
                <div className="form-grid single">
                  <div className="form-group">
                    <label>Интересы</label>
                    <input
                      type="text"
                      name="interests"
                      value={profile?.interests || ''}
                      onChange={handleChange}
                      placeholder="Дипломатия, история, иностранные языки, спорт"
                      className="form-input"
                    />
                    <div className="form-hint">🎯 Расскажите, что вам интересно</div>
                  </div>
                  <div className="form-group">
                    <label>Навыки</label>
                    <input
                      type="text"
                      name="skills"
                      value={profile?.skills || ''}
                      onChange={handleChange}
                      placeholder="Публичные выступления, переговоры, английский язык"
                      className="form-input"
                    />
                    <div className="form-hint">💪 Навыки, которыми вы владеете</div>
                  </div>
                  <div className="form-group">
                    <label>О себе</label>
                    <textarea
                      name="bio"
                      rows="4"
                      value={profile?.bio || ''}
                      onChange={handleChange}
                      placeholder="Расскажите о себе..."
                      className="form-textarea"
                    />
                    <div className="form-hint">📝 Эта информация будет видна другим участникам</div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== ВКЛАДКА: РОДИТЕЛИ ===== */}
            {activeTab === 'parents' && (
              <div className="tab-content">
                <div className="info-box">
                  ℹ️ <strong>Для чего это нужно?</strong><br />
                  Данные родителя используются для связи в экстренных случаях и получения согласия на участие в мероприятиях.
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>ФИО родителя</label>
                    <input
                      type="text"
                      name="parent_full_name"
                      value={profile?.parent_full_name || ''}
                      onChange={handleChange}
                      placeholder="Иванова Мария Петровна"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Телефон родителя</label>
                    <input
                      type="tel"
                      name="parent_phone"
                      value={profile?.parent_phone || ''}
                      onChange={handleChange}
                      placeholder="+7 999 123 45 67"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Email родителя</label>
                    <input
                      type="email"
                      name="parent_email"
                      value={profile?.parent_email || ''}
                      onChange={handleChange}
                      placeholder="parent@example.com"
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="warning-box">
                  ⚠️ Для участников младше 18 лет обязательно указание родителя
                </div>
              </div>
            )}

            {/* ===== ВКЛАДКА: СОГЛАСИЯ ===== */}
            {activeTab === 'consents' && (
              <div className="tab-content">
                <div className="consents-info">
                  <div className="consents-status-large">
                    <span className="consents-icon">
                      {consentStatus.percentage === 100 ? '✅' : '⚠️'}
                    </span>
                    <div>
                      <div className="consents-title">Статус согласий</div>
                      <div className="consents-text">
                        {consentStatus.given} из {consentStatus.total} дано ({consentStatus.percentage}%)
                      </div>
                    </div>
                  </div>
                  <div className="consents-progress">
                    <div className="consents-progress-bar">
                      <div 
                        className="consents-progress-fill"
                        style={{ 
                          width: `${consentStatus.percentage}%`,
                          background: consentStatus.percentage === 100 
                            ? 'linear-gradient(90deg, #16845B, #1A7A4C)' 
                            : 'linear-gradient(90deg, #C9A227, #E8D9A8)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="consent-item">
                  <label className="consent-label">
                    <input
                      type="checkbox"
                      name="consent_personal_data"
                      checked={profile?.consent_personal_data || false}
                      onChange={handleChange}
                    />
                    <div>
                      <strong>Согласие на обработку персональных данных</strong>
                      <div className="consent-description">
                        Я даю согласие на обработку моих персональных данных в соответствии с Федеральным законом № 152-ФЗ.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="consent-item">
                  <label className="consent-label">
                    <input
                      type="checkbox"
                      name="consent_photo_publication"
                      checked={profile?.consent_photo_publication || false}
                      onChange={handleChange}
                    />
                    <div>
                      <strong>Согласие на публикацию фото и видео</strong>
                      <div className="consent-description">
                        Я даю согласие на использование моих изображений в официальных источниках движения.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="consent-item">
                  <label className="consent-label">
                    <input
                      type="checkbox"
                      name="consent_event_participation"
                      checked={profile?.consent_event_participation || false}
                      onChange={handleChange}
                    />
                    <div>
                      <strong>Согласие на участие в мероприятиях</strong>
                      <div className="consent-description">
                        Я подтверждаю, что ознакомлен с правилами участия в мероприятиях движения.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Дата подписания согласий</label>
                    <input
                      type="date"
                      name="consent_agreement_date"
                      value={profile?.consent_agreement_date || ''}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Дата принятия Устава</label>
                    <input
                      type="date"
                      name="charter_acceptance_date"
                      value={profile?.charter_acceptance_date || ''}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="consents-footer">
                  ✅ <strong>Все согласия обязательны для участия в деятельности ДОД</strong>
                </div>
              </div>
            )}

            {/* ===== ВКЛАДКА: ДОПОЛНИТЕЛЬНО ===== */}
            {activeTab === 'extra' && (
              <div className="tab-content">
                <div className="form-grid single">
                  <div className="form-group">
                    <label>Дополнительное образование</label>
                    <textarea
                      name="education"
                      rows="3"
                      value={profile?.education || ''}
                      onChange={handleChange}
                      placeholder="Курсы, кружки, секции..."
                      className="form-textarea"
                    />
                    <div className="form-hint">📚 Расскажите о своём дополнительном образовании</div>
                  </div>
                  <div className="form-group">
                    <label>Личные достижения</label>
                    <textarea
                      name="achievements"
                      rows="3"
                      value={profile?.achievements || ''}
                      onChange={handleChange}
                      placeholder="Ваши основные достижения..."
                      className="form-textarea"
                    />
                    <div className="form-hint">🏆 Достижения, которыми вы гордитесь</div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== КНОПКА СОХРАНЕНИЯ ВНИЗУ ===== */}
            <div className="form-actions-bottom">
              <button
                type="submit"
                className="btn-save-full"
                disabled={saving}
              >
                {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {profile?.is_president && <PresidentSection profile={profile} />}
      <Footer />

      <style>{`
        /* ============================================================
           ОСНОВНЫЕ СТИЛИ
           ============================================================ */
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        /* ============================================================
           ЗАГОЛОВОК
           ============================================================ */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0;
        }

        .page-header-left p {
          color: #667085;
          margin: 4px 0 0 0;
        }

        .btn-save-header {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
          font-family: 'Inter', sans-serif;
          min-height: 44px;
        }

        .btn-save-header:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        .btn-save-header:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* ============================================================
           СООБЩЕНИЯ
           ============================================================ */
        .message-success {
          padding: 14px 20px;
          background: #E8F5EF;
          color: #1A7A4C;
          border-radius: 10px;
          margin-bottom: 20px;
          border-left: 4px solid #1A7A4C;
          font-weight: 500;
        }

        .message-error {
          padding: 14px 20px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 10px;
          margin-bottom: 20px;
          border-left: 4px solid #B3262E;
          font-weight: 500;
        }

        /* ============================================================
           КАРТОЧКА ПРОФИЛЯ
           ============================================================ */
        .profile-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 24px;
          overflow: hidden;
        }

        .profile-card-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 28px 32px;
          background: linear-gradient(135deg, #0A1628 0%, #1A3555 100%);
          color: white;
        }

        .profile-avatar-section {
          flex-shrink: 0;
        }

        .profile-info-section {
          flex: 1;
          min-width: 0;
        }

        .profile-info-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: white;
        }

        .profile-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .badge-role {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.15);
          color: #E8D9A8;
        }

        .badge-status {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-status.active {
          background: rgba(22, 132, 91, 0.3);
          color: #7DDFB0;
        }

        .badge-status.inactive {
          background: rgba(179, 38, 46, 0.3);
          color: #FCA5A5;
        }

        .badge-club {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(23, 74, 126, 0.3);
          color: #7DB8F0;
        }

        .profile-contact-info {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }

        .contact-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* ============================================================
           СТАТУС СОГЛАСИЙ В КАРТОЧКЕ
           ============================================================ */
        .profile-consent-status {
          padding: 12px 32px;
          background: #F8FAFC;
          border-top: 1px solid #E4DFD8;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .consent-status-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #4D4744;
          font-weight: 500;
          white-space: nowrap;
        }

        .consent-count {
          padding: 2px 10px;
          background: #E4DFD8;
          border-radius: 12px;
          font-size: 11px;
          color: #4D4744;
        }

        .consent-progress-bar {
          flex: 1;
          min-width: 120px;
          height: 6px;
          background: #E4DFD8;
          border-radius: 3px;
          overflow: hidden;
        }

        .consent-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        /* ============================================================
           ВКЛАДКИ
           ============================================================ */
        .tabs-container {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          background: white;
          padding: 4px 4px 0 4px;
          border-radius: 12px 12px 0 0;
          border: 1px solid #E4DFD8;
          border-bottom: none;
        }

        .tab-btn {
          padding: 10px 20px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: #8A8480;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px 8px 0 0;
          font-family: 'Inter', sans-serif;
        }

        .tab-btn:hover {
          color: #0A1628;
          background: #F8F6F2;
        }

        .tab-btn.active {
          color: #0A1628;
          font-weight: 600;
          background: #FBF4DC;
          position: relative;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #C9A227;
        }

        /* ============================================================
           ФОРМА
           ============================================================ */
        .form-container {
          background: white;
          border-radius: 0 0 12px 12px;
          padding: 28px 32px;
          border: 1px solid #E4DFD8;
          border-top: none;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .tab-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .form-grid.single {
          grid-template-columns: 1fr;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #0A1628;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E4DFD8;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #0A1628;
          background: white;
          transition: all 0.3s ease;
          outline: none;
        }

        .form-input:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

        .form-input.disabled {
          background: #F8F6F2;
          color: #8A8480;
          cursor: not-allowed;
        }

        .form-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E4DFD8;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #0A1628;
          background: white;
          transition: all 0.3s ease;
          outline: none;
          resize: vertical;
          min-height: 80px;
        }

        .form-textarea:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

        .form-hint {
          font-size: 11px;
          color: #98A2B3;
          margin-top: 2px;
        }

        .info-box {
          padding: 12px 16px;
          background: #EAF2FA;
          border-radius: 8px;
          font-size: 13px;
          color: #174A7E;
          margin-bottom: 18px;
          line-height: 1.6;
        }

        .warning-box {
          padding: 12px 16px;
          background: #FBF4DC;
          border-radius: 8px;
          font-size: 13px;
          color: #8A6A00;
          margin-top: 12px;
          border-left: 3px solid #C9A227;
        }

        /* ============================================================
           СОГЛАСИЯ
           ============================================================ */
        .consents-info {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: #F8FAFC;
          border-radius: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .consents-status-large {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .consents-icon {
          font-size: 28px;
        }

        .consents-title {
          font-weight: 600;
          color: #0A1628;
          font-size: 14px;
        }

        .consents-text {
          font-size: 13px;
          color: #667085;
        }

        .consents-progress {
          flex: 1;
          min-width: 100px;
        }

        .consents-progress-bar {
          height: 6px;
          background: #E4DFD8;
          border-radius: 3px;
          overflow: hidden;
        }

        .consents-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .consent-item {
          padding: 14px 16px;
          border: 1.5px solid #E4DFD8;
          border-radius: 10px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          background: white;
        }

        .consent-item:hover {
          border-color: #C9A227;
        }

        .consent-item:has(input:checked) {
          border-color: #16845B;
          background: #F6FEF9;
        }

        .consent-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .consent-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          accent-color: #C9A227;
          cursor: pointer;
          flex-shrink: 0;
        }

        .consent-label strong {
          font-size: 14px;
          color: #0A1628;
        }

        .consent-description {
          font-size: 13px;
          color: #667085;
          margin-top: 4px;
          line-height: 1.5;
        }

        .consents-footer {
          padding: 12px 16px;
          background: #E8F5EF;
          border-radius: 8px;
          font-size: 13px;
          color: #16845B;
          margin-top: 12px;
          border-left: 3px solid #16845B;
        }

        /* ============================================================
           КНОПКА СОХРАНЕНИЯ ВНИЗУ
           ============================================================ */
        .form-actions-bottom {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #E4DFD8;
        }

        .btn-save-full {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 40px;
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
          font-family: 'Inter', sans-serif;
          width: 100%;
        }

        .btn-save-full:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        .btn-save-full:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* ============================================================
           СПИННЕР
           ============================================================ */
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #E4DFD8;
          border-top-color: #C9A227;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .container-page {
            padding: 20px 24px 32px;
          }

          .profile-card-header {
            flex-wrap: wrap;
            justify-content: center;
            text-align: center;
          }

          .profile-info-section {
            text-align: center;
          }

          .profile-badges {
            justify-content: center;
          }

          .profile-contact-info {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .btn-save-header {
            width: 100%;
            justify-content: center;
          }

          .profile-card-header {
            padding: 20px;
            flex-direction: column;
            text-align: center;
          }

          .profile-info-section h2 {
            font-size: 22px;
          }

          .profile-badges {
            justify-content: center;
          }

          .profile-contact-info {
            justify-content: center;
            gap: 8px;
          }

          .profile-consent-status {
            padding: 10px 20px;
            flex-direction: column;
            align-items: stretch;
          }

          .consent-status-label {
            justify-content: center;
          }

          .form-container {
            padding: 20px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: 1;
          }

          .tabs-container {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding: 4px 4px 0 4px;
          }

          .tab-btn {
            white-space: nowrap;
            padding: 8px 14px;
            font-size: 13px;
          }

          .consents-info {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .consents-status-large {
            justify-content: center;
          }

          .btn-save-full {
            padding: 12px 24px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .page-header-left h1 {
            font-size: 20px;
          }

          .profile-card-header {
            padding: 16px;
          }

          .profile-info-section h2 {
            font-size: 18px;
          }

          .profile-avatar-section {
            width: 80px;
            height: 80px;
          }

          .form-container {
            padding: 16px;
          }

          .tab-btn {
            padding: 6px 10px;
            font-size: 12px;
          }

          .consent-item {
            padding: 10px 12px;
          }

          .consent-label {
            flex-direction: column;
          }

          .consent-label input[type="checkbox"] {
            margin-top: 0;
          }

          .badge-role,
          .badge-status,
          .badge-club {
            font-size: 10px;
            padding: 2px 10px;
          }
        }
      `}</style>
    </div>
  );
}