// frontend/src/pages/Achievements.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';

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

  const loadData = async () => {
    try {
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

      const [participantsData, clubsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getClubs(),
        api.getAchievements()
      ]);

      setClubs(clubsData || []);
      setAllParticipants(participantsData || []);

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
          filteredAchievements = achievementsData.filter(a => participantIds.includes(a.participant_id));
        } else {
          filteredParticipants = [];
          filteredAchievements = [];
        }
      } else if (['admin', 'movement_coordinator', 'tutor'].includes(role)) {
        filteredParticipants = participantsData;
        filteredAchievements = achievementsData;
      } else {
        filteredParticipants = [];
        filteredAchievements = [];
      }

      setAllParticipants(filteredParticipants);
      setParticipants(filteredParticipants);
      setAllAchievements(filteredAchievements);
      setAchievements(filteredAchievements);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
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
      label: '🏫 Клубные награды'
    },
    {
      key: 'is_tutor_award',
      type: 'checkbox',
      label: '📚 Награды тьютора'
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
        setMessage('❌ Пожалуйста, выберите участника');
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
        throw new Error(result.error);
      }

      setMessage(editingAchievement ? '✅ Достижение обновлено!' : '✅ Достижение добавлено!');
      setMessageType('success');
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
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
      setMessage('❌ У вас нет прав для редактирования');
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
      setMessage('❌ У вас нет прав для удаления');
      setMessageType('error');
      return;
    }
    if (!confirm('Удалить достижение?')) return;
    try {
      const result = await api.deleteAchievement(id);
      if (result.error) throw new Error(result.error);
      setMessage('✅ Достижение удалено');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
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
          <span style={{ fontSize: '32px' }}>🏆</span>
          <div>
            <h1>Управление достижениями</h1>
            <p>
              {profile?.role === 'club_coordinator' 
                ? `Участники вашего клуба (${filteredAchievements.length})` 
                : `Все достижения участников (${filteredAchievements.length})`}
            </p>
          </div>
          {canManage && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) {
                  setTimeout(() => inputRef.current?.focus(), 100);
                }
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Добавить достижение'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setFilterSearch}
          searchPlaceholder="🔍 Поиск по названию, описанию, участнику..."
        >
          <div style={{ fontSize: '14px', color: '#667085', padding: '6px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
            Найдено: <strong>{filteredAchievements.length}</strong>
          </div>
        </FilterBar>

        {showForm && canManage && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              {editingAchievement ? '✏️ Редактировать достижение' : '📝 Добавить достижение'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Участник *</label>
                <div style={{ position: 'relative' }}>
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
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #E2E7EF',
                        borderRadius: '10px',
                        boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 100
                      }}
                    >
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectParticipant(p)}
                        >
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                            {p.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedParticipant && (
                  <div style={{
                    marginTop: '6px',
                    padding: '6px 12px',
                    background: '#E8F5EF',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#16845B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    ✅ Выбран: <strong>{selectedParticipant.full_name}</strong>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#B3262E', cursor: 'pointer', marginLeft: 'auto' }}
                      onClick={() => {
                        setSelectedParticipant(null);
                        setSearchQuery('');
                        setForm({ ...form, participant_id: '' });
                      }}
                    >
                      ✕
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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading || !selectedParticipant}>
                  {loading ? '⏳ Сохранение...' : editingAchievement ? '💾 Обновить' : '✅ Добавить'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              Все достижения
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {filteredAchievements.length} достижений
            </span>
          </div>

          {filteredAchievements.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏆</div>
              <p>Достижений пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredAchievements.map((a) => {
                const userCanEdit = canEdit;
                const userCanDelete = canDelete;
                
                return (
                  <div
                    key={a.id}
                    className="list-item"
                    style={{
                      borderLeftColor: a.is_club_award ? '#C9A227' : 
                                     a.is_tutor_award ? '#174A7E' : '#0B1F3A'
                    }}
                  >
                    <div className="title">
                      <span style={{ marginRight: '8px' }}>
                        {a.is_club_award ? '🏫' : a.is_tutor_award ? '📚' : '🏅'}
                      </span>
                      {a.title}
                      {a.is_club_award && (
                        <span className="tag tag-gold" style={{ marginLeft: '8px', fontSize: '10px' }}>
                          Клубная
                        </span>
                      )}
                      {a.is_tutor_award && (
                        <span className="tag tag-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                          Тьюторская
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      👤 {a.participant_name || 'Участник'}
                      {a.achievement_date && ` • 📅 ${new Date(a.achievement_date).toLocaleDateString('ru-RU')}`}
                    </div>
                    {a.description && <div className="meta">{a.description}</div>}
                    
                    {(userCanEdit || userCanDelete) && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        {userCanEdit && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => handleEdit(a)}
                          >
                            ✏️ Редактировать
                          </button>
                        )}
                        {userCanDelete && (
                          <button
                            className="btn-danger"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => handleDelete(a.id)}
                          >
                            🗑️ Удалить
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}