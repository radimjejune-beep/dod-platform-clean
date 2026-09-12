// frontend/src/components/ProtectedRoute.jsx
//
// Таблица прав на страницы существовала с самого начала, но нигде не была
// подключена: любой вошедший мог открыть по прямой ссылке любой экран.
// Данные при этом не утекали — сервер права проверяет, — но родитель,
// открыв сводку движения, видел «Всё в порядке» вместо отказа.
//
// Заодно убрана привязка к sessionStorage. Она задумывалась как «закрыл
// вкладку — вышел», но очищала признак сессии и при обычном обновлении
// страницы: нажатие F5 выбрасывало человека на вход. Сроком жизни доступа
// распоряжается токен, он живёт сутки.

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import api from '../lib/api';

// ===== СПИСОК РОЛЕЙ ДЛЯ КАЖДОГО МАРШРУТА =====
const routeRoles = {
  // Общий дашборд умеет показывать своё каждой роли: руководителю КЮДа —
  // его клуб и отчёты, тьютору — журнал, участнику и родителю — их
  // мероприятия и достижения. Список ролей сужать нельзя: после входа
  // руководитель КЮДа отправляется именно сюда.
  '/dashboard': ['all'],
  '/coordinator-dashboard': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/crm': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/participant-dashboard': ['participant'],
  '/parent-dashboard': ['parent'],
  // Согласия за ребёнка оформляет законный представитель; администрация
  // должна видеть тот же экран, чтобы помочь родителю по телефону
  '/parent-consents': ['parent', 'admin', 'movement_coordinator'],
  // Выдача временных паролей — только администратор: это сброс доступа
  '/issue-credentials': ['admin'],
  // Журнал занятий ведут сотрудники КЮДа; движение видит все клубы.
  // Маршрут /clubs/:clubId/sessions здесь не указан намеренно: таблица
  // сверяет путь целиком, а право зависит от должности в конкретном
  // клубе — это проверяет сервер.
  '/club-sessions': ['club_coordinator', 'tutor', 'admin', 'movement_coordinator'],
  '/attention': ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  '/club-coordinator-dashboard': ['club_coordinator'],
  '/tutor-dashboard': ['tutor'],
  '/profile': ['all'],
  '/participants': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/clubs': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/events': ['all'],
  '/achievements': ['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'],
  // Экран личных достижений есть в меню у всех ролей — это своя страница,
  // а не чужие данные
  '/my-achievements': ['all'],
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
  '/staff-calendar': ['admin', 'movement_coordinator', 'tutor'],
  '/president-tasks': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/my-journal': ['tutor'],
  '/calendar': ['all'],
  '/tutor-requests': ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  '/tutor-invitations': ['tutor', 'club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  // ===== НОВЫЕ МАРШРУТЫ =====
  '/my-club-events': ['club_coordinator', 'participant', 'tutor'],
  '/my-invitations': ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'],
  '/event-teams': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  // маршрут /clubs/:clubId/staff проверяется на сервере: права зависят от
  // должности в конкретном клубе, а не от глобальной роли
  '/club-calendar': ['club_coordinator', 'participant', 'tutor'],

  // ===== ДОБАВЛЕНО ПРИ ПОДКЛЮЧЕНИИ ТАБЛИЦЫ =====
  // Эти экраны были открыты всем вошедшим, включая родителей и участников
  '/clubs-management': ['admin', 'movement_coordinator'],
  '/documents-center': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/goals': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/tasks-planner': ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'],
  '/mass-notifications': ['admin', 'movement_coordinator'],
  '/consents-management': ['admin', 'movement_coordinator', 'club_coordinator'],
  '/activity-log': ['admin', 'movement_coordinator'],
  '/notification-history': ['admin', 'movement_coordinator'],
  '/club-rating': ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'],
  '/dashboard-analytics': ['admin', 'movement_coordinator', 'president', 'vice_president'],
  '/achievements-categories': ['admin', 'movement_coordinator'],
  '/tutor-assignments': ['tutor', 'admin', 'movement_coordinator'],
  // Официальные документы движения читают все — на то они и официальные
  '/documents': ['all'],

  // Маршруты с переменной частью (/participant/:id, /club/:id,
  // /clubs/:clubId/staff, /team/:id, /tutor-journal/:eventId) здесь не
  // указаны намеренно: таблица сверяет путь целиком, а право там зависит
  // не от роли вообще, а от связи человека с конкретным клубом или
  // командой. Это проверяет сервер.
};

// ===== КАКАЯ СТРАНИЦА ДЛЯ КАЖДОЙ РОЛИ ПО УМОЛЧАНИЮ =====
const defaultRouteByRole = {
  'participant': '/participant-dashboard',
  'parent': '/parent-dashboard',
  // /club-coordinator-dashboard теперь сам перенаправляет сюда: если
  // оставить его домашней страницей, переадресация зациклится
  'club_coordinator': '/dashboard',
  'tutor': '/tutor-dashboard',
  'admin': '/dashboard',
  'movement_coordinator': '/dashboard',
  'president': '/dashboard',
  'vice_president': '/dashboard'
};

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      if (!localStorage.getItem('token')) {
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        // Роль берём у сервера, а не из localStorage: там её может
        // подправить кто угодно, да и после смены роли старое значение
        // висело бы до следующего входа.
        const me = await api.getMe();
        if (cancelled) return;
        if (me && me.id) {
          setRole(me.role);
          localStorage.setItem('user', JSON.stringify(me));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error('❌ Не удалось проверить доступ:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    validate();
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'var(--color-gray-500)'
      }}>
        Проверяем доступ…
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Права сверяются на каждый переход, а не один раз при загрузке:
  // внутри приложения адрес меняется без перезагрузки страницы.
  const allowed = routeRoles[location.pathname] || ['all'];
  if (!allowed.includes('all') && !allowed.includes(role)) {
    const home = defaultRouteByRole[role] || '/dashboard';
    // Если у роли нет доступа даже к своей домашней странице, дальше
    // отправлять некуда — иначе переадресация зациклится.
    if (home === location.pathname) return children || <Outlet />;
    return <Navigate to={home} replace />;
  }

  return children || <Outlet />;
}
