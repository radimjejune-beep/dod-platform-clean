// frontend/src/pages/AdminUsers.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function AdminUsers() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
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

      // ============================================================
      // ПРОВЕРКА ДОСТУПА — ТОЛЬКО АДМИН И КООРДИНАТОР ДВИЖЕНИЯ
      // ============================================================
      if (userData.role !== 'admin' && userData.role !== 'movement_coordinator' && userData.role !== 'president' && userData.role !== 'vice_president') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [usersData, clubsData] = await Promise.all([
        api.getUsers(),
        api.getClubs()
      ]);

      setClubs(clubsData || []);

      // ============================================================
      // ЛОГИКА ПО РОЛЯМ
      // ============================================================
      if (userData.role === 'admin' || userData.role === 'movement_coordinator') {
        // АДМИН и КООРДИНАТОР ДВИЖЕНИЯ — видят всех
        setAllUsers(usersData || []);
        setUsers(usersData || []);
      } else if (userData.role === 'president' || userData.role === 'vice_president') {
        // ПРЕЗИДЕНТ и ВИЦЕ — видят всех (только просмотр)
        setAllUsers(usersData || []);
        setUsers(usersData || []);
      } else {
        setAllUsers([]);
        setUsers([]);
      }

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтры
  useEffect(() => {
    let filtered = allUsers;

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

    setUsers(filtered);
  }, [searchQuery, selectedRole, selectedClub, allUsers]);

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
      // ============================================================
      // ТОЛЬКО АДМИН И КООРДИНАТОР ДВИЖЕНИЯ МОГУТ СОЗДАВАТЬ
      // ============================================================
      if (profile?.role !== 'admin' && profile?.role !== 'movement_coordinator') {
        setMessage('❌ У вас нет прав для создания пользователей');
        setMessageType('error');
        setLoading(false);
        return;
      }

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

      setForm({
        full_name: '',
        email: '',
        role: 'participant',
        phone: '',
        school: '',
        class_name: '',
        club_id: ''
      });

      const usersData = await api.getUsers();
      setAllUsers(usersData || []);
      setUsers(usersData || []);

      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    // ============================================================
    // ТОЛЬКО АДМИН И КООРДИНАТОР ДВИЖЕНИЯ МОГУТ МЕНЯТЬ РОЛИ
    // ============================================================
    if (profile?.role !== 'admin' && profile?.role !== 'movement_coordinator') {
      setMessage('❌ У вас нет прав для изменения ролей');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!confirm(`Изменить роль пользователя на ${newRole}?`)) return;

    try {
      const result = await api.updateUserRole(userId, newRole);
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Роль изменена');
      setMessageType('success');

      const usersData = await api.getUsers();
      setAllUsers(usersData || []);
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

  // Кто может создавать пользователей
  const canCreate = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  // Кто может менять роли
  const canChangeRoles = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  // Кто может просматривать
  const canView = profile?.role === 'admin' || 
                  profile?.role === 'movement_coordinator' || 
                  profile?.role === 'president' || 
                  profile?.role === 'vice_president';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>Только администратор, координатор движения, президент и вице-президент</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👥</span>
          <div>
            <h1>Управление пользователями</h1>
            <p>Всего пользователей: {users.length}</p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setShowCreateUser(!showCreateUser);
                setShowPasswordList(false);
                setCreatedUsers([]);
              }}
            >
              {showCreateUser ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* СПИСОК ПАРОЛЕЙ */}
        {showPasswordList && createdUsers.length > 0 && (
          <div className="card" style={{
            background: '#FBF4DC',
            border: '2px solid #C9A227',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0B1F3A' }}>
                🔑 Данные для входа
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={copyPasswords}>
                  📋 Скопировать все
                </button>
                <button className="btn-secondary" onClick={() => {
                  setShowPasswordList(false);
                  setCreatedUsers([]);
                }}>
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
                      <td>
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
                      <td>{getRoleLabel(u.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ */}
        {showCreateUser && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📝 Создать пользователя
            </h3>
            <form onSubmit={handleCreateUser}>
              <div className="grid-2">
                <div className="form-group">
                  <label>ФИО *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="ivan@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Роль *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    required
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
                  <label>Телефон</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>

                <div className="form-group">
                  <label>Школа</label>
                  <input
                    type="text"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="Школа №1"
                  />
                </div>

                <div className="form-group">
                  <label>Класс</label>
                  <input
                    type="text"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    placeholder="8А"
                  />
                </div>

                <div className="form-group">
                  <label>Клуб</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
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
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать пользователя'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateUser(false);
                    setShowPasswordList(false);
                    setCreatedUsers([]);
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по ФИО, email..."
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
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
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '14px', color: '#667085' }}>
            Найдено: <strong>{users.length}</strong>
          </div>
        </div>

        {/* ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Клуб</th>
                <th style={{ textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                    Пользователей не найдено
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '500', color: '#0B1F3A' }}>{u.full_name}</td>
                    <td style={{ color: '#667085' }}>{u.email}</td>
                    <td>
                      {canChangeRoles ? (
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
                      ) : (
                        <span>{getRoleLabel(u.role)}</span>
                      )}
                    </td>
                    <td style={{ color: '#667085' }}>{u.club_name || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
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