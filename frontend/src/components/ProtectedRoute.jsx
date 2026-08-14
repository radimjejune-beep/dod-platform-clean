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
  '/admin/news': ['admin', 'movement_coordinator'],
  '/import-participants': ['admin', 'movement_coordinator'],
  '/appeals': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/staff': ['admin', 'movement_coordinator'],
  '/staff-calendar': ['admin', 'movement_coordinator'],
  '/president-tasks': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/my-journal': ['tutor'],
  '/calendar': ['all'],
  '/tutor-requests': ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  '/tutor-invitations': ['tutor', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  // ===== НОВЫЕ МАРШРУТЫ =====
  '/my-club-events': ['club_coordinator', 'participant', 'tutor'],
  '/club-calendar': ['club_coordinator', 'participant', 'tutor'],
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

  const checkSession = () => {
    const token = localStorage.getItem('token');
    const sessionId = sessionStorage.getItem('sessionId');
    const userId = sessionStorage.getItem('userId');
    
    if (!token) {
      console.log('❌ Нет токена');
      return false;
    }
    
    if (!sessionId) {
      console.log('❌ Сессия истекла (закрыта вкладка)');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id && userId && user.id !== userId) {
      console.log('❌ Несовпадение userId');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('sessionId');
      return false;
    }
    
    console.log('✅ Сессия активна');
    return true;
  };

  useEffect(() => {
    const validateAuth = async () => {
      if (!checkSession()) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (user && user.id) {
          setIsAuthenticated(true);
          setUserRole(user.role);
          
          const currentPath = window.location.pathname;
          const allowedRoles = routeRoles[currentPath] || ['all'];
          
          if (allowedRoles.includes('all') || allowedRoles.includes(user.role)) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
            const defaultRoute = defaultRouteByRole[user.role] || '/dashboard';
            setRedirectPath(defaultRoute);
          }
        } else {
          try {
            const userData = await api.getMe();
            if (userData && userData.id) {
              localStorage.setItem('user', JSON.stringify(userData));
              setIsAuthenticated(true);
              setUserRole(userData.role);
              
              const currentPath = window.location.pathname;
              const allowedRoles = routeRoles[currentPath] || ['all'];
              
              if (allowedRoles.includes('all') || allowedRoles.includes(userData.role)) {
                setHasAccess(true);
              } else {
                setHasAccess(false);
                const defaultRoute = defaultRouteByRole[userData.role] || '/dashboard';
                setRedirectPath(defaultRoute);
              }
            } else {
              logout();
            }
          } catch (err) {
            console.error('❌ Ошибка получения данных:', err);
            logout();
          }
        }
      } catch (err) {
        console.error('❌ Ошибка проверки авторизации:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    validateAuth();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const token = localStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        if (token && !sessionId) {
          console.log('🔒 Сессия потеряна при возврате');
          logout();
          window.location.href = '/login';
        }
      }
    };

    const handleBeforeUnload = () => {
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('loginTime');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('loginTime');
    setIsAuthenticated(false);
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
        ⏳ Проверка сессии...
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