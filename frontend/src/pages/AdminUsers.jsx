// frontend/src/pages/AdminUsers.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';
import AssignClubModal from '../components/AssignClubModal';
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
  
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showParentChildModal, setShowParentChildModal] = useState(false);
  const [parentChildForm, setParentChildForm] = useState({ parent_id: '', child_id: '' });
  const [availableParents, setAvailableParents] = useState([]);
  const [availableChildren, setAvailableChildren] = useState([]);
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserFullName, setSelectedUserFullName] = useState('');
  
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
      
      const parents = usersData.filter(u => u.role === 'parent');
      const children = usersData.filter(u => u.role === 'participant');
      setAvailableParents(parents);
      setAvailableChildren(children);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const isAdmin = profile?.role === 'admin';
  const canCreate = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

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

  const handleDeleteUser = async (userId, fullName) => {
    if (!isAdmin) {
      setMessage('❌ У вас нет прав для удаления пользователей');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить пользователя "${fullName}"?`)) return;

    try {
      const result = await api.deleteUser(userId);
      if (result.error) throw new Error(result.error);

      setMessage(`✅ Пользователь "${fullName}" удалён`);
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

  const handleResetPassword = async (userId, fullName) => {
    if (!isAdmin) {
      setMessage('❌ У вас нет прав для сброса пароля');
      setMessageType('error');
      return;
    }

    if (!confirm(`Сбросить пароль для "${fullName}"?`)) return;

    try {
      const result = await api.resetUserPassword(userId);
      if (result.error) throw new Error(result.error);
      
      setMessage(`✅ Пароль для "${fullName}" сброшен. Новый пароль: ${result.new_password}`);
      setMessageType('success');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleAddParentChild = async () => {
    if (!parentChildForm.parent_id || !parentChildForm.child_id) {
      setMessage('❌ Выберите родителя и ребёнка');
      setMessageType('error');
      return;
    }

    try {
      const result = await api.addParentChild({
        parent_id: parentChildForm.parent_id,
        child_id: parentChildForm.child_id
      });
      if (result.error) throw new Error(result.error);
      setMessage('✅ Ребёнок привязан к родителю!');
      setMessageType('success');
      setShowParentChildModal(false);
      setParentChildForm({ parent_id: '', child_id: '' });
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    setCreatedUsers([]);
    setShowPasswordList(false);

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

      const newUserData = {
        full_name: form.full_name.trim(),
        email: email,
        password: result.generated_password || password,
        role: form.role,
        is_auto_generated: isAutoGenerated,
        club: clubs.find(c => c.id === form.club_id)?.name || '—'
      };

      setCreatedUsers([newUserData]);
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
    if (data.length === 0) {
      setMessage('❌ Нет данных для копирования');
      setMessageType('error');
      return;
    }
    let text = '=== ДАННЫЕ ДЛЯ ВХОДА ===\n\n';
    data.forEach(u => {
      text += `ФИО: ${u.full_name}\n`;
      text += `Логин: ${u.email}\n`;
      text += `Пароль: ${u.password}\n`;
      text += `Роль: ${getRoleLabel(u.role)}\n`;
      if (u.club && u.club !== '—') text += `🏫 Клуб: ${u.club}\n`;
      if (u.is_auto_generated) text += `⚠️ Логин сгенерирован автоматически\n`;
      text += '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
      setMessage('✅ Данные скопированы в буфер обмена!');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    }).catch(() => {
      setMessage('📋 Скопируйте данные вручную');
      setMessageType('info');
    });
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
      'Роль': getRoleLabel(u.role),
      'Клуб': u.club || '—',
      'Примечание': u.is_auto_generated ? 'Логин сгенерирован автоматически' : ''
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Пароли');
    ws['!cols'] = [
      { wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 30 }
    ];
    XLSX.writeFile(wb, `Пароли_${new Date().toISOString().slice(0,10)}.xlsx`);
    setMessage('✅ Пароли выгружены в Excel!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        const requiredColumns = ['full_name'];
        const firstRow = jsonData[0] || {};
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        if (missingColumns.length > 0) {
          setMessage(`❌ В файле отсутствуют колонки: ${missingColumns.join(', ')}`);
          setMessageType('error');
          return;
        }
        const formattedData = jsonData.map((row, index) => ({
          index: index + 1,
          full_name: row.full_name || '',
          email: row.email || '',
          phone: row.phone || '',
          school: row.school || '',
          class_name: row.class_name || '',
          club: row.club || row.club_name || '',
          birth_date: row.birth_date || '',
          role: row.role || 'participant'
        }));
        setImportPreview(formattedData);
        setMessage(`✅ Загружено ${formattedData.length} записей`);
        setMessageType('success');
      } catch (err) {
        setMessage('❌ Ошибка чтения файла: ' + err.message);
        setMessageType('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportUsers = async () => {
    if (importPreview.length === 0) {
      setMessage('❌ Нет данных для импорта');
      setMessageType('error');
      return;
    }
    if (!confirm(`Импортировать ${importPreview.length} участников?`)) return;
    setLoading(true);
    const importedList = [];
    for (const row of importPreview) {
      try {
        let email = row.email;
        let isAutoGenerated = false;
        if (!email || !isValidEmail(email)) {
          email = generateEmailFromName(row.full_name);
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
        let clubId = null;
        if (row.club) {
          const foundClub = clubs.find(c => 
            c.name.toLowerCase().includes(row.club.toLowerCase()) ||
            row.club.toLowerCase().includes(c.name.toLowerCase())
          );
          if (foundClub) clubId = foundClub.id;
        }
        const password = generatePassword();
        const result = await api.createUser({
          email: email,
          full_name: row.full_name,
          role: row.role || 'participant',
          phone: row.phone || '',
          school: row.school || '',
          class_name: row.class_name || '',
          club_id: clubId || '',
          password: password
        });
        if (result.error) continue;
        importedList.push({
          full_name: row.full_name,
          email: email,
          password: result.generated_password || password,
          role: row.role || 'participant',
          club: row.club || '—',
          is_auto_generated: isAutoGenerated
        });
      } catch (err) {
        console.error('Ошибка импорта:', err);
      }
    }
    setImportedUsersList(importedList);
    if (importedList.length > 0) {
      setShowImportedPasswords(true);
      setMessage(`✅ Импортировано ${importedList.length} участников!`);
      setMessageType('success');
    }
    const usersData = await api.getUsers();
    setAllUsers(usersData || []);
    setUsers(usersData || []);
    setImportPreview([]);
    setImportFile(null);
    setLoading(false);
  };

  const downloadTemplate = () => {
    const template = [{
      full_name: 'Иванов Иван Иванович',
      email: 'ivan@example.com',
      phone: '+7 (999) 123-45-67',
      school: 'Школа №1',
      class_name: '8А',
      club: 'КЮД Москва',
      birth_date: '2010-01-15',
      role: 'participant'
    }];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Участники');
    ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
    XLSX.writeFile(wb, 'Шаблон_импорта_участников.xlsx');
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
        {/* ❌ УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

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
          <div className="card" style={{ 
            padding: '24px', 
            marginBottom: '24px', 
            background: '#FBF4DC', 
            border: '2px solid #C9A227',
            borderRadius: '16px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0B1F3A' }}>
                🔑 Данные для входа
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={copyPasswords} style={{ padding: '6px 16px', fontSize: '13px' }}>
                  📋 Копировать
                </button>
                <button className="btn-primary" onClick={exportPasswordsToExcel} style={{ padding: '6px 16px', fontSize: '13px' }}>
                  📊 Excel
                </button>
                <button className="btn-secondary" onClick={() => { 
                  setShowPasswordList(false); 
                  setShowImportedPasswords(false); 
                  setCreatedUsers([]); 
                  setImportedUsersList([]);
                }} style={{ padding: '6px 16px', fontSize: '13px' }}>
                  ✖ Закрыть
                </button>
              </div>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#F4F6F9' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>ФИО</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Логин</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Пароль</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Роль</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Клуб</th>
                  </tr>
                </thead>
                <tbody>
                  {(createdUsers.length > 0 ? createdUsers : importedUsersList).map((u, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #E2E7EF' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{u.full_name}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {u.email}
                        {u.is_auto_generated && (
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '10px', 
                            padding: '2px 8px', 
                            background: '#EAF2FA', 
                            color: '#174A7E', 
                            borderRadius: '12px' 
                          }}>
                            Авто
                          </span>
                        )}
                      </td>
                      <td>
                        <code style={{ 
                          background: '#F4F6F9', 
                          padding: '2px 10px', 
                          borderRadius: '6px', 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: '#0B1F3A',
                          display: 'inline-block'
                        }}>
                          {u.password}
                        </code>
                      </td>
                      <td>{getRoleLabel(u.role)}</td>
                      <td>{u.club || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ 
              marginTop: '12px', 
              padding: '12px 16px', 
              background: '#EAF2FA', 
              borderRadius: '10px', 
              fontSize: '13px', 
              color: '#174A7E' 
            }}>
              💡 Скопируйте данные или выгрузите в Excel для раздачи пользователям.
            </div>
          </div>
        ) : null}

        {showCreateUser && canCreate && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>📝 Создать пользователя</h3>
            <p style={{ fontSize: '13px', color: '#667085', marginBottom: '16px' }}>
              🔑 Пароль будет сгенерирован автоматически и показан после создания
            </p>
            <form onSubmit={handleSubmitUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label>ФИО <span style={{ color: '#B3262E' }}>*</span></label>
                  <input 
                    type="text" 
                    value={form.full_name} 
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                    required 
                    placeholder="Иванов Иван Иванович" 
                  />
                </div>
                <div className="form-group">
                  <label>Роль <span style={{ color: '#B3262E' }}>*</span></label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                    <option value="participant">👤 Участник</option>
                    <option value="parent">👨‍👩‍👦 Родитель</option>
                    <option value="club_coordinator">🏫 Координатор КЮДа</option>
                    <option value="tutor">📚 Тьютор</option>
                    <option value="movement_coordinator">⭐ Координатор движения</option>
                    <option value="admin">🔧 Администратор</option>
                    <option value="president">👑 Президент</option>
                    <option value="vice_president">⭐ Вице-президент</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Email <span style={{ fontSize: '12px', color: '#98A2B3' }}>(необязательно)</span></label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                    placeholder="ivan@example.com" 
                  />
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    Если не указан, будет сгенерирован автоматически
                  </div>
                </div>
                <div className="form-group">
                  <label>Телефон</label>
                  <input 
                    type="tel" 
                    value={form.phone} 
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                    placeholder="+7 999 123 45 67" 
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
                  <select value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}>
                    <option value="">Без клуба</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Статус</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">🔴 Неактивен</option>
                    <option value="pending">⏳ Ожидает</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateUser(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {showImportModal && (
          <div className="card" style={{ marginBottom: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>📥 Массовый импорт</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button className="btn-secondary" onClick={downloadTemplate}>📄 Скачать шаблон</button>
              <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ padding: '8px', border: '1px solid #D5DCE7', borderRadius: '8px' }} />
            </div>
            {importPreview.length > 0 && (
              <div>
                <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '12px' }}>
                  <table className="table" style={{ fontSize: '12px' }}>
                    <thead><tr><th>#</th><th>ФИО</th><th>Email</th><th>Школа</th><th>Класс</th><th>Клуб</th></tr></thead>
                    <tbody>
                      {importPreview.slice(0, 10).map((row) => (
                        <tr key={row.index}>
                          <td>{row.index}</td>
                          <td>{row.full_name}</td>
                          <td>{row.email || '—'}</td>
                          <td>{row.school || '—'}</td>
                          <td>{row.class_name || '—'}</td>
                          <td>{row.club || '—'}</td>
                        </tr>
                      ))}
                      {importPreview.length > 10 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: '#98A2B3' }}>
                          ... и еще {importPreview.length - 10} записей
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-success" onClick={handleImportUsers} disabled={loading}>
                    {loading ? '⏳ Импорт...' : `✅ Импортировать ${importPreview.length}`}
                  </button>
                  <button className="btn-secondary" onClick={() => { setImportPreview([]); setImportFile(null); setShowImportModal(false); }}>
                    ❌ Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showParentChildModal && (
          <div style={{
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
          }} onClick={() => setShowParentChildModal(false)}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>👨‍👩‍👦 Привязка ребёнка к родителю</h3>
              <p style={{ fontSize: '13px', color: '#667085', marginBottom: '16px' }}>
                Выберите родителя и ребёнка для привязки. После привязки родитель сможет видеть профиль ребёнка.
              </p>
              <div className="form-group">
                <label>Родитель</label>
                <select
                  value={parentChildForm.parent_id}
                  onChange={(e) => setParentChildForm({ ...parentChildForm, parent_id: e.target.value })}
                >
                  <option value="">Выберите родителя</option>
                  {availableParents.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ребёнок</label>
                <select
                  value={parentChildForm.child_id}
                  onChange={(e) => setParentChildForm({ ...parentChildForm, child_id: e.target.value })}
                >
                  <option value="">Выберите ребёнка</option>
                  {availableChildren.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.class_name || 'Класс не указан'})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-success" onClick={handleAddParentChild}>✅ Привязать</button>
                <button className="btn-secondary" onClick={() => setShowParentChildModal(false)}>❌ Отмена</button>
              </div>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Клуб</th>
                <th>Статус</th>
                <th style={{ textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
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
                    <td>
                      <span style={{
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        background: u.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                        color: u.status === 'active' ? '#16845B' : '#B3262E'
                      }}>
                        {u.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          style={{ padding: '4px 10px', background: '#F4F6F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                          onClick={() => navigate(`/participant/${u.id}`)}
                          title="Просмотр профиля"
                        >
                          👁️
                        </button>
                        
                        {isAdmin && (
                          <>
                            <button
                              style={{ padding: '4px 10px', background: '#FBF4DC', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                              onClick={() => handleResetPassword(u.id, u.full_name)}
                              title="Сбросить пароль"
                            >
                              🔑
                            </button>

                            <button
                              style={{ padding: '4px 10px', background: '#6B46C1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: 'white' }}
                              onClick={() => {
                                setSelectedUserId(u.id);
                                setSelectedUserFullName(u.full_name);
                                setShowAssignModal(true);
                              }}
                              title="Прикрепить к КЮДу"
                            >
                              📌
                            </button>

                            <button
                              style={{
                                padding: '4px 10px',
                                background: '#FCEBEC',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#B3262E',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#FED7D7'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#FCEBEC'}
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                              title="Удалить пользователя"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssignClubModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedUserId(null);
          setSelectedUserFullName('');
        }}
        userId={selectedUserId}
        userFullName={selectedUserFullName}
        onAssigned={() => {
          loadData();
        }}
      />
    </div>
  );
}