// frontend/src/pages/Achievements.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Achievements() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: ''
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

      // Загружаем участников
      const participants = await api.getParticipants();
      setAllParticipants(participants || []);

      // Загружаем достижения
      const achievementsData = await api.getAchievements();
      setAchievements(achievementsData || []);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length === 0) {
      setFilteredParticipants([]);
      setShowDropdown(false);
      setSelectedParticipant(null);
      return;
    }

    const filtered = allParticipants.filter(p =>
      p.full_name?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredParticipants(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant);
    setSearchQuery(participant.full_name);
    setShowDropdown(false);
  };

  const handleAddAchievement = async (e) => {
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
        achievement_date: form.date || new Date().toISOString().split('T')[0]
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Достижение добавлено!');
      setMessageType('success');
      setForm({ title: '', description: '', date: '' });
      setSearchQuery('');
      setSelectedParticipant(null);
      setFilteredParticipants([]);
      setShowForm(false);
      
      // Обновляем список
      const achievementsData = await api.getAchievements();
      setAchievements(achievementsData || []);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить достижение?')) return;

    try {
      const result = await api.deleteAchievement(id);
      if (result.error) {
        throw new Error(result.error);
      }
      
      const achievementsData = await api.getAchievements();
      setAchievements(achievementsData || []);
      
      setMessage('✅ Достижение удалено');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const canAdd = profile?.role === 'admin' || 
                 profile?.role === 'movement_coordinator' || 
                 profile?.role === 'club_coordinator' ||
                 profile?.role === 'tutor';

  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh', paddingBottom: '40px' }}>
      <Navigation profile={profile} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>🏆 Достижения и награды</h1>
            <p style={{ color: '#667085' }}>
              {profile?.role === 'participant' && 'Ваши успехи и награды'}
              {profile?.role === 'parent' && 'Достижения вашего ребенка'}
              {profile?.role === 'club_coordinator' && 'Достижения участников вашего клуба'}
              {profile?.role === 'tutor' && 'Достижения участников движения'}
              {(profile?.role === 'admin' || profile?.role === 'movement_coordinator') && 'Все достижения участников'}
            </p>
          </div>
          {canAdd && (
            <button
              style={{
                padding: '10px 24px',
                background: '#0B1F3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
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
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E'
          }}>
            {message}
          </div>
        )}

        {showForm && canAdd && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)',
            border: '1px solid #E2E7EF'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              📝 Добавить достижение
            </h3>
            <form onSubmit={handleAddAchievement}>
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Участник
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'white'
                    }}
                    placeholder="Начните вводить фамилию участника..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchQuery.length > 0) {
                        const filtered = allParticipants.filter(p =>
                          p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        setFilteredParticipants(filtered);
                        setShowDropdown(filtered.length > 0);
                      }
                    }}
                  />
                  
                  {showDropdown && filteredParticipants.length > 0 && (
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
                      {filteredParticipants.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9',
                            transition: 'background 0.15s ease',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectParticipant(p)}
                        >
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                              {p.full_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085' }}>
                              {p.club_name || 'Без клуба'} • {p.class_name || 'Класс не указан'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '12px',
                            color: '#174A7E',
                            fontWeight: '500'
                          }}>
                            Выбрать →
                          </span>
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
                    <span style={{ color: '#667085', fontWeight: '400' }}>
                      ({selectedParticipant.club_name || 'Без клуба'})
                    </span>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#B3262E',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginLeft: 'auto'
                      }}
                      onClick={() => {
                        setSelectedParticipant(null);
                        setSearchQuery('');
                        setFilteredParticipants([]);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Название достижения
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Победитель олимпиады"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Описание
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Подробное описание достижения"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
                  Дата
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 28px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  disabled={loading || !selectedParticipant}
                >
                  {loading ? '⏳ Сохранение...' : '✅ Добавить'}
                </button>
                <button
                  type="button"
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
                  onClick={() => {
                    setShowForm(false);
                    setSearchQuery('');
                    setSelectedParticipant(null);
                    setFilteredParticipants([]);
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {achievements.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)',
            border: '1px solid #E2E7EF'
          }}>
            <p style={{ fontSize: '18px', color: '#667085' }}>🏆 Достижений пока нет</p>
            {canAdd && <p style={{ color: '#98A2B3' }}>Добавьте первое достижение!</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {achievements.map((a) => (
              <div key={a.id} style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px 24px',
                boxShadow: '0 8px 30px rgba(11, 31, 58, 0.06)',
                border: '1px solid #E2E7EF',
                borderLeft: '4px solid #0B1F3A',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '24px' }}>🏅</span>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0B1F3A' }}>{a.title}</h3>
                    <span style={{
                      fontSize: '10px',
                      background: '#EAF2FA',
                      color: '#174A7E',
                      padding: '2px 12px',
                      borderRadius: '20px',
                      fontWeight: '600'
                    }}>
                      ДОСТИЖЕНИЕ
                    </span>
                  </div>
                  {a.description && (
                    <p style={{ color: '#667085', marginTop: '4px', fontSize: '14px' }}>
                      {a.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#667085' }}>
                    <span>👤 {a.participant_name || 'Участник'}</span>
                    {a.achievement_date && (
                      <span>📅 {new Date(a.achievement_date).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <button
                    style={{
                      padding: '4px 12px',
                      background: '#FCEBEC',
                      color: '#B3262E',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDelete(a.id)}
                  >
                    🗑️
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