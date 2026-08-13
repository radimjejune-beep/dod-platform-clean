// frontend/src/pages/Clubs.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Clubs() {
  const [profile, setProfile] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setProfile(userData);

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

    } catch (err) {
      console.error('Ошибка загрузки клубов:', err);
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

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>🏫 Клубы</h1>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E2E7EF', marginTop: '20px' }}>
          {clubs.length === 0 ? (
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>Клубов пока нет</p>
          ) : (
            clubs.map(club => (
              <div key={club.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F4F6F9', cursor: 'pointer' }} onClick={() => navigate(`/club/${club.id}`)}>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{club.name}</div>
                {club.description && <div style={{ fontSize: '13px', color: '#667085' }}>{club.description}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}