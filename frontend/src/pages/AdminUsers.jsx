// frontend/src/pages/AdminUsers.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';
import * as XLSX from 'xlsx';

export default function AdminUsers() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createdUsers, setCreatedUsers] = useState([]);
  const [showPasswordList, setShowPasswordList] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importedUsersList, setImportedUsersList] = useState([]);
  const [showImportedPasswords, setShowImportedPasswords] = useState(false);
  
  // ===== ФИЛЬТРЫ =====
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'participant',
    phone: '',
    school: '',
    class_name: '',
    club_id: '',
    city: '',
    position: '',
    status: 'active'
  });
  const [editingUserId, setEditingUserId] = useState(null);
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
      if (userData.role !== 'admin' && userData.role !== 'movement_coordinator') {
        navigate('/dashboard');
        return;
      }
      setProfile(userData);

      const [usersData, clubsData] = await Promise.all([
        api.getUsers(),
        api.getClubs()
      ]);

      setClubs(clubsData || []);
      setAllUsers(usersData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== ФИЛЬТРАЦИЯ =====
  const filterConfig = [
    {
      key: 'role',
      type: 'select',
      label: 'Роль',
      placeholder: 'Все роли',
      options: [
        { value: 'participant', label: '👤 Участник' },
        { value: 'parent', label: '👨‍👩‍👦 Родитель' },
        { value: 'club_coordinator', label: '🏫 Координатор КЮДа' },
        { value: 'tutor', label: '📚 Тьютор' },
        { value: 'movement_coordinator', label: '⭐ Координатор движения' },
        { value: 'admin', label: '🔧 Администратор' },
        { value: 'president', label: '👑 Президент' },
        { value: 'vice_president', label: '⭐ Вице-президент' }
      ]
    },
    {
      key: 'status',
      type: 'select',
      label: 'Статус',
      placeholder: 'Все статусы',
      options: [
        { value: 'active', label: '🟢 Активен' },
        { value: 'inactive', label: '🔴 Неактивен' },
        { value: 'pending', label: '⏳ Ожидает' }
      ]
    }
  ];

  const getFilteredUsers = () => {
    let filtered = allUsers;

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter(u => u.role === filters.role);
    }

    if (filters.status) {
      filtered = filtered.filter(u => u.status === filters.status);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  // ===== ГЕНЕРАЦИЯ =====
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateEmailFromName = (fullName) => {
    const parts = fullName.trim().split(' ');
    let login = '';
    if (parts.length >= 2) {
      const firstName = parts[0].toLowerCase();
      const lastName = parts[parts.length - 1].toLowerCase();
      const randomNum = Math.floor(Math.random() * 10000);
      login = `${firstName}.${lastName}${randomNum}`;
    } else {
      login = `user${Math.floor(Math.random() * 100000)}`;
    }
    const translit = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    let result = '';
    for (const char of login) {
      if (translit[char]) result += translit[char];
      else result += char;
    }
    return `${result}@dod.local`;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    setCreatedUsers([]);

    try {
      if (!form.full_name || form.full_name.trim().length < 2) {
        setMessage('❌ Пожалуйста, укажите ФИО');
        setMessageType('error');
        setLoading(false);
        return;
      }

      let email = form.email.trim();
      let isAutoGenerated = false;
      if (!email || !isValidEmail(email)) {
        email = generateEmailFromName(form.full_name);
        isAutoGenerated = true;
      }

      const existingUsers = await api.getUsers();
      const existing = existingUsers.find(u => u.email === email);
      if (existing) {
        const randomSuffix = Math.floor(Math.random() * 10000);
        const baseEmail = email.split('@')[0];
        const domain = email.split('@')[1] || 'dod.local';
        email = `${baseEmail}${randomSuffix}@${domain}`;
        isAutoGenerated = true;
      }

      const password = generatePassword();
      const createData = {
        full_name: form.full_name.trim(),
        email: email,
        role: form.role,
        phone: form.phone || '',
        school: form.school || '',
        class_name: form.class_name || '',
        club_id: form.club_id || '',
        status: form.status || 'active',
        password: password
      };

      const result = await api.createUser(createData);
      if (result.error) throw new Error(result.error);

      setCreatedUsers([{
        full_name: form.full_name.trim(),
        email: email,
        password: result.generated_password || password,
        role: form.role,
        is_auto_generated: isAutoGenerated
      }]);
      setShowPasswordList(true);
      setMessage(`✅ Пользователь "${form.full_name}" создан!`);
      setMessageType('success');
      
      setForm({
        full_name: '',
        email: '',
        role: 'participant',
        phone: '',
        school: '',
        class_name: '',
        club_id: '',
        city: '',
        position: '',
        status: 'active'
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

  const copyPasswords = () => {
    const data = createdUsers.length > 0 ? createdUsers : importedUsersList;
    let text = '=== ДАННЫЕ ДЛЯ ВХОДА ===\n\n';
    data.forEach(u => {
      text += `ФИО: ${u.full_name}\nЛогин: ${u.email}\nПароль: ${u.password}\nРоль: ${u.role}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setMessage('✅ Данные скопированы!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportPasswordsToExcel = () => {
    const data = createdUsers.length > 0 ? createdUsers : importedUsersList;
    if (data.length === 0) {
      setMessage('❌ Нет данных для экспорта');
      setMessageType('error');
      return;
    }
    const exportData = data.map(u => ({
      'ФИО': u.full_name,
      'Логин': u.email,
      'Пароль': u.password,
      'Роль': u.role
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Пароли');
    ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 20 }];
    XLSX.writeFile(wb, `Пароли_${new Date().toISOString().slice(0,10)}.xlsx`);
    setMessage('✅ Пароли выгружены в Excel!');
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
      'president': '👑 Президент',
      'vice_president': '⭐ Вице-президент'
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
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👥</span>
          <div>
            <h1>Управление пользователями</h1>
            <p>Всего: {filteredUsers.length}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => setShowImportModal(!showImportModal)}>📥 Импорт</button>
            <button className="btn-primary" onClick={() => { setShowCreateUser(!showCreateUser); setShowPasswordList(false); setCreatedUsers([]); }}>
              {showCreateUser ? '✖ Закрыть' : '➕ Создать'}
            </button>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setSearchQuery}
          searchPlaceholder="🔍 Поиск по ФИО, email, школе..."
        >
          <div style={{ fontSize: '14px', color: '#667085', padding: '6px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
            Найдено: <strong>{filteredUsers.length}</strong>
          </div>
        </FilterBar>

        {(showPasswordList && createdUsers.length > 0) || (showImportedPasswords && importedUsersList.length > 0) ? (
          <div className="card" style={{ padding: '24px', marginBottom: '24px', background: '#FBF4DC', border: '2px solid #C9A227' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0B1F3A' }}>🔑 Данные для входа</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={copyPasswords}>📋 Копировать</button>
                <button className="btn-primary" onClick={exportPasswordsToExcel}>📊 Excel</button>
                <button className="btn-secondary" onClick={() => { setShowPasswordList(false); setShowImportedPasswords(false); setCreatedUsers([]); setImportedUsersList([]); }}>✖ Закрыть</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead><tr style={{ background: '#F4F6F9' }}><th style={{ padding: '8px 12px', textAlign: 'left' }}>ФИО</th><th style={{ padding: '8px 12px', textAlign: 'left' }}>Логин</th><th style={{ padding: '8px 12px', textAlign: 'left' }}>Пароль</th><th style={{ padding: '8px 12px', textAlign: 'left' }}>Роль</th></tr></thead>
                <tbody>
                  {(createdUsers.length > 0 ? createdUsers : importedUsersList).map((u, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #E2E7EF' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td><code style={{ background: '#F4F6F9', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>{u.password}</code></td>
                      <td>{getRoleLabel(u.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {showCreateUser && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>📝 Создать пользователя</h3>
            <form onSubmit={handleSubmitUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div className="form-group"><label>ФИО *</label><input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="Иванов Иван Иванович" /></div>
                <div className="form-group"><label>Роль *</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                  <option value="participant">👤 Участник</option><option value="parent">👨‍👩‍👦 Родитель</option>
                  <option value="club_coordinator">🏫 Координатор КЮДа</option><option value="tutor">📚 Тьютор</option>
                  <option value="movement_coordinator">⭐ Координатор движения</option><option value="admin">🔧 Администратор</option>
                  <option value="president">👑 Президент</option><option value="vice_president">⭐ Вице-президент</option>
                </select></div>
                <div className="form-group"><label>Email (необязательно)</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ivan@example.com" /></div>
                <div className="form-group"><label>Телефон</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 999 123 45 67" /></div>
                <div className="form-group"><label>Школа</label><input type="text" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="Школа №1" /></div>
                <div className="form-group"><label>Класс</label><input type="text" value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="8А" /></div>
                <div className="form-group"><label>Клуб</label><select value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}><option value="">Без клуба</option>{clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label>Статус</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">🟢 Активен</option><option value="inactive">🔴 Неактивен</option><option value="pending">⏳ Ожидает</option></select></div>
              </div>
              <div style={{ marginTop: '12px' }}><p style={{ fontSize: '13px', color: '#667085' }}>🔑 Пароль будет сгенерирован автоматически</p></div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn-success" disabled={loading}>{loading ? '⏳' : '✅ Создать'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateUser(false)}>❌ Отмена</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead><tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Клуб</th><th>Статус</th><th style={{ textAlign: 'center' }}>Действия</th></tr></thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>Пользователей не найдено</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '500' }}>{u.full_name}</td>
                    <td style={{ color: '#667085' }}>{u.email}</td>
                    <td>{getRoleLabel(u.role)}</td>
                    <td style={{ color: '#667085' }}>{clubs.find(c => c.id === u.club_id)?.name || '—'}</td>
                    <td><span className={u.status === 'active' ? 'status-active' : 'status-inactive'}>
                      {u.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                    </span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => navigate(`/participant/${u.id}`)}>👁️</button>
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