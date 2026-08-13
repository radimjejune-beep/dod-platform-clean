// frontend/src/pages/ClubDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ClubDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      // Загружаем клуб
      const clubsData = await api.getClubs();
      const foundClub = clubsData.find(c => c.id === id);
      setClub(foundClub || null);

      // Загружаем участников
      const participantsData = await api.getParticipants();
      setParticipants(participantsData || []);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
        <Navigation profile={profile} />
        <div style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>❌ Клуб не найден</h1>
          <button onClick={() => navigate('/clubs')} style={{ padding: '10px 20px', marginTop: '20px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 24px' }}>
        <button onClick={() => navigate('/clubs')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #D5DCE7', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
          ← Назад
        </button>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>{club.name}</h1>
          {club.description && <p style={{ color: '#667085' }}>{club.description}</p>}
          <p style={{ color: '#98A2B3', marginTop: '12px' }}>Создан: {club.created_at ? new Date(club.created_at).toLocaleDateString('ru-RU') : '—'}</p>
          
          <h3 style={{ marginTop: '24px', fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>👥 Участники</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {participants.filter(p => p.club_id === club.id).length === 0 ? (
              <p style={{ color: '#667085' }}>Участников пока нет</p>
            ) : (
              participants.filter(p => p.club_id === club.id).map(p => (
                <div key={p.id} style={{ padding: '10px 16px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>{p.full_name}</span>
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: '#98A2B3' }}>{p.class_name || ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}