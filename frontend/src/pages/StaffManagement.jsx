// frontend/src/pages/StaffManagement.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function StaffManagement() {
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
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

      const users = await api.getUsers();
      setStaff(users.filter(u => ['tutor', 'club_coordinator', 'movement_coordinator', 'admin'].includes(u.role)));

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

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>👥 Сотрудники</h1>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E2E7EF', marginTop: '20px' }}>
          {staff.length === 0 ? (
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>Сотрудников пока нет</p>
          ) : (
            staff.map(s => (
              <div key={s.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F4F6F9' }}>
                <span style={{ fontWeight: '500' }}>{s.full_name}</span>
                <span style={{ marginLeft: '12px', fontSize: '13px', color: '#98A2B3' }}>{s.role}</span>
                <span style={{ marginLeft: '12px', fontSize: '13px', color: '#98A2B3' }}>{s.email}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}