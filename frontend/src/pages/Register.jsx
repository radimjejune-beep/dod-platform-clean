// src/pages/Register.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  
  // ===== СОСТОЯНИЯ =====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ===== КЛУБЫ =====
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  // ===== ДАННЫЕ ФОРМЫ =====
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'participant',
    phone: '',
    school: '',
    class_name: '',
    birth_date: '',
    club_id: '',
    // Для родителей
    child_id: '',
    // Для несовершеннолетних
    parent_full_name: '',
    parent_phone: '',
    parent_email: '',
    // Согласия
    agree_to_terms: false,
    agree_personal_data: false,
    agree_minor_data: false,
    agree_image_use: false,
    agree_photo_publication: false
  });

  // ===== ДЛЯ ПОИСКА РЕБЁНКА (РОДИТЕЛИ) =====
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);

  // ===== ЗАГРУЗКА КЛУБОВ =====
  useEffect(() => {
    const loadClubs = async () => {
      try {
        const data = await api.getClubs();
        setClubs(data || []);
      } catch (err) {
        console.error('Ошибка загрузки клубов:', err);
      } finally {
        setLoadingClubs(false);
      }
    };
    loadClubs();
  }, []);

  // ===== ГЕНЕРАЦИЯ ПАРОЛЯ =====
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // ===== ПРОВЕРКА: НЕСОВЕРШЕННОЛЕТНИЙ? =====
  const isMinor = (birthDate) => {
    if (!birthDate) return false;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 18;
  };

  // ===== ПОИСК РЕБЁНКА ДЛЯ РОДИТЕЛЯ =====
  useEffect(() => {
    const searchChild = async () => {
      if (form.role !== 'parent' || searchQuery.length < 3) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        const allUsers = await api.getProfiles();
        const participants = allUsers.filter(u => u.role === 'participant');
        const filtered = participants.filter(p =>
          p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 5));
        setShowSearchResults(filtered.length > 0);
      } catch (err) {
        console.error('Ошибка поиска:', err);
      }
    };

    const delay = setTimeout(searchChild, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, form.role]);

  // ===== ВЫБОР РЕБЁНКА =====
  const handleSelectChild = (child) => {
    setSelectedChild(child);
    setForm({ ...form, child_id: child.id });
    setSearchQuery(child.full_name);
    setShowSearchResults(false);
  };

  // ===== ОБНОВЛЕНИЕ ПОЛЕЙ ФОРМЫ =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // ===== ОТПРАВКА ФОРМЫ =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // ===== ВАЛИДАЦИЯ =====
    if (!form.email || !form.email.includes('@')) {
      setError('❌ Введите корректный email');
      setLoading(false);
      return;
    }

    if (!form.full_name || form.full_name.trim().length < 2) {
      setError('❌ Введите ваше ФИО');
      setLoading(false);
      return;
    }

    if (!form.birth_date) {
      setError('❌ Укажите дату рождения');
      setLoading(false);
      return;
    }

    if (!form.agree_to_terms || !form.agree_personal_data) {
      setError('❌ Для регистрации необходимо ознакомиться с Политикой и дать согласие на обработку персональных данных');
      setLoading(false);
      return;
    }

    if (isMinor(form.birth_date) && !form.agree_minor_data) {
      setError('❌ Для регистрации несовершеннолетнего необходимо согласие законного представителя');
      setLoading(false);
      return;
    }

    if (form.role === 'parent' && !form.child_id) {
      setError('❌ Пожалуйста, найдите и выберите своего ребёнка в системе');
      setLoading(false);
      return;
    }

    // ===== ГЕНЕРИРУЕМ ПАРОЛЬ =====
    const password = generatePassword();
    setGeneratedPassword(password);

    // ===== ПОДГОТАВЛИВАЕМ ДАННЫЕ =====
    const payload = {
      email: form.email,
      password: password,
      full_name: form.full_name,
      role: form.role,
      phone: form.phone || '',
      school: form.school || '',
      class_name: form.class_name || '',
      birth_date: form.birth_date || '',
      club_id: form.club_id || '',
      child_id: form.child_id || null,
      is_minor: isMinor(form.birth_date),
      parent_full_name: form.parent_full_name || '',
      parent_phone: form.parent_phone || '',
      parent_email: form.parent_email || '',
      consents: {
        agree_to_terms: form.agree_to_terms,
        agree_personal_data: form.agree_personal_data,
        agree_minor_data: form.agree_minor_data,
        agree_image_use: form.agree_image_use,
        agree_photo_publication: form.agree_photo_publication
      }
    };

    try {
      const result = await api.register(payload);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(true);
      setShowPassword(true);
      
      // Через 5 секунд перенаправляем на страницу входа
      setTimeout(() => {
        navigate('/login');
      }, 5000);

    } catch (err) {
      setError('❌ Ошибка регистрации: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== РОЛИ =====
  const roles = [
    { value: 'participant', label: '👤 Участник' },
    { value: 'parent', label: '👨‍👩‍👦 Родитель' },
    { value: 'club_coordinator', label: '🏫 Координатор КЮДа' },
    { value: 'tutor', label: '📚 Тьютор' },
    { value: 'movement_coordinator', label: '⭐ Координатор движения' }
  ];

  const isUserMinor = isMinor(form.birth_date);

  return (
    <div style={{
      background: '#F4F6F9',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 30px rgba(11, 31, 58, 0.08)'
      }}>
        {/* ЗАГОЛОВОК */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            fontSize: '24px',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.3)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '20px', color: '#172033', marginBottom: '2px' }}>
            Детское общественное движение
          </h1>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
            «Дипломаты будущего»
          </h2>
          <p style={{
            fontSize: '10px',
            color: '#C9A227',
            fontWeight: '600',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Ассоциация российских дипломатов
          </p>
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#667085'
          }}>
            Регистрация в системе
          </div>
        </div>

        {/* СООБЩЕНИЯ */}
        {error && (
          <div style={{
            padding: '12px',
            background: '#FCEBEC',
            color: '#B3262E',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '16px',
            background: '#E8F5EF',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', color: '#16845B', fontWeight: '600' }}>
              ✅ Регистрация успешна!
            </div>
            {showPassword && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '14px', color: '#0B1F3A' }}>
                  <strong>Ваш пароль:</strong>
                </p>
                <div style={{
                  background: '#F4F6F9',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#0B1F3A',
                  letterSpacing: '2px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {generatedPassword}
                </div>
                <p style={{ fontSize: '13px', color: '#667085', marginTop: '8px' }}>
                  ⚠️ Сохраните пароль! После регистрации вы сможете войти в систему.
                  <br />
                  <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                    Перенаправление на страницу входа через 5 секунд...
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ФОРМА */}
        {!success && (
          <form onSubmit={handleSubmit}>
            {/* РОЛЬ */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#0B1F3A', marginBottom: '4px' }}>
                Кто вы? *
              </label>
              <select
                name="role"
                className="form-select"
                value={form.role}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* ЛИЧНЫЕ ДАННЫЕ */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                Личные данные
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  ФИО *
                </label>
                <input
                  type="text"
                  name="full_name"
                  className="form-input"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  placeholder="Иванов Иван Иванович"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Email (логин) *
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="example@mail.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Дата рождения *
                </label>
                <input
                  type="date"
                  name="birth_date"
                  className="form-input"
                  value={form.birth_date}
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
                {form.birth_date && (
                  <div style={{
                    fontSize: '12px',
                    color: isUserMinor ? '#C9A227' : '#16845B',
                    marginTop: '4px'
                  }}>
                    {isUserMinor ? '🔞 Несовершеннолетний (требуется согласие родителей)' : '✅ Совершеннолетний'}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  value={form.phone}
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
            </div>

            {/* ИНФОРМАЦИЯ ОБ УЧАСТНИКЕ */}
            {(form.role === 'participant' || form.role === 'tutor') && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                  Информация об участнике
                </h4>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Школа
                  </label>
                  <input
                    type="text"
                    name="school"
                    className="form-input"
                    value={form.school}
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

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Класс
                  </label>
                  <input
                    type="text"
                    name="class_name"
                    className="form-input"
                    value={form.class_name}
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

                {form.role === 'participant' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                      🏫 Клуб юных дипломатов
                      <span style={{ fontSize: '12px', color: '#98A2B3', fontWeight: '400', marginLeft: '8px' }}>
                        (необязательно)
                      </span>
                    </label>
                    <select
                      name="club_id"
                      className="form-select"
                      value={form.club_id}
                      onChange={handleChange}
                      disabled={loadingClubs}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #D5DCE7',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">— Выберите клуб —</option>
                      {clubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* ДЛЯ РОДИТЕЛЯ — ПОИСК РЕБЁНКА */}
            {form.role === 'parent' && (
              <div style={{
                marginBottom: '16px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E7EF'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                  👨‍👩‍👦 Привязка ребёнка
                </h4>
                <p style={{ fontSize: '12px', color: '#667085', marginBottom: '12px' }}>
                  Найдите своего ребёнка в системе по ФИО
                </p>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Поиск ребёнка
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Введите ФИО ребёнка..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {showSearchResults && searchResults.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    border: '1px solid #E2E7EF',
                    borderRadius: '10px',
                    background: 'white',
                    overflow: 'hidden'
                  }}>
                    {searchResults.map((child) => (
                      <div
                        key={child.id}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F4F6F9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        onClick={() => handleSelectChild(child)}
                      >
                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                          {child.full_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#667085' }}>
                          {child.school || 'Школа не указана'} • {child.class_name || 'Класс не указан'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length > 2 && searchResults.length === 0 && !selectedChild && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#667085'
                  }}>
                    Дети не найдены. Возможно, ребёнок ещё не зарегистрирован.
                  </div>
                )}

                {selectedChild && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#E8F5EF',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#16845B' }}>
                        ✅ Выбран: {selectedChild.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#667085' }}>
                        {selectedChild.school || 'Школа не указана'} • {selectedChild.class_name || 'Класс не указан'}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#B3262E',
                        cursor: 'pointer',
                        fontSize: '18px'
                      }}
                      onClick={() => {
                        setSelectedChild(null);
                        setSearchQuery('');
                        setForm({ ...form, child_id: '' });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ДАННЫЕ РОДИТЕЛЯ ДЛЯ НЕСОВЕРШЕННОЛЕТНЕГО */}
            {isUserMinor && (
              <div style={{
                marginBottom: '16px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E7EF'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                  Данные законного представителя
                  <span style={{ fontSize: '12px', color: '#667085', fontWeight: '400', marginLeft: '8px' }}>
                    (обязательно)
                  </span>
                </h4>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    ФИО законного представителя *
                  </label>
                  <input
                    type="text"
                    name="parent_full_name"
                    className="form-input"
                    value={form.parent_full_name}
                    onChange={handleChange}
                    required={isUserMinor}
                    placeholder="Иванов Иван Иванович"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Телефон законного представителя
                  </label>
                  <input
                    type="tel"
                    name="parent_phone"
                    className="form-input"
                    value={form.parent_phone}
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

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Email законного представителя
                  </label>
                  <input
                    type="email"
                    name="parent_email"
                    className="form-input"
                    value={form.parent_email}
                    onChange={handleChange}
                    placeholder="parent@mail.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            )}

            {/* ЮРИДИЧЕСКИЕ СОГЛАСИЯ */}
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E7EF'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                Юридические согласия
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="agree_to_terms"
                    checked={form.agree_to_terms}
                    onChange={handleChange}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                    required
                  />
                  <span>
                    Я ознакомился(ась) с{' '}
                    <a href="/legal/privacy-policy" target="_blank" style={{ color: '#174A7E' }}>
                      Политикой обработки персональных данных
                    </a>
                    <span style={{ color: '#B3262E', marginLeft: '4px' }}>*</span>
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="agree_personal_data"
                    checked={form.agree_personal_data}
                    onChange={handleChange}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                    required
                  />
                  <span>
                    Я даю{' '}
                    <a href="/legal/consent-personal-data" target="_blank" style={{ color: '#174A7E' }}>
                      согласие на обработку персональных данных
                    </a>
                    <span style={{ color: '#B3262E', marginLeft: '4px' }}>*</span>
                  </span>
                </label>

                {isUserMinor && (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="agree_minor_data"
                      checked={form.agree_minor_data}
                      onChange={handleChange}
                      style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>
                      Я даю{' '}
                      <a href="/legal/consent-minor" target="_blank" style={{ color: '#174A7E' }}>
                        согласие на обработку персональных данных несовершеннолетнего
                      </a>
                      <span style={{ color: '#B3262E', marginLeft: '4px' }}>*</span>
                    </span>
                  </label>
                )}

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="agree_image_use"
                    checked={form.agree_image_use}
                    onChange={handleChange}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>
                    Я даю согласие на использование изображения
                    <span style={{ color: '#98A2B3', fontSize: '12px', marginLeft: '4px' }}>(необязательно)</span>
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="agree_photo_publication"
                    checked={form.agree_photo_publication}
                    onChange={handleChange}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>
                    Я даю согласие на публикацию моих фотографий на сайте и в социальных сетях движения
                    <span style={{ color: '#98A2B3', fontSize: '12px', marginLeft: '4px' }}>(необязательно)</span>
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#6c757d' : '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              disabled={loading}
            >
              {loading ? '⏳ Регистрация...' : '✅ Зарегистрироваться'}
            </button>
          </form>
        )}

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#667085'
        }}>
          Уже есть аккаунт?{' '}
          <a href="/login" style={{
            color: '#0B1F3A',
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: '2px solid #C9A227',
            paddingBottom: '2px'
          }}>
            Войти
          </a>
        </p>
      </div>
    </div>
  );
}