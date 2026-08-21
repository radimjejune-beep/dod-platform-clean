// frontend/src/hooks/useMenuItems.js

import { useMemo } from 'react';

export function useMenuItems(profile) {
  return useMemo(() => {
    if (!profile) return [];

    const role = profile.role;
    const items = [];

    // ============================================================
    // БАЗОВЫЕ ПУНКТЫ ДЛЯ ВСЕХ АВТОРИЗОВАННЫХ
    // ============================================================
    const commonItems = [
      { id: 'dashboard', path: '/dashboard', icon: '📊', label: 'Дашборд' },
      { id: 'events', path: '/events', icon: '📅', label: 'Мероприятия' },
      { id: 'calendar', path: '/calendar', icon: '📆', label: 'Календарь' },
      { id: 'profile', path: '/profile', icon: '👤', label: 'Профиль' },
      { id: 'my-achievements', path: '/my-achievements', icon: '🏆', label: 'Мои достижения' },
      { id: 'my-reviews', path: '/my-reviews', icon: '📊', label: 'Мои оценки' },
    ];

    // ============================================================
    // АДМИНИСТРАТОР
    // ============================================================
    if (role === 'admin') {
      return [
        ...commonItems,
        { id: 'crm', path: '/crm', icon: '🏢', label: 'CRM' },
        { id: 'admin-users', path: '/admin/users', icon: '👥', label: 'Пользователи' },
        { id: 'clubs', path: '/clubs', icon: '🏫', label: 'КЮДы' },
        { id: 'participants', path: '/participants', icon: '👤', label: 'Участники' },
        { id: 'achievements', path: '/achievements', icon: '🏆', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: '📋', label: 'Отчёты' },
        { id: 'analytics', path: '/analytics', icon: '📊', label: 'Аналитика' },
        { id: 'appeals', path: '/appeals', icon: '📨', label: 'Обращения' },
        { id: 'admin-news', path: '/admin/news', icon: '📰', label: 'Новости' },
        { id: 'documents-center', path: '/documents-center', icon: '📁', label: 'Документы' },
        { id: 'mass-notifications', path: '/mass-notifications', icon: '📨', label: 'Уведомления' },
        { id: 'consents-management', path: '/consents-management', icon: '📝', label: 'Согласия' },
        { id: 'settings', path: '/settings', icon: '⚙️', label: 'Настройки' },
        { id: 'import-participants', path: '/import-participants', icon: '📥', label: 'Импорт участников' },
        { id: 'activity-log', path: '/activity-log', icon: '📋', label: 'Журнал действий' },
        { id: 'notification-history', path: '/notification-history', icon: '📨', label: 'История уведомлений' },
        { id: 'goals', path: '/goals', icon: '🎯', label: 'Цели и KPI' },
        { id: 'tasks-planner', path: '/tasks-planner', icon: '📅', label: 'Планировщик задач' },
        { id: 'staff', path: '/staff', icon: '👥', label: 'Сотрудники' },
      ];
    }

    // ============================================================
    // КООРДИНАТОР ДВИЖЕНИЯ
    // ============================================================
    if (role === 'movement_coordinator') {
      return [
        ...commonItems,
        { id: 'crm', path: '/crm', icon: '🏢', label: 'CRM' },
        { id: 'coordinator-dashboard', path: '/coordinator-dashboard', icon: '📊', label: 'Дашборд координатора' },
        { id: 'clubs-management', path: '/clubs-management', icon: '🏫', label: 'Управление КЮДами' },
        { id: 'admin-users', path: '/admin/users', icon: '👥', label: 'Пользователи' },
        { id: 'participants', path: '/participants', icon: '👤', label: 'Участники' },
        { id: 'achievements', path: '/achievements', icon: '🏆', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: '📋', label: 'Отчёты' },
        { id: 'analytics', path: '/analytics', icon: '📊', label: 'Аналитика' },
        { id: 'appeals', path: '/appeals', icon: '📨', label: 'Обращения' },
        { id: 'admin-news', path: '/admin/news', icon: '📰', label: 'Новости' },
        { id: 'documents-center', path: '/documents-center', icon: '📁', label: 'Документы' },
        { id: 'mass-notifications', path: '/mass-notifications', icon: '📨', label: 'Уведомления' },
        { id: 'consents-management', path: '/consents-management', icon: '📝', label: 'Согласия' },
        { id: 'settings', path: '/settings', icon: '⚙️', label: 'Настройки' },
        { id: 'import-participants', path: '/import-participants', icon: '📥', label: 'Импорт участников' },
        { id: 'activity-log', path: '/activity-log', icon: '📋', label: 'Журнал действий' },
        { id: 'notification-history', path: '/notification-history', icon: '📨', label: 'История уведомлений' },
        { id: 'tasks-planner', path: '/tasks-planner', icon: '📅', label: 'Планировщик задач' },
        { id: 'goals', path: '/goals', icon: '🎯', label: 'Цели и KPI' },
        { id: 'club-analytics', path: '/club-analytics', icon: '📊', label: 'Аналитика КЮДов' },
        { id: 'staff', path: '/staff', icon: '👥', label: 'Сотрудники' },
        { id: 'staff-calendar', path: '/staff-calendar', icon: '📆', label: 'Календарь сотрудников' },
      ];
    }

    // ============================================================
    // КООРДИНАТОР КЛУБА
    // ============================================================
    if (role === 'club_coordinator') {
      return [
        ...commonItems,
        { id: 'clubs', path: '/clubs', icon: '🏫', label: 'Мой КЮД' },
        { id: 'participants', path: '/participants', icon: '👤', label: 'Участники' },
        { id: 'manage-achievements', path: '/manage-achievements', icon: '🏆', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: '📋', label: 'Отчёты' },
        { id: 'appeals', path: '/appeals', icon: '📨', label: 'Обращения' },
        { id: 'club-analytics', path: '/club-analytics', icon: '📊', label: 'Аналитика клуба' },
        { id: 'club-calendar', path: '/club-calendar', icon: '📆', label: 'Календарь клуба' },
        { id: 'my-club-events', path: '/my-club-events', icon: '📅', label: 'Мероприятия клуба' },
        { id: 'tutor-requests', path: '/tutor-requests', icon: '🤝', label: 'Запрос тьютора' },
        { id: 'tutor-invitations', path: '/tutor-invitations', icon: '📨', label: 'Приглашения тьюторов' },
        { id: 'club-rating', path: '/club-rating', icon: '🏆', label: 'Рейтинг клуба' },
        // Назначение президента — добавляем отдельно, если есть клуб
        ...(profile.club_id ? [
          { id: 'club-president', path: `/club/${profile.club_id}/president`, icon: '👑', label: 'Назначить президента' },
        ] : []),
      ];
    }

    // ============================================================
    // УЧАСТНИК
    // ============================================================
    if (role === 'participant') {
      return [
        ...commonItems,
        { id: 'participant-dashboard', path: '/participant-dashboard', icon: '📊', label: 'Мой дашборд' },
        { id: 'events', path: '/events', icon: '📅', label: 'Мероприятия' },
        { id: 'calendar', path: '/calendar', icon: '📆', label: 'Календарь' },
        { id: 'my-achievements', path: '/my-achievements', icon: '🏆', label: 'Мои достижения' },
        { id: 'my-reviews', path: '/my-reviews', icon: '📊', label: 'Мои оценки' },
      ];
    }

    // ============================================================
    // ТЬЮТОР
    // ============================================================
    if (role === 'tutor') {
      return [
        ...commonItems,
        { id: 'tutor-dashboard', path: '/tutor-dashboard', icon: '📊', label: 'Дашборд тьютора' },
        { id: 'tutor-assignments', path: '/tutor-assignments', icon: '📅', label: 'Мои назначения' },
        { id: 'tutor-invitations', path: '/tutor-invitations', icon: '📨', label: 'Приглашения' },
        { id: 'my-journal', path: '/my-journal', icon: '📓', label: 'Мой журнал' },
        { id: 'participants', path: '/participants', icon: '👤', label: 'Участники' },
        { id: 'staff-calendar', path: '/staff-calendar', icon: '📆', label: 'Календарь' },
        { id: 'achievements', path: '/achievements', icon: '🏆', label: 'Достижения' },
      ];
    }

    // ============================================================
    // ПРЕЗИДЕНТ / ВИЦЕ-ПРЕЗИДЕНТ
    // ============================================================
    if (role === 'president' || role === 'vice_president') {
      return [
        ...commonItems,
        { id: 'president-tasks', path: '/president-tasks', icon: '👑', label: 'Задания' },
        { id: 'clubs', path: '/clubs', icon: '🏫', label: 'КЮДы' },
        { id: 'participants', path: '/participants', icon: '👤', label: 'Участники' },
        { id: 'reports', path: '/reports', icon: '📋', label: 'Отчёты' },
        { id: 'documents', path: '/documents', icon: '📁', label: 'Документы' },
        { id: 'appeals', path: '/appeals', icon: '📨', label: 'Обращения' },
        { id: 'events', path: '/events', icon: '📅', label: 'Мероприятия' },
      ];
    }

    // ============================================================
    // РОДИТЕЛЬ
    // ============================================================
    if (role === 'parent') {
      return [
        ...commonItems,
        { id: 'parent-dashboard', path: '/parent-dashboard', icon: '👨‍👩‍👦', label: 'Дашборд родителя' },
        { id: 'events', path: '/events', icon: '📅', label: 'Мероприятия' },
        { id: 'calendar', path: '/calendar', icon: '📆', label: 'Календарь' },
        { id: 'my-achievements', path: '/my-achievements', icon: '🏆', label: 'Достижения детей' },
      ];
    }

    // ============================================================
    // ПО УМОЛЧАНИЮ
    // ============================================================
    return commonItems;
  }, [profile]);
}

export default useMenuItems;