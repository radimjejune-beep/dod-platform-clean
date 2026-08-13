// frontend/src/components/ProtectedRoute.jsx

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../lib/api';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Проверка токена:', token ? '✅ есть' : '❌ нет');
    
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const user = await api.getMe();
      console.log('👤 Пользователь:', user);
      
      if (user && user.id) {
        setIsAuthenticated(true);
      } else {
        console.log('❌ Пользователь не найден');
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error('❌ Ошибка проверки авторизации:', err);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#667085'
      }}>
        ⏳ Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔒 Не авторизован, перенаправление на /login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Авторизован, показываем страницу');
  return children;
}