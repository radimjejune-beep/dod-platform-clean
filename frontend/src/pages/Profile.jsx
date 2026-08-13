// frontend/src/pages/Profile.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import AvatarUpload from '../components/AvatarUpload';

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('success');

    try {
      let phone = profile.phone || '';
      phone = phone.replace(/[^0-9+]/g, '');

      // Обработка даты
      let birthDate = profile.birth_date || '';
      if (birthDate === '' || birthDate === 'Invalid Date') {
        birthDate = null;
      }

      const updateData = {
        // ===== ОСНОВНОЕ =====
        full_name: profile.full_name.trim(),
        phone: phone,
        school: profile.school || '',
        class_name: profile.class_name || '',
        city: profile.city || '',
        birth_date: birthDate,
        
        // ===== ИНТЕРЕСЫ =====
        interests: profile.interests || '',
        bio: profile.bio || '',
        skills: profile.skills || '',
        
        // ===== КОНТАКТЫ =====
        social_links: profile.social_links || '',
        telegram: profile.telegram || '',
        vk: profile.vk || '',
        
        // ===== РОДИТЕЛИ (ДЛЯ НЕСОВЕРШЕННОЛЕТНИХ) =====
        parent_full_name: profile.parent_full_name || '',
        parent_phone: profile.parent_phone || '',
        parent_email: profile.parent_email || '',
        
        // ===== СОГЛАСИЯ =====
        consent_personal_data: profile.consent_personal_data || false,
        consent_photo_publication: profile.consent_photo_publication || false,
        consent_event_participation: profile.consent_event_participation || false,
        consent_agreement_date: profile.consent_agreement_date || null,
        charter_acceptance_date: profile.charter_acceptance_date || null,
        
        // ===== ДОПОЛНИТЕЛЬНО =====
        education: profile.education || '',
        achievements: profile.achievements || ''
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
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
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👤</span>
          <div>
            <h1>Мой профиль</h1>
            <p>Управление личными данными</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card">
          {/* АВАТАР */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '1px solid #E2E7EF'
          }}>
            <AvatarUpload
              currentAvatar={profile?.avatar_url}
              onAvatarUpdated={handleAvatarUpdated}
              userId={profile?.id}
            />
          </div>

          {/* ВКЛАДКИ */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '24px',
            borderBottom: '2px solid #E2E7EF',
            paddingBottom: '4px',
            flexWrap: 'wrap'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: activeTab === tab.id ? '#0B1F3A' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#667085',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  fontSize: '13px',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave}>
            {/* ============================================================
                ВКЛАДКА: ОСНОВНОЕ
                ============================================================ */}
            {activeTab === 'main' && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>ФИО *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={profile?.full_name || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Дата рождения</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={profile?.birth_date || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Город</label>
                    <input
                      type="text"
                      name="city"
                      value={profile?.city || ''}
                      onChange={handleChange}
                      placeholder="Москва"
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
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================
                ВКЛАДКА: КОНТАКТЫ
                ============================================================ */}
            {activeTab === 'contacts' && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile?.phone || ''}
                      onChange={handleChange}
                      placeholder="+7 999 123 45 67"
                    />
                  </div>
                  <div className="form-group">
                    <label>Telegram</label>
                    <input
                      type="text"
                      name="telegram"
                      value={profile?.telegram || ''}
                      onChange={handleChange}
                      placeholder="@username"
                    />
                  </div>
                  <div className="form-group">
                    <label>VK</label>
                    <input
                      type="text"
                      name="vk"
                      value={profile?.vk || ''}
                      onChange={handleChange}
                      placeholder="https://vk.com/id..."
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
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================
                ВКЛАДКА: ИНТЕРЕСЫ
                ============================================================ */}
            {activeTab === 'interests' && (
              <div>
                <div className="form-group">
                  <label>Интересы</label>
                  <input
                    type="text"
                    name="interests"
                    value={profile?.interests || ''}
                    onChange={handleChange}
                    placeholder="Дипломатия, история, иностранные языки, спорт"
                  />
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    Перечислите интересы через запятую
                  </div>
                </div>

                <div className="form-group">
                  <label>Навыки</label>
                  <input
                    type="text"
                    name="skills"
                    value={profile?.skills || ''}
                    onChange={handleChange}
                    placeholder="Публичные выступления, переговоры, английский язык"
                  />
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    Перечислите навыки через запятую
                  </div>
                </div>

                <div className="form-group">
                  <label>О себе</label>
                  <textarea
                    name="bio"
                    rows="3"
                    value={profile?.bio || ''}
                    onChange={handleChange}
                    placeholder="Расскажите о себе..."
                  />
                </div>
              </div>
            )}

            {/* ============================================================
                ВКЛАДКА: РОДИТЕЛИ
                ============================================================ */}
            {activeTab === 'parents' && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>ФИО родителя/законного представителя</label>
                    <input
                      type="text"
                      name="parent_full_name"
                      value={profile?.parent_full_name || ''}
                      onChange={handleChange}
                      placeholder="Иванова Мария Петровна"
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
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Email родителя</label>
                    <input
                      type="email"
                      name="parent_email"
                      value={profile?.parent_email || ''}
                      onChange={handleChange}
                      placeholder="parent@example.com"
                    />
                  </div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: '#FBF4DC',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#8A6A00',
                  marginTop: '8px'
                }}>
                  ⚠️ Для участников младше 18 лет обязательно указание родителя или законного представителя
                </div>
              </div>
            )}

            {/* ============================================================
                ВКЛАДКА: СОГЛАСИЯ
                ============================================================ */}
            {activeTab === 'consents' && (
              <div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="consent_personal_data"
                      checked={profile?.consent_personal_data || false}
                      onChange={handleChange}
                      style={{ marginTop: '3px', width: '18px', height: '18px' }}
                    />
                    <span>
                      <strong>Согласие на обработку персональных данных</strong>
                      <br />
                      <span style={{ fontSize: '12px', color: '#667085' }}>
                        В соответствии с Федеральным законом № 152-ФЗ «О персональных данных»
                      </span>
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="consent_photo_publication"
                      checked={profile?.consent_photo_publication || false}
                      onChange={handleChange}
                      style={{ marginTop: '3px', width: '18px', height: '18px' }}
                    />
                    <span>
                      <strong>Согласие на публикацию фото и видео</strong>
                      <br />
                      <span style={{ fontSize: '12px', color: '#667085' }}>
                        В официальных источниках ДОД «Дипломаты будущего»
                      </span>
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="consent_event_participation"
                      checked={profile?.consent_event_participation || false}
                      onChange={handleChange}
                      style={{ marginTop: '3px', width: '18px', height: '18px' }}
                    />
                    <span>
                      <strong>Согласие на участие в мероприятиях</strong>
                      <br />
                      <span style={{ fontSize: '12px', color: '#667085' }}>
                        Я ознакомлен(а) с правилами участия в мероприятиях ДОД
                      </span>
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label>Дата подписания согласий</label>
                  <input
                    type="date"
                    name="consent_agreement_date"
                    value={profile?.consent_agreement_date || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Дата принятия Устава ДОД</label>
                  <input
                    type="date"
                    name="charter_acceptance_date"
                    value={profile?.charter_acceptance_date || ''}
                    onChange={handleChange}
                  />
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: '#E8F5EF',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#16845B',
                  marginTop: '8px'
                }}>
                  ✅ Все согласия являются обязательными для участия в деятельности ДОД
                </div>
              </div>
            )}

            {/* ============================================================
                ВКЛАДКА: ДОПОЛНИТЕЛЬНО
                ============================================================ */}
            {activeTab === 'extra' && (
              <div>
                <div className="form-group">
                  <label>Дополнительное образование</label>
                  <textarea
                    name="education"
                    rows="3"
                    value={profile?.education || ''}
                    onChange={handleChange}
                    placeholder="Курсы, кружки, секции..."
                  />
                </div>
                <div className="form-group">
                  <label>Личные достижения</label>
                  <textarea
                    name="achievements"
                    rows="3"
                    value={profile?.achievements || ''}
                    onChange={handleChange}
                    placeholder="Ваши основные достижения..."
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}