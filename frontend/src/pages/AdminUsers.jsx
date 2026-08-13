// frontend/src/pages/AdminUsers.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function AdminUsers() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createdUsers, setCreatedUsers] = useState([]);
  const [showPasswordList, setShowPasswordList] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'participant',
    phone: '',
    school: '',
    class_name: '',
    club_id: ''
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

      // Проверка прав — только админ или координатор движения
      if (userData.role !== 'admin' && userData.role !== 'movement_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем клубы
      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      // Загружаем всех пользователей
      const usersData = await api.getUsers();
      setUsers(usersData || []);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    setCreatedUsers([]);

    try {
      const password = generatePassword();

      const result = await api.createUser({
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone || '',
        school: form.school || '',
        class_name: form.class_name || '',
        club_id: form.club_id || ''
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setCreatedUsers([{
        full_name: form.full_name,
        email: form.email,
        password: result.generated_password || password,
        role: form.role
      }]);

      setMessage(`✅ Пользователь "${form.full_name}" создан!`);
      setMessageType('success');
      setShowPasswordList(true);
      
      // Сбрасываем форму
      setForm({
        full_name: '',
        email: '',
        role: 'participant',
        phone: '',
        school: '',
        class_name: '',
        club_id: ''
      });

      // Обновляем список пользователей
      const usersData = await api.getUsers();
      setUsers(usersData || []);

      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Изменить роль пользователя на ${newRole}?`)) return;

    try {
      const result = await api.updateUserRole(userId, newRole);
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Роль изменена');
      setMessageType('success');
      
      // Обновляем список
      const usersData = await api.getUsers();
      setUsers(usersData || []);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const copyPasswords = () => {
    let text = '=== ДАННЫЕ ДЛЯ ВХОДА ===\n\n';
    createdUsers.forEach(u => {
      text += `ФИО: ${u.full_name}\n`;
      text += `Логин: ${u.email}\n`;
      text += `Пароль: ${u.password}\n`;
      text += `Роль: ${getRoleLabel(u.role)}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setMessage('✅ Данные скопированы!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedRole) {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    if (selectedClub) {
      filtered = filtered.filter(u => u.club_id === selectedClub);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const getRoleLabel = (role) => {
    const labels = {
      'participant': '👤 Участник',
      'parent': '👨‍👩‍👦 Родитель',
      'club_coordinator': '🏫 Координатор КЮДа',
      'tutor': '📚 Тьютор',
      'movement_coordinator': '⭐ Координатор движения',
      'admin': '🔧 Администратор',
      'president': '👑 Президент ДОД',
      'vice_president': '⭐ Вице-президент ДОД'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              👥 Управление пользователями
            </h1>
            <p style={{ color: '#667085', fontSize: '16px' }}>
              Всего пользователей: {users.length}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowCreateUser(!showCreateUser);
                setShowPasswordList(false);
                setCreatedUsers([]);
              }}
              style={{
                padding: '10px 24px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {showCreateUser ? '✖ Закрыть' : '➕ Создать пользователя'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* СПИСОК ПАРОЛЕЙ */}
        {showPasswordList && createdUsers.length > 0 && (
          <div className="card" style={{ 
            padding: '24px', 
            marginBottom: '24px',
            background: '#FBF4DC',
            border: '2px solid #C9A227'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0B1F3A' }}>
                🔑 Данные для входа
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={copyPasswords}
                  style={{
                    padding: '6px 16px',
                    background: '#0B1F3A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  📋 Скопировать все
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPasswordList(false);
                    setCreatedUsers([]);
                  }}
                  style={{
                    padding: '6px 16px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  ✖ Закрыть
                </button>
              </div>
            </div>

            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#F4F6F9' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>ФИО</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Логин</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Пароль</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Роль</th>
                  </tr>
                </thead>
                <tbody>
                  {createdUsers.map((u, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #E2E7EF' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{u.full_name}</td>
                      <td style={{ padding: '8px 12px' }}>{u.email}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{
                          background: '#F4F6F9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0B1F3A'
                        }}>
                          {u.password}
                        </code>
                      </td>
                      <td style={{ padding: '8px 12px' }}>{getRoleLabel(u.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ */}
        {showCreateUser && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📝 Создать пользователя
            </h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    ФИО *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="ivan@example.com"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Роль *
                  </label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="participant">👤 Участник</option>
                    <option value="parent">👨‍👩‍👦 Родитель</option>
                    <option value="club_coordinator">🏫 Координатор КЮДа</option>
                    <option value="tutor">📚 Тьютор</option>
                    <option value="movement_coordinator">⭐ Координатор движения</option>
                    <option value="admin">🔧 Администратор</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Телефон
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Школа
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="Школа №1"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Класс
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    placeholder="8А"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                    Клуб
                  </label>
                  <select
                    className="form-select"
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '13px', color: '#667085' }}>
                  🔑 Пароль будет сгенерирован автоматически и показан после создания
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading}
                  style={{
                    padding: '10px 28px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? '⏳ Создание...' : '✅ Создать пользователя'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateUser(false);
                    setShowPasswordList(false);
                    setCreatedUsers([]);
                  }}
                  style={{
                    padding: '10px 28px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ФИЛЬТРЫ И ТАБЛИЦА */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по ФИО, email..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white' }}
            >
              <option value="">Все роли</option>
              <option value="participant">Участник</option>
              <option value="parent">Родитель</option>
              <option value="club_coordinator">Координатор КЮДа</option>
              <option value="tutor">Тьютор</option>
              <option value="movement_coordinator">Координатор движения</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white' }}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '14px', color: '#667085' }}>
            Найдено: <strong>{filteredUsers.length}</strong>
          </div>
        </div>

        {/* ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'auto',
          border: '1px solid #E2E7EF',
          boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F4F6F9', borderBottom: '2px solid #E2E7EF' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>ФИО</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Роль</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475467' }}>Клуб</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475467' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                    Пользователей не найдено
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F4F6F9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0B1F3A' }}>
                      {u.full_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#667085' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #D5DCE7',
                          fontSize: '12px',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="participant">Участник</option>
                        <option value="parent">Родитель</option>
                        <option value="club_coordinator">Координатор КЮДа</option>
                        <option value="tutor">Тьютор</option>
                        <option value="movement_coordinator">Координатор движения</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#667085' }}>
                      {u.club_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        style={{
                          padding: '4px 12px',
                          background: '#F4F6F9',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onClick={() => navigate(`/participant/${u.id}`)}
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}