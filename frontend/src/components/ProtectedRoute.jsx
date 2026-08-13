// frontend/src/components/ProtectedRoute.jsx

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../lib/api';

// ===== СПИСОК РОЛЕЙ ДЛЯ КАЖДОГО МАРШРУТА =====
const routeRoles = {
  '/dashboard': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/participant-dashboard': ['participant'],
  '/parent-dashboard': ['parent'],
  '/club-coordinator-dashboard': ['club_coordinator'],
  '/tutor-dashboard': ['tutor'],
  '/profile': ['all'],
  '/participants': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/clubs': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/events': ['all'],
  '/achievements': ['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'],
  '/my-achievements': ['participant', 'parent'],
  '/manage-achievements': ['admin', 'movement_coordinator', 'club_coordinator'],
  '/my-reviews': ['all'],
  '/reports': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/analytics': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/club-analytics': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/settings': ['admin', 'movement_coordinator'],
  '/admin/invite': ['admin', 'movement_coordinator'],
  '/admin/users': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/import-participants': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/appeals': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/staff': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/staff-calendar': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/president-tasks': ['admin', 'movement_coordinator', 'club_coordinator', 'participant'],
  '/my-journal': ['tutor'],
  '/calendar': ['all'],
  '/tutor-requests': ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  '/tutor-invitations': ['tutor', 'admin', 'movement_coordinator', 'president', 'vice_president'],
};

// ===== КАКАЯ СТРАНИЦА ДЛЯ КАЖДОЙ РОЛИ ПО УМОЛЧАНИЮ =====
const defaultRouteByRole = {
  'participant': '/participant-dashboard',
  'parent': '/parent-dashboard',
  'club_coordinator': '/club-coordinator-dashboard',
  'tutor': '/tutor-dashboard',
  'admin': '/dashboard',
  'movement_coordinator': '/dashboard',
  'president': '/dashboard',
  'vice_president': '/dashboard'
};

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    checkAuth();
    
    // ===== СЛУШАЕМ ЗАКРЫТИЕ ВКЛАДКИ =====
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Вкладка свернута или закрыта — ничего не делаем
      } else {
        // Вкладка снова активна — проверяем, есть ли сессия
        const sessionId = sessionStorage.getItem('sessionId');
        const token = localStorage.getItem('token');
        
        if (token && sessionId) {
          // Проверяем, что сессия ещё активна
          checkAuth();
        } else {
          // Сессии нет — выходим
          logout();
        }
      }
    };

    // ===== СЛУШАЕМ ЗАКРЫТИЕ БРАУЗЕРА =====
    const handleBeforeUnload = () => {
      // При закрытии вкладки удаляем сессию
      sessionStorage.removeItem('sessionId');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
      let user = null;
      try {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          user = await response.json();
        }
      } catch (e) {
        console.log('⚠️ /api/me не работает, пробуем /api/me2');
      }

      if (!user || !user.id) {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/me2', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        user = await response.json();
      }

      console.log('👤 Пользователь:', user);
      
      if (user && user.id) {
        // ===== СОЗДАЁМ СЕССИЮ =====
        const sessionId = Date.now().toString();
        sessionStorage.setItem('sessionId', sessionId);
        sessionStorage.setItem('userId', user.id);
        sessionStorage.setItem('userRole', user.role);
        
        localStorage.setItem('user', JSON.stringify(user));
        setIsAuthenticated(true);
        setUserRole(user.role);
        
        const currentPath = window.location.pathname;
        console.log('📍 Текущий путь:', currentPath);
        console.log('👤 Роль пользователя:', user.role);
        
        const allowedRoles = routeRoles[currentPath] || ['all'];
        console.log('✅ Разрешённые роли:', allowedRoles);
        
        if (allowedRoles.includes('all') || allowedRoles.includes(user.role)) {
          console.log('✅ Доступ разрешён');
          setHasAccess(true);
        } else {
          console.log('❌ Доступ запрещён');
          setHasAccess(false);
          const defaultRoute = defaultRouteByRole[user.role] || '/dashboard';
          setRedirectPath(defaultRoute);
        }
      } else {
        console.log('❌ Пользователь не найден');
        logout();
      }
    } catch (err) {
      console.error('❌ Ошибка проверки авторизации:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setLoading(false);
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

  if (!hasAccess && redirectPath) {
    console.log('🚫 Нет доступа, перенаправление на:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  console.log('✅ Авторизован и имеет доступ');
  return children;
}