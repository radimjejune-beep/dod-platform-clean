// src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://dod-backend.relaxdev.ru/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Не авторизован');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '20px'
      }}>
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'red',
        fontSize: '18px'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Шапка с кнопкой выхода */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px'
      }}>
        <h1 style={{ margin: 0 }}>👋 Добро пожаловать!</h1>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 25px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Выйти
        </button>
      </div>

      {/* Карточка с данными пользователя */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '25px', 
          borderRadius: '10px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Ваши данные:</h3>
          <p><strong>Имя:</strong> {user?.full_name || 'Не указано'}</p>
          <p><strong>Email:</strong> {user?.email || 'Не указан'}</p>
          <p><strong>Роль:</strong> {user?.role || 'Не указана'}</p>
          <p><strong>ID:</strong> {user?.id || 'Не указан'}</p>
        </div>
      </div>
    </div>
  );
}