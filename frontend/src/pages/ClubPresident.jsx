// frontend/src/pages/ClubPresident.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubPresident() {
  const { clubId } = useParams();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentPresident, setCurrentPresident] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [clubId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Получаем текущего пользователя
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      console.log('👤 Текущий пользователь:', userData);

      // 2. Проверяем роль
      if (userData.role !== 'club_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // 3. Получаем все клубы
      const clubsData = await api.getClubs();
      console.log('🏫 Все клубы:', clubsData);
      
      // 4. Ищем клуб по ID из URL
      const foundClub = clubsData.find(c => c.id === clubId);
      console.log('🏫 Найденный клуб:', foundClub);
      
      if (!foundClub) {
        setMessage('❌ Клуб не найден');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // 5. ПРОВЕРКА ПРАВ — через club_id из профиля
      let hasAccess = false;

      // Админ — имеет доступ ко всем клубам
      if (userData.role === 'admin') {
        hasAccess = true;
        console.log('✅ Админ: доступ есть');
      }

      // Координатор — проверяем привязку
      if (userData.role === 'club_coordinator') {
        // Проверка 1: club_id в профиле пользователя
        if (userData.club_id === clubId) {
          hasAccess = true;
          console.log('✅ Координатор: доступ через club_id в профиле');
        }
        
        // Проверка 2: через таблицу club_coordinators
        if (!hasAccess) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(
              `https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${userData.id}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const coordData = await response.json();
            console.log('📋 Данные club_coordinators:', coordData);
            
            if (coordData && coordData.length > 0) {
              for (const coord of coordData) {
                if (coord.club_id === clubId) {
                  hasAccess = true;
                  console.log('✅ Координатор: доступ через club_coordinators');
                  break;
                }
              }
            }
          } catch (e) {
            console.log('❌ Ошибка проверки координатора:', e);
          }
        }
      }

      console.log('🔑 Итоговый доступ:', hasAccess);

      if (!hasAccess) {
        setMessage('❌ У вас нет прав для этого клуба. Вы не привязаны к этому КЮДу.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      setClub(foundClub);

      // 6. ЗАГРУЗКА УЧАСТНИКОВ КЛУБА
      const participantsData = await api.getParticipants();
      console.log('📥 Все участники:', participantsData?.length || 0);
      
      // Фильтруем по club_id
      const clubParticipants = participantsData.filter(p => p.club_id === clubId);
      console.log(`📥 Участники клуба ${clubId}:`, clubParticipants?.length || 0);
      console.log('📥 Список участников:', clubParticipants);
      
      setParticipants(clubParticipants);

      // 7. ЗАГРУЗКА ТЕКУЩЕГО ПРЕЗИДЕНТА
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `https://dod-backend.relaxdev.ru/api/clubs/${clubId}/president`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        console.log('👑 Текущий президент:', data);
        setCurrentPresident(data);
        if (data) {
          setSelectedParticipant(data.id);
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки президента:', err);
      }

    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка загрузки данных: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPresident = async () => {
    if (!selectedParticipant) {
      setMessage('❌ Пожалуйста, выберите участника');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/clubs/${clubId}/president`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ president_id: selectedParticipant })
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(`✅ Президент назначен!`);
      setMessageType('success');
      setCurrentPresident(result.president);
      
      // Обновляем список
      await loadData();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  const hasParticipants = participants && participants.length > 0;

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '20px' }}
        >
          ← Назад
        </button>

        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👑</span>
          <div>
            <h1>Назначение президента клуба</h1>
            <p>{club?.name || 'Клуб'}</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ТЕКУЩИЙ ПРЕЗИДЕНТ */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            👑 Текущий президент
          </h3>
          {currentPresident ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              background: '#FBF4DC',
              borderRadius: '10px',
              border: '1.5px solid #C9A227'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #C9A227, #E8D9A8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                👑
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                  {currentPresident.full_name}
                </div>
                <div style={{ fontSize: '13px', color: '#667085' }}>
                  {currentPresident.email}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#667085' }}>Президент не назначен</p>
          )}
        </div>

        {/* ВЫБОР НОВОГО ПРЕЗИДЕНТА */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            👤 Выберите нового президента
          </h3>

          {!hasParticipants ? (
            <div className="empty-state">
              <div className="icon">👀</div>
              <p style={{ fontSize: '16px', color: '#0B1F3A' }}>
                В вашем клубе пока нет участников
              </p>
              <p style={{ color: '#667085', fontSize: '13px' }}>
                Добавьте участников в клуб, чтобы назначить президента
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {participants.map((p) => {
                const isCurrentPresident = currentPresident?.id === p.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: selectedParticipant === p.id ? '#FBF4DC' : '#F8FAFC',
                      borderRadius: '8px',
                      border: selectedParticipant === p.id ? '2px solid #C9A227' : '1px solid #E2E7EF',
                      cursor: isCurrentPresident ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isCurrentPresident ? 0.6 : 1
                    }}
                    onClick={() => {
                      if (!isCurrentPresident) {
                        setSelectedParticipant(p.id);
                      }
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {p.full_name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        {p.full_name}
                        {isCurrentPresident && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#C9A227' }}>
                            👑 Текущий президент
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                        {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                      </div>
                    </div>
                    {selectedParticipant === p.id && !isCurrentPresident && (
                      <span style={{ color: '#C9A227', fontSize: '20px' }}>✓</span>
                    )}
                    {isCurrentPresident && (
                      <span style={{ color: '#C9A227', fontSize: '20px' }}>👑</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hasParticipants && (
            <button
              className="btn-success"
              onClick={handleAssignPresident}
              disabled={saving || !selectedParticipant}
              style={{ marginTop: '16px', width: '100%' }}
            >
              {saving ? '⏳ Назначение...' : '👑 Назначить президентом'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}