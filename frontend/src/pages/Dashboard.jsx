// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await api.getMe();
        if (data && data.id) {
          setUser(data);
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Ошибка:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Загрузка...</div>;
  }

  return (
    <div>
      <Navigation profile={user} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        <h1>👋 Добро пожаловать, {user?.full_name}!</h1>
        <p>Email: {user?.email}</p>
        <p>Роль: {user?.role}</p>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}