// src/pages/Profile.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('profile');

  // ===== ЗАГРУЗКА ПРОФИЛЯ =====
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getMe();
        if (data.id) {
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

    loadProfile();
  }, [navigate]);

  // ===== СОХРАНЕНИЕ ПРОФИЛЯ =====
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const result = await api.updateProfile({
        full_name: profile.full_name,
        phone: profile.phone || '',
        school: profile.school || '',
        class_name: profile.class_name || '',
        interests: profile.interests || '',
        bio: profile.bio || '',
        city: profile.city || ''
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Профиль успешно обновлён!');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
    setSaving(false);
  };

  // ===== ПОЛУЧЕНИЕ НАЗВАНИЯ РОЛИ =====
  const getRoleLabel = (role) => {
    const roles = {
      admin: '🔧 Администратор',
      participant: '👤 Участник',
      parent: '👨‍👩‍👦 Родитель',
      club_coordinator: '🏫 Координатор КЮДа',
      movement_coordinator: '⭐ Координатор движения',
      tutor: '📚 Тьютор',
      president: '👑 Президент ДОД',
      vice_president: '⭐ Вице-президент ДОД'
    };
    return roles[role] || role;
  };

  // ===== ОБНОВЛЕНИЕ ПОЛЕЙ =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#F4F6F9'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px 24px 40px'
      }}>
        {/* ЗАГОЛОВОК */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
            👤 Мой профиль
          </h1>
          <span style={{
            background: '#0B1F3A',
            color: 'white',
            padding: '4px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {getRoleLabel(profile?.role)}
          </span>
        </div>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          Управление личными данными
        </p>

        {/* СООБЩЕНИЯ */}
        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* ВКЛАДКИ */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'profile' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'profile' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'profile' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            📋 Профиль
          </button>
        </div>

        {/* ===== ВКЛАДКА: ПРОФИЛЬ ===== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                ФИО
              </label>
              <input
                type="text"
                name="full_name"
                value={profile?.full_name || ''}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: '#F4F6F9',
                  cursor: 'not-allowed'
                }}
              />
              <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                Email нельзя изменить — это ваш логин
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                value={profile?.phone || ''}
                onChange={handleChange}
                placeholder="+7 (XXX) XXX-XX-XX"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Город
              </label>
              <input
                type="text"
                name="city"
                value={profile?.city || ''}
                onChange={handleChange}
                placeholder="Москва"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Школа
              </label>
              <input
                type="text"
                name="school"
                value={profile?.school || ''}
                onChange={handleChange}
                placeholder="Школа №1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Класс
              </label>
              <input
                type="text"
                name="class_name"
                value={profile?.class_name || ''}
                onChange={handleChange}
                placeholder="8А"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Интересы
              </label>
              <input
                type="text"
                name="interests"
                value={profile?.interests || ''}
                onChange={handleChange}
                placeholder="Дипломатия, история, иностранные языки"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                О себе
              </label>
              <textarea
                name="bio"
                rows="3"
                value={profile?.bio || ''}
                onChange={handleChange}
                placeholder="Расскажите о себе..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '500',
                fontSize: '13px',
                color: '#475467',
                marginBottom: '4px'
              }}>
                Дата рождения
              </label>
              <input
                type="date"
                name="birth_date"
                value={profile?.birth_date || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: '#F4F6F9',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                background: saving ? '#6c757d' : '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}