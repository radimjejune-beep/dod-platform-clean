// frontend/src/pages/ClubAnalytics.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubAnalytics() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [clubs, setClubs] = useState([]);
  const [clubStats, setClubStats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      // ============================================================
      // КТО МОЖЕТ СМОТРЕТЬ
      // ============================================================
      const allowedRoles = ['club_coordinator', 'movement_coordinator', 'admin'];
      if (!allowedRoles.includes(userData.role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем клубы
      let clubsData = await api.getClubs();

      // Если координатор клуба — показываем только его клуб
      if (userData.role === 'club_coordinator') {
        const userClubs = clubsData.filter(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        clubsData = userClubs;
      }

      setClubs(clubsData || []);

      // Собираем статистику по клубам
      const [participantsData, eventsData, achievementsData] = await Promise.all([
        api.getParticipants(),
        api.getEvents(),
        api.getAchievements()
      ]);

      const stats = clubsData.map(club => {
        const clubParticipants = participantsData.filter(p => p.club_id === club.id);
        const clubEvents = eventsData.filter(e => {
          const eventDate = new Date(e.event_date);
          return e.club_id === club.id && 
                 eventDate.getMonth() === selectedMonth.getMonth() &&
                 eventDate.getFullYear() === selectedMonth.getFullYear();
        });
        const clubAchievements = achievementsData.filter(a => {
          const participant = participantsData.find(p => p.id === a.participant_id);
          return participant?.club_id === club.id;
        });

        return {
          ...club,
          participantsCount: clubParticipants.length,
          eventsCount: clubEvents.length,
          achievementsCount: clubAchievements.length,
          activeParticipants: clubParticipants.filter(p => p.status === 'active').length
        };
      });

      stats.sort((a, b) => b.eventsCount - a.eventsCount);
      setClubStats(stats);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMonthLabel = (date) => {
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (delta) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedMonth(newDate);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isClubCoordinator = profile?.role === 'club_coordinator';

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📊</span>
          <div>
            <h1>{isClubCoordinator ? 'Аналитика моего клуба' : 'Аналитика КЮДов'}</h1>
            <p>{isClubCoordinator ? 'Статистика вашего клуба' : 'Статистика всех КЮДов'}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px' }}
              onClick={() => changeMonth(-1)}
            >
              ◀
            </button>
            <span style={{ fontWeight: '600', color: '#0B1F3A', minWidth: '140px', textAlign: 'center' }}>
              {getMonthLabel(selectedMonth)}
            </span>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px' }}
              onClick={() => changeMonth(1)}
            >
              ▶
            </button>
          </div>
        </div>

        {clubStats.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📊</div>
            <p>Нет данных для отображения</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {clubStats.map((club, index) => (
              <div
                key={club.id}
                className="card"
                style={{
                  borderLeft: index === 0 ? '4px solid #C9A227' : '4px solid #174A7E',
                  background: index === 0 ? '#FBF4DC' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                      {index === 0 && '🏆 '}
                      {club.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      👥 {club.participantsCount} участников
                      {club.activeParticipants > 0 && ` • 🟢 ${club.activeParticipants} активных`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#667085' }}>
                    <span>📅 {club.eventsCount} мероприятий</span>
                    <span>🏆 {club.achievementsCount} достижений</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}