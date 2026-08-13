// frontend/src/pages/AdminUsers.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import * as XLSX from 'xlsx';

export default function AdminUsers() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
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
      
      // Собираем уникальные города из клубов
      const uniqueCities = [...new Set(clubsData.map(c => c.city).filter(Boolean))];
      setCities(uniqueCities);

      setAllUsers(usersData || []);
      setUsers(usersData || []);
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
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedRole) {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    if (selectedClub) {
      filtered = filtered.filter(u => u.club_id === selectedClub);
    }

    if (selectedCity) {
      filtered = filtered.filter(u => {
        const userClub = clubs.find(c => c.id === u.club_id);
        return userClub?.city === selectedCity;
      });
    }

    setUsers(filtered);
  }, [searchQuery, selectedRole, selectedClub, selectedCity, allUsers, clubs]);

  // ============================================================
  // ГЕНЕРАЦИЯ ПАРОЛЯ
  // ============================================================
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // ============================================================
  // ГЕНЕРАЦИЯ EMAIL ИЗ ФИО
  // ============================================================
  const generateEmailFromName = (fullName) => {
    const parts = fullName.trim().split(' ');
    let login = '';
    if (parts.length >= 2) {
      const firstName = parts[0].toLowerCase();
      const lastName = parts[parts.length - 1].toLowerCase();
      const cleanFirstName = firstName.replace(/[^a-zа-яё]/g, '');
      const cleanLastName = lastName.replace(/[^a-zа-яё]/g, '');
      const randomNum = Math.floor(Math.random() * 10000);
      login = `${cleanFirstName}.${cleanLastName}${randomNum}`;
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
      if (translit[char]) {
        result += translit[char];
      } else {
        result += char;
      }
    }
    return `${result}@dod.local`;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ============================================================
  // СОЗДАНИЕ/РЕДАКТИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ
  // ============================================================
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    setCreatedUsers([]);

    try {
      if (!form.full_name || form.full_name.trim().length < 2) {
        setMessage('❌ Пожалуйста, укажите ФИО (минимум 2 символа)');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (!form.role) {
        setMessage('❌ Пожалуйста, выберите роль');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (profile?.role !== 'admin' && profile?.role !== 'movement_coordinator') {
        setMessage('❌ У вас нет прав для управления пользователями');
        setMessageType('error');
        setLoading(false);
        return;
      }

      let result;
      const userData = {
        full_name: form.full_name.trim(),
        role: form.role,
        phone: form.phone || '',
        school: form.school || '',
        class_name: form.class_name || '',
        club_id: form.club_id || '',
        status: form.status || 'active'
      };

      if (editingUserId) {
        // Редактирование
        result = await api.updateUser(editingUserId, userData);
        if (result.error) throw new Error(result.error);
        setMessage(`✅ Пользователь "${form.full_name}" обновлён!`);
      } else {
        // Создание
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
          ...userData,
          email: email,
          password: password
        };

        result = await api.createUser(createData);
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
      }

      setMessageType('success');
      resetForm();
      
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

  const resetForm = () => {
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
    setEditingUserId(null);
    setShowCreateUser(false);
    setCreatedUsers([]);
    setShowPasswordList(false);
  };

  const handleEditUser = (user) => {
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'participant',
      phone: user.phone || '',
      school: user.school || '',
      class_name: user.class_name || '',
      club_id: user.club_id || '',
      city: user.city || '',
      position: user.position || '',
      status: user.status || 'active'
    });
    setEditingUserId(user.id);
    setShowCreateUser(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================
  // УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
  // ============================================================
  const handleDeleteUser = async (userId, fullName) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${fullName}"? Это действие нельзя отменить!`)) {
      return;
    }

    setLoading(true);
    setMessage('');

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
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ИМПОРТ УЧАСТНИКОВ ИЗ EXCEL
  // ============================================================
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
          city: row.city || '',
          birth_date: row.birth_date || '',
          role: row.role || 'participant'
        }));

        setImportPreview(formattedData);
        setMessage(`✅ Загружено ${formattedData.length} записей. Проверьте данные и нажмите "Импортировать".`);
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
    setMessage('');
    const importedList = [];
    const errorList = [];

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

        // Находим клуб по названию
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

        if (result.error) {
          errorList.push(`❌ ${row.full_name} — ${result.error}`);
          continue;
        }

        importedList.push({
          full_name: row.full_name,
          email: email,
          password: result.generated_password || password,
          role: row.role || 'participant',
          club: row.club || '—',
          is_auto_generated: isAutoGenerated
        });
      } catch (err) {
        errorList.push(`❌ ${row.full_name} — ${err.message}`);
      }
    }

    setImportedUsersList(importedList);
    setShowImportedPasswords(true);
    setImportPreview([]);
    setImportFile(null);

    if (errorList.length === 0) {
      setMessage(`✅ Успешно импортировано ${importedList.length} участников!`);
      setMessageType('success');
    } else {
      setMessage(`⚠️ Импортировано: ${importedList.length}, Ошибок: ${errorList.length}`);
      setMessageType('error');
    }

    const usersData = await api.getUsers();
    setAllUsers(usersData || []);
    setUsers(usersData || []);
    setLoading(false);
  };

  // ============================================================
  // ЭКСПОРТ ПАРОЛЕЙ В EXCEL
  // ============================================================
  const exportPasswordsToExcel = () => {
    if (createdUsers.length === 0 && importedUsersList.length === 0) {
      setMessage('❌ Нет данных для экспорта');
      setMessageType('error');
      return;
    }

    const data = createdUsers.length > 0 ? createdUsers : importedUsersList;
    
    const exportData = data.map(u => ({
      'ФИО': u.full_name,
      'Логин': u.email,
      'Пароль': u.password,
      'Роль': u.role,
      'Примечание': u.is_auto_generated ? 'Логин сгенерирован автоматически' : ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Пароли');
    
    ws['!cols'] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 15 },
      { wch: 20 },
      { wch: 30 }
    ];

    XLSX.writeFile(wb, `Пароли_${new Date().toISOString().slice(0,10)}.xlsx`);
    setMessage('✅ Пароли выгружены в Excel!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  // ============================================================
  // КОПИРОВАНИЕ ДАННЫХ
  // ============================================================
  const copyPasswords = () => {
    const data = createdUsers.length > 0 ? createdUsers : importedUsersList;
    let text = '=== ДАННЫЕ ДЛЯ ВХОДА ===\n\n';
    data.forEach(u => {
      text += `ФИО: ${u.full_name}\n`;
      text += `Логин: ${u.email}\n`;
      text += `Пароль: ${u.password}\n`;
      text += `Роль: ${getRoleLabel(u.role)}\n`;
      if (u.is_auto_generated) {
        text += `⚠️ Логин сгенерирован автоматически\n`;
      }
      if (u.club) {
        text += `🏫 Клуб: ${u.club}\n`;
      }
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    setMessage('✅ Данные скопированы!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  // ============================================================
  // ИЗМЕНЕНИЕ РОЛИ
  // ============================================================
  const handleRoleChange = async (userId, newRole) => {
    if (profile?.role !== 'admin' && profile?.role !== 'movement_coordinator') {
      setMessage('❌ У вас нет прав для изменения ролей');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!confirm(`Изменить роль пользователя на ${newRole}?`)) return;

    try {
      const result = await api.updateUserRole(userId, newRole);
      if (result.error) throw new Error(result.error);

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

  // ============================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================================
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

  const downloadImportTemplate = () => {
    const template = [
      {
        full_name: 'Иванов Иван Иванович',
        email: 'ivan@example.com',
        phone: '+7 999 123 45 67',
        school: 'Школа №1',
        class_name: '8А',
        club: 'КЮД Москва',
        city: 'Москва',
        birth_date: '2010-01-15',
        role: 'participant'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Участники');
    
    ws['!cols'] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.writeFile(wb, 'Шаблон_импорта_участников.xlsx');
  };

  const canCreate = profile?.role === 'admin' || profile?.role === 'movement_coordinator';
  const canChangeRoles = profile?.role === 'admin' || profile?.role === 'movement_coordinator';
  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator';
  const canView = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

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
            <p style={{ color: '#667085' }}>Только администратор или координатор движения</p>
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowImportModal(!showImportModal)}
            >
              📥 Импорт
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowCreateUser(!showCreateUser);
                setShowPasswordList(false);
                setCreatedUsers([]);
              }}
            >
              {showCreateUser ? '✖ Закрыть' : '➕ Создать'}
            </button>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ============================================================
            ИМПОРТ ИЗ EXCEL
            ============================================================ */}
        {showImportModal && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📥 Массовый импорт участников
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button className="btn-secondary" onClick={downloadImportTemplate}>
                📄 Скачать шаблон
              </button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                style={{ padding: '8px', border: '1px solid #D5DCE7', borderRadius: '8px' }}
              />
            </div>

            {importPreview.length > 0 && (
              <div>
                <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '12px' }}>
                  <table className="table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>ФИО</th>
                        <th>Email</th>
                        <th>Школа</th>
                        <th>Класс</th>
                        <th>Клуб</th>
                      </tr>
                    </thead>
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
                    {loading ? '⏳ Импорт...' : `✅ Импортировать ${importPreview.length} участников`}
                  </button>
                  <button className="btn-secondary" onClick={() => {
                    setImportPreview([]);
                    setImportFile(null);
                    setShowImportModal(false);
                  }}>
                    ❌ Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            СПИСОК ПАРОЛЕЙ
            ============================================================ */}
        {(showPasswordList && createdUsers.length > 0) || (showImportedPasswords && importedUsersList.length > 0) ? (
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
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={copyPasswords}>
                  📋 Копировать
                </button>
                <button className="btn-primary" onClick={exportPasswordsToExcel}>
                  📊 Excel
                </button>
                <button className="btn-secondary" onClick={() => {
                  setShowPasswordList(false);
                  setShowImportedPasswords(false);
                  setCreatedUsers([]);
                  setImportedUsersList([]);
                }}>
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
                      <td>
                        {u.email}
                        {u.is_auto_generated && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: '#EAF2FA',
                            color: '#174A7E',
                            borderRadius: '4px'
                          }}>
                            Авто
                          </span>
                        )}
                      </td>
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
                      <td>{u.club || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#EAF2FA',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#174A7E'
            }}>
              💡 Скопируйте данные или выгрузите в Excel для раздачи пользователям.
            </div>
          </div>
        ) : null}

        {/* ============================================================
            ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ПОЛЬЗОВАТЕЛЯ
            ============================================================ */}
        {showCreateUser && canCreate && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              {editingUserId ? '✏️ Редактировать пользователя' : '📝 Создать пользователя'}
            </h3>

            <div style={{
              padding: '8px 12px',
              marginBottom: '16px',
              background: '#EAF2FA',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#174A7E'
            }}>
              ⚠️ Поля <strong>ФИО</strong> и <strong>Роль</strong> обязательны для заполнения
            </div>

            <form onSubmit={handleSubmitUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div className="form-group" style={{ border: '2px solid #C9A227', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ fontWeight: '600', color: '#0B1F3A' }}>
                    ФИО <span style={{ color: '#B3262E' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                    style={{ border: '1.5px solid #C9A227' }}
                  />
                </div>

                <div className="form-group" style={{ border: '2px solid #C9A227', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ fontWeight: '600', color: '#0B1F3A' }}>
                    Роль <span style={{ color: '#B3262E' }}>*</span>
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    required
                    style={{ border: '1.5px solid #C9A227' }}
                  >
                    <option value="participant">👤 Участник</option>
                    <option value="parent">👨‍👩‍👦 Родитель</option>
                    <option value="club_coordinator">🏫 Координатор КЮДа</option>
                    <option value="tutor">📚 Тьютор</option>
                    <option value="movement_coordinator">⭐ Координатор движения</option>
                    <option value="admin">🔧 Администратор</option>
                    <option value="president">👑 Президент ДОД</option>
                    <option value="vice_president">⭐ Вице-президент ДОД</option>
                  </select>
                </div>

                {!editingUserId && (
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
                )}

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

                <div className="form-group">
                  <label>Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">🔴 Неактивен</option>
                    <option value="pending">⏳ Ожидает</option>
                  </select>
                </div>

                {editingUserId && (
                  <div className="form-group">
                    <label>Email (не редактируется)</label>
                    <input
                      type="email"
                      value={form.email}
                      disabled
                      style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
                    />
                  </div>
                )}
              </div>

              {!editingUserId && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#667085' }}>
                    🔑 Пароль будет сгенерирован автоматически и показан после создания
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingUserId ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            ФИЛЬТРЫ
            ============================================================ */}
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
              placeholder="🔍 Поиск по ФИО, email, школе..."
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
              <option value="president">Президент</option>
              <option value="vice_president">Вице-президент</option>
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

          {cities.length > 0 && (
            <div style={{ minWidth: '150px' }}>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ fontSize: '14px', color: '#667085' }}>
            Найдено: <strong>{users.length}</strong>
          </div>
        </div>

        {/* ============================================================
            ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
            ============================================================ */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Клуб</th>
                <th>Город</th>
                <th>Статус</th>
                <th style={{ textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                    Пользователей не найдено
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const userClub = clubs.find(c => c.id === u.club_id);
                  return (
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
                            <option value="president">Президент</option>
                            <option value="vice_president">Вице-президент</option>
                          </select>
                        ) : (
                          <span>{getRoleLabel(u.role)}</span>
                        )}
                      </td>
                      <td style={{ color: '#667085' }}>{userClub?.name || '—'}</td>
                      <td style={{ color: '#667085' }}>{userClub?.city || '—'}</td>
                      <td>
                        <span className={u.status === 'active' ? 'status-active' : u.status === 'pending' ? 'status-pending' : 'status-inactive'}>
                          {u.status === 'active' ? '🟢 Активен' : u.status === 'pending' ? '⏳ Ожидает' : '🔴 Неактивен'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => navigate(`/participant/${u.id}`)}
                          >
                            👁️
                          </button>
                          {canCreate && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#EAF2FA', color: '#174A7E' }}
                              onClick={() => handleEditUser(u)}
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && u.id !== profile?.id && (
                            <button
                              className="btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}