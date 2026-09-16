// frontend/src/pages/Achievements.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { confirmAction } from '../lib/confirm';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

export default function Achievements() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  
  // ===== ПАГИНАЦИЯ =====
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    achievement_date: '',
    participant_id: ''
  });
  const [editingAchievement, setEditingAchievement] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      const role = userData.role;
      const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'];
      if (!allowedRoles.includes(role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // ============================================================
      // ЗАГРУЗКА С ПАГИНАЦИЕЙ
      // ============================================================
      const [participantsData, clubsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getClubs(),
        api.getAchievements({ page, limit: pagination.limit })
      ]);

      setClubs(clubsData || []);
      setAllParticipants(participantsData || []);

      // Сервер отдаёт список массивом. Раньше здесь читали .data — у
      // массива такого свойства нет, поэтому список всегда выходил
      // пустым, хотя записи в базе были.
      const data = Array.isArray(achievementsData) ? achievementsData : [];
      const meta = { page: 1, limit: data.length || 20, total: data.length, totalPages: 1 };

      let filteredParticipants = [];
      let filteredAchievements = [];

      if (role === 'club_coordinator') {
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          filteredParticipants = participantsData.filter(p => p.club_id === coordinatorClub.id);
          const participantIds = filteredParticipants.map(p => p.id);
          filteredAchievements = data.filter(a => participantIds.includes(a.participant_id));
        } else {
          filteredParticipants = [];
          filteredAchievements = [];
        }
      } else if (['admin', 'movement_coordinator', 'tutor'].includes(role)) {
        filteredParticipants = participantsData;
        filteredAchievements = data;
      } else {
        filteredParticipants = [];
        filteredAchievements = [];
      }

      setParticipants(filteredParticipants);
      setAllParticipants(filteredParticipants);
      setAchievements(filteredAchievements);
      setAllAchievements(filteredAchievements);
      setPagination({
        ...meta,
        total: filteredAchievements.length
      });

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ПАГИНАЦИЯ
  // ============================================================
  const Pagination = ({ pagination, onPageChange }) => {
    const { page, totalPages, total } = pagination;

    if (totalPages <= 1) return null;

    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ◀
        </button>
        
        {pages.map((p) => (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ▶
        </button>
        
        <span className="pagination-info">
          Всего: {total} записей
        </span>
      </div>
    );
  };

  const filterConfig = [
    {
      key: 'club_id',
      type: 'select',
      label: 'Клуб',
      placeholder: 'Все КЮДы',
      options: clubs.map(c => ({ value: c.id, label: c.name }))
    },
    {
      key: 'is_club_award',
      type: 'checkbox',
      label: 'Клубные награды'
    },
    {
      key: 'is_tutor_award',
      type: 'checkbox',
      label: 'Награды тьютора'
    }
  ];

  const getFilteredAchievements = () => {
    let filtered = allAchievements;

    if (filterSearch) {
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        a.description?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        a.participant_name?.toLowerCase().includes(filterSearch.toLowerCase())
      );
    }

    if (filters.club_id) {
      const clubParticipantIds = allParticipants
        .filter(p => p.club_id === filters.club_id)
        .map(p => p.id);
      filtered = filtered.filter(a => clubParticipantIds.includes(a.participant_id));
    }

    if (filters.is_club_award) {
      filtered = filtered.filter(a => a.is_club_award === true);
    }

    if (filters.is_tutor_award) {
      filtered = filtered.filter(a => a.is_tutor_award === true);
    }

    return filtered;
  };

  const filteredAchievements = getFilteredAchievements();

  const canManage = profile && ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'].includes(profile.role);
  const canEdit = profile && ['admin', 'movement_coordinator'].includes(profile.role);
  const canDelete = profile && ['admin'].includes(profile.role);
  const isAdmin = profile?.role === 'admin';
  // Фильтр по КЮДу нужен тем, кто видит больше одного клуба. Переменную
  // использовали в разметке ниже, а объявить забыли — страница падала
  // белым экраном у всех, кто её открывал
  const canFilterByClub = ['admin', 'movement_coordinator', 'president', 'vice_president', 'tutor']
    .includes(profile?.role);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length === 0) {
      setShowDropdown(false);
      setSelectedParticipant(null);
      return;
    }

    const filtered = allParticipants.filter(p =>
      p.full_name?.toLowerCase().includes(query.toLowerCase())
    );
    setParticipants(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant);
    setSearchQuery(participant.full_name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!selectedParticipant) {
        setMessage('Пожалуйста, выберите участника');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const data = {
        participant_id: selectedParticipant.id,
        title: form.title,
        description: form.description || '',
        achievement_date: form.achievement_date || new Date().toISOString().split('T')[0]
      };

      let result;
      if (editingAchievement) {
        if (!canEdit) {
          throw new Error('У вас нет прав для редактирования');
        }
        const response = await fetch(`https://dod-backend.relaxdev.ru/api/achievements/${editingAchievement.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
      } else {
        result = await api.addAchievement(data);
      }

      if (result.error) {
        throw new Error(api.describeApiError(result));
      }

      setMessage(editingAchievement ? 'Достижение обновлено!' : 'Достижение добавлено!');
      setMessageType('success');
      resetForm();
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      achievement_date: '',
      participant_id: ''
    });
    setSelectedParticipant(null);
    setSearchQuery('');
    setEditingAchievement(null);
    setShowForm(false);
  };

  const handleEdit = (achievement) => {
    if (!canEdit) {
      setMessage('У вас нет прав для редактирования');
      setMessageType('error');
      return;
    }
    setEditingAchievement(achievement);
    setForm({
      title: achievement.title || '',
      description: achievement.description || '',
      achievement_date: achievement.achievement_date || '',
      participant_id: achievement.participant_id || ''
    });
    const participant = allParticipants.find(p => p.id === achievement.participant_id);
    if (participant) {
      setSelectedParticipant(participant);
      setSearchQuery(participant.full_name);
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage('У вас нет прав для удаления');
      setMessageType('error');
      return;
    }
    if (!await confirmAction({ title: 'Удалить достижение?', tone: 'danger' })) return;
    try {
      const result = await api.deleteAchievement(id);
      if (result.error) throw new Error(api.describeApiError(result));
      setMessage('Достижение удалено');
      setMessageType('success');
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
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
            background: var(--color-gray-100);
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid var(--color-gray-200);
            border-top-color: var(--color-gold);
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

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ============================================================
           ЗАГОЛОВОК
           ============================================================ */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Достижения</h1>
            <p>Всего: {filteredAchievements.length}</p>
          </div>
          {canManage && (
            <button
              className="btn-gold"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Закрыть' : 'Добавить достижение'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {canFilterByClub && clubs.length > 0 && (
          <div className="filter-club">
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
            <span className="filter-info">
              {selectedClubId ? (
                <span><Icon name="filter" size={14} /> Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>Все достижения</span>
              )}
            </span>
            {selectedClubId && (
              <button
                className="filter-clear"
                onClick={() => setSelectedClubId('')}
              >
                Сбросить
              </button>
            )}
          </div>
        )}

        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setFilterSearch}
          searchPlaceholder="Поиск по названию, описанию, участнику..."
        >
          <div className="filter-count">
            Найдено: <strong>{filteredAchievements.length}</strong>
          </div>
        </FilterBar>

        {showForm && canManage && (
          <div className="card form-card">
            <h3>{editingAchievement ? 'Редактировать достижение' : 'Добавить достижение'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Участник *</label>
                <div className="participant-search">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Начните вводить фамилию участника..."
                    required
                    disabled={!!editingAchievement && !isAdmin}
                  />
                  {showDropdown && participants.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="participant-dropdown"
                    >
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="participant-option"
                          onClick={() => handleSelectParticipant(p)}
                        >
                          <div className="participant-option-name">{p.full_name}</div>
                          <div className="participant-option-info">
                            {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedParticipant && (
                  <div className="participant-selected">
                    Выбран: <strong>{selectedParticipant.full_name}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedParticipant(null);
                        setSearchQuery('');
                        setForm({ ...form, participant_id: '' });
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Название достижения *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Победитель олимпиады"
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Подробное описание достижения..."
                />
              </div>

              <div className="form-group">
                <label>Дата</label>
                <input
                  type="date"
                  value={form.achievement_date}
                  onChange={(e) => setForm({ ...form, achievement_date: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-success" disabled={loading || !selectedParticipant}>
                  {loading ? 'Сохранение...' : editingAchievement ? 'Обновить' : 'Добавить'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-header-simple">
            <h3>Все достижения</h3>
            <span className="card-count">{filteredAchievements.length} достижений</span>
          </div>

          {filteredAchievements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="trophy" /></div>
              <p>Достижений пока нет</p>
            </div>
          ) : (
            <div className="achievements-list">
              {filteredAchievements.map((a) => {
                const userCanEdit = canEdit;
                const userCanDelete = canDelete;
                
                return (
                  <div
                    key={a.id}
                    className="achievement-item"
                    style={{
                      borderLeftColor: a.is_club_award ? 'var(--color-gold)' : 
                                     a.is_tutor_award ? 'var(--color-primary-light)' : 'var(--color-primary)'
                    }}
                  >
                    <div className="achievement-title">
                      <span className="achievement-icon">
                        <Icon name={a.is_club_award ? 'club' : a.is_tutor_award ? 'book' : 'trophy'} size={20} />
                      </span>
                      {a.title}
                      {a.is_club_award && (
                        <span className="tag tag-gold">Клубная</span>
                      )}
                      {a.is_tutor_award && (
                        <span className="tag tag-blue">Тьюторская</span>
                      )}
                    </div>
                    <div className="achievement-subtitle">
                      {a.participant_name || 'Участник'}
                      {a.achievement_date && ` • ${new Date(a.achievement_date).toLocaleDateString('ru-RU')}`}
                    </div>
                    {a.description && <div className="achievement-description">{a.description}</div>}
                    
                    {(userCanEdit || userCanDelete) && (
                      <div className="achievement-actions">
                        {userCanEdit && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleEdit(a)}
                          >
                            Редактировать
                          </button>
                        )}
                        {userCanDelete && (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(a.id)}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* ============================================================
             ПАГИНАЦИЯ
             ============================================================ */}
          <Pagination pagination={pagination} onPageChange={loadData} />
        </div>
      </div>

      <Footer />

      <style>{`
        /* ============================================================
           ОСНОВНЫЕ СТИЛИ
           ============================================================ */
        .page-background {
          min-height: 100vh;
          background: var(--color-gray-100);
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
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-primary);
          margin: 0;
        }

        .page-header-left p {
          color: var(--color-gray-500);
          margin: 4px 0 0 0;
        }

        /* ============================================================
           ПАГИНАЦИЯ
           ============================================================ */
        .pagination {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--color-gray-200);
          flex-wrap: wrap;
        }

        .pagination-btn {
          padding: 6px 14px;
          border: 1px solid var(--color-gray-200);
          border-radius: 6px;
          background: white;
          color: var(--color-primary-dark);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          min-width: 36px;
          text-align: center;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: var(--color-gold);
          background: var(--color-gold-pale);
        }

        .pagination-btn.active {
          border-color: var(--color-gold);
          background: var(--color-gold);
          color: white;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 13px;
          color: var(--color-gray-400);
          margin-left: 8px;
        }

        @media (max-width: 768px) {
          .pagination-btn {
            padding: 4px 10px;
            font-size: 12px;
            min-width: 30px;
          }
          .pagination-info {
            font-size: 12px;
          }
        }

        /* ============================================================
           ФИЛЬТР
           ============================================================ */
        .filter-count {
          font-size: 14px;
          color: var(--color-gray-500);
          padding: 6px 16px;
          background: var(--color-gray-50);
          border-radius: 20px;
          border: 1px solid var(--color-gray-200);
          white-space: nowrap;
        }

        .filter-club {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-club select {
          min-width: 200px;
          padding: 10px 14px;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          background: white;
        }

        .filter-info {
          font-size: 14px;
          color: var(--color-gray-500);
        }

        .filter-clear {
          padding: 4px 12px;
          background: var(--color-error-bg);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: var(--color-error);
        }
        .filter-clear:hover {
          background: var(--color-error-bg);
        }

        /* ============================================================
           КНОПКИ
           ============================================================ */





        /* ============================================================
           КАРТОЧКИ
           ============================================================ */
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid var(--color-gray-200);
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 20px;
        }

        .card-header-simple {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-header-simple h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-primary);
          margin: 0;
        }

        .card-count {
          font-size: 13px;
          color: var(--color-gray-500);
        }

        /* ============================================================
           ФОРМА
           ============================================================ */
        .form-card {
          margin-bottom: 24px;
        }

        .form-card h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          color: var(--color-primary);
          margin-bottom: 4px;
          font-size: 13px;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
          color: var(--color-primary);
        }
        .form-group input:focus,
        .form-group textarea:focus {
          border-color: var(--color-gold);
          box-shadow: 0 0 0 3px rgba(201,162,39,0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        /* ============================================================
           ПОИСК УЧАСТНИКА
           ============================================================ */
        .participant-search {
          position: relative;
        }

        .participant-search input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
          color: var(--color-primary);
        }

        .participant-search input:focus {
          border-color: var(--color-gold);
          box-shadow: 0 0 0 3px rgba(201,162,39,0.1);
        }

        .participant-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid var(--color-gray-200);
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.12);
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
        }

        .participant-option {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid var(--color-gray-100);
          transition: background 0.15s ease;
        }

        .participant-option:hover {
          background: var(--color-gray-100);
        }

        .participant-option:last-child {
          border-bottom: none;
        }

        .participant-option-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--color-primary);
        }

        .participant-option-info {
          font-size: 12px;
          color: var(--color-gray-500);
        }

        .participant-selected {
          margin-top: 6px;
          padding: 6px 12px;
          background: var(--color-success-bg);
          border-radius: 6px;
          font-size: 13px;
          color: var(--color-success);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .participant-selected button {
          background: none;
          border: none;
          color: var(--color-error);
          cursor: pointer;
          margin-left: auto;
          font-size: 16px;
        }

        /* ============================================================
           СПИСОК ДОСТИЖЕНИЙ
           ============================================================ */
        .achievements-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .achievement-item {
          padding: 14px 18px;
          border-left: 3px solid var(--color-primary);
          background: var(--color-gray-50);
          border-radius: 0 8px 8px 0;
          transition: all 0.2s ease;
        }

        .achievement-item:hover {
          background: var(--color-gray-100);
          transform: translateX(4px);
        }

        .achievement-title {
          font-weight: 600;
          color: var(--color-primary);
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .achievement-icon {
          margin-right: 4px;
        }

        .achievement-subtitle {
          font-size: 13px;
          color: var(--color-gray-500);
          margin-top: 2px;
        }

        .achievement-description {
          font-size: 12px;
          color: var(--color-gray-400);
          margin-top: 4px;
        }

        .achievement-actions {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* ============================================================
           ТЕГИ
           ============================================================ */
        .tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }

        .tag-gold {
          background: var(--color-gold-pale);
          color: var(--color-gold-dark);
        }

        .tag-blue {
          background: var(--color-info-bg);
          color: var(--color-primary-light);
        }

        /* ============================================================
           СООБЩЕНИЯ
           ============================================================ */
        .message-success {
          padding: 12px 16px;
          background: var(--color-success-bg);
          color: var(--color-success);
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid var(--color-success);
        }

        .message-error {
          padding: 12px 16px;
          background: var(--color-error-bg);
          color: var(--color-error);
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid var(--color-error);
        }

        /* ============================================================
           EMPTY STATE
           ============================================================ */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state p {
          color: var(--color-gray-500);
          font-size: 14px;
        }

        /* ============================================================
           СПИННЕР
           ============================================================ */
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-gray-200);
          border-top-color: var(--color-gold);
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
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }
          .page-header .btn-gold {
            width: 100%;
            justify-content: center;
          }

          .card {
            padding: 16px;
          }

          .filter-club {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-club select {
            min-width: unset;
          }

          .achievement-item {
            padding: 12px 14px;
          }
          .achievement-title {
            font-size: 14px;
          }

          .pagination-btn {
            padding: 4px 10px;
            font-size: 12px;
            min-width: 30px;
          }
          .pagination-info {
            font-size: 12px;
          }

          .participant-dropdown {
            max-height: 150px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .page-header-left h1 {
            font-size: 20px;
          }



          .achievement-actions {
            flex-direction: column;
          }
          .achievement-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .form-actions {
            flex-direction: column;
          }
          .form-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .pagination {
            gap: 4px;
          }
          .pagination-btn {
            padding: 3px 8px;
            font-size: 11px;
            min-width: 26px;
          }

          .participant-selected {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}