// frontend/src/pages/Achievements.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Achievements() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    achievement_date: '',
    participant_id: ''
  });
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
      setProfile(userData);

      const [participantsData, clubsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getClubs(),
        api.getAchievements()
      ]);

      setClubs(clubsData || []);
      setAllAchievements(achievementsData || []);

      const role = userData.role;
      let filteredAchievements = [];
      let filteredParticipants = [];

      // ============================================================
      // ЛОГИКА ПО РОЛЯМ
      // ============================================================

      if (role === 'participant') {
        // УЧАСТНИК — видит только свои достижения
        filteredAchievements = achievementsData.filter(a => a.participant_id === userData.id);
        filteredParticipants = participantsData.filter(p => p.id === userData.id);
      } 
      else if (role === 'parent') {
        // РОДИТЕЛЬ — видит достижения своего ребёнка
        // TODO: нужна связь родитель-ребёнок в БД
        filteredAchievements = achievementsData;
        filteredParticipants = participantsData;
      } 
      else if (role === 'club_coordinator') {
        // КООРДИНАТОР КЮДА — видит только участников своего клуба
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          const clubParticipantIds = participantsData
            .filter(p => p.club_id === coordinatorClub.id)
            .map(p => p.id);
          filteredAchievements = achievementsData.filter(a => clubParticipantIds.includes(a.participant_id));
          filteredParticipants = participantsData.filter(p => p.club_id === coordinatorClub.id);
        } else {
          filteredAchievements = [];
          filteredParticipants = [];
        }
      } 
      else if (role === 'tutor' || 
               role === 'movement_coordinator' || 
               role === 'admin' || 
               role === 'president' || 
               role === 'vice_president') {
        // ТЬЮТОР, КООРДИНАТОР, АДМИН, ПРЕЗИДЕНТ, ВИЦЕ — видят всех
        filteredAchievements = achievementsData;
        filteredParticipants = participantsData;
      } 
      else {
        filteredAchievements = [];
        filteredParticipants = [];
      }

      setAchievements(filteredAchievements);
      setParticipants(filteredParticipants);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтр по клубу (только для тех, кто видит всех)
  const canFilterByClub = profile?.role === 'admin' || 
                          profile?.role === 'movement_coordinator' || 
                          profile?.role === 'tutor' ||
                          profile?.role === 'president' ||
                          profile?.role === 'vice_president';

  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      const clubParticipantIds = participants
        .filter(p => p.club_id === selectedClubId)
        .map(p => p.id);
      setAchievements(allAchievements.filter(a => clubParticipantIds.includes(a.participant_id)));
    } else {
      setAchievements(allAchievements);
    }
  }, [selectedClubId, allAchievements, participants, canFilterByClub]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length === 0) {
      setShowDropdown(false);
      setSelectedParticipant(null);
      return;
    }

    const filtered = participants.filter(p =>
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

      const result = await api.addAchievement({
        participant_id: selectedParticipant.id,
        title: form.title,
        description: form.description,
        achievement_date: form.achievement_date || new Date().toISOString().split('T')[0]
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Достижение добавлено!');
      setMessageType('success');
      setForm({ title: '', description: '', achievement_date: '', participant_id: '' });
      setSearchQuery('');
      setSelectedParticipant(null);
      setShowForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
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

  // Кто может добавлять достижения
  const canAdd = profile?.role === 'admin' ||
                 profile?.role === 'movement_coordinator' ||
                 profile?.role === 'club_coordinator' ||
                 profile?.role === 'tutor';

  // Кто может удалять достижения
  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  const getRoleSpecificTitle = () => {
    const role = profile?.role;
    const titles = {
      'participant': '🏆 Мои достижения',
      'parent': '🏆 Достижения моего ребёнка',
      'club_coordinator': '🏆 Достижения участников клуба',
      'tutor': '🏆 Достижения участников',
      'movement_coordinator': '🏆 Достижения участников движения',
      'admin': '🏆 Достижения участников движения',
      'president': '🏆 Достижения участников движения',
      'vice_president': '🏆 Достижения участников движения'
    };
    return titles[role] || '🏆 Достижения';
  };

  const getRoleSpecificSubtitle = () => {
    const role = profile?.role;
    const subtitles = {
      'participant': 'Ваши успехи и награды',
      'parent': 'Успехи вашего ребенка',
      'club_coordinator': 'Участники вашего КЮДа',
      'tutor': 'Все участники движения',
      'movement_coordinator': 'Все участники движения',
      'admin': 'Все участники движения',
      'president': 'Все участники движения',
      'vice_president': 'Все участники движения'
    };
    return subtitles[role] || 'Достижения';
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
            <h1>{getRoleSpecificTitle()}</h1>
            <p>{getRoleSpecificSubtitle()}</p>
            {achievements.length > 0 && (
              <span style={{ fontSize: '13px', color: '#98A2B3' }}>
                Всего достижений: {achievements.length}
              </span>
            )}
          </div>
          {canAdd && (
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

        {/* ФИЛЬТР ПО КЮДАМ (только для тех, кто видит всех) */}
        {canFilterByClub && clubs.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ minWidth: '200px' }}>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>
              {selectedClubId ? (
                <span>🔍 Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>📋 Все достижения</span>
              )}
            </div>
            {selectedClubId && (
              <button
                style={{
                  padding: '4px 12px',
                  background: '#FCEBEC',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#B3262E'
                }}
                onClick={() => setSelectedClubId('')}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        )}

        {/* ФОРМА ДОБАВЛЕНИЯ */}
        {showForm && canAdd && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Добавить достижение
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
                  placeholder="Подробное описание достижения"
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
                  {loading ? '⏳ Сохранение...' : '✅ Добавить'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setSearchQuery('');
                    setSelectedParticipant(null);
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК ДОСТИЖЕНИЙ */}
        {achievements.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏆</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>
              {profile?.role === 'participant' && 'У вас пока нет достижений'}
              {profile?.role === 'parent' && 'У вашего ребёнка пока нет достижений'}
              {profile?.role === 'club_coordinator' && 'У участников вашего клуба пока нет достижений'}
              {(profile?.role === 'tutor' || 
                profile?.role === 'movement_coordinator' || 
                profile?.role === 'admin' || 
                profile?.role === 'president' || 
                profile?.role === 'vice_president') && 'Достижений пока нет'}
            </p>
            {canAdd && <p style={{ color: '#98A2B3' }}>Добавьте первое достижение!</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {achievements.map((a) => (
              <div
                key={a.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${a.is_club_award ? '#C9A227' : a.is_tutor_award ? '#174A7E' : '#0B1F3A'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '24px' }}>
                      {a.is_club_award ? '🏫' : a.is_tutor_award ? '📚' : '🏅'}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0B1F3A' }}>{a.title}</h3>
                    {a.is_club_award && (
                      <span className="tag tag-gold" style={{ fontSize: '10px' }}>
                        Клубная награда
                      </span>
                    )}
                    {a.is_tutor_award && (
                      <span className="tag tag-blue" style={{ fontSize: '10px' }}>
                        Награда тьютора
                      </span>
                    )}
                  </div>
                  {a.description && <p style={{ color: '#667085', marginTop: '4px' }}>{a.description}</p>}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#667085' }}>
                    <span>👤 {a.participant_name || 'Участник'}</span>
                    {a.achievement_date && (
                      <span>📅 {new Date(a.achievement_date).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <button
                    className="btn-danger"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => handleDelete(a.id)}
                  >
                    🗑️ Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}