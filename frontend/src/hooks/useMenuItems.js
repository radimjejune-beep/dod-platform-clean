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
      { id: 'dashboard', path: '/dashboard', icon: 'dashboard', label: 'Дашборд' },
      { id: 'events', path: '/events', icon: 'calendar', label: 'Мероприятия' },
      { id: 'calendar', path: '/calendar', icon: 'grid', label: 'Календарь' },
      { id: 'profile', path: '/profile', icon: 'user', label: 'Профиль' },
      { id: 'my-achievements', path: '/my-achievements', icon: 'trophy', label: 'Мои достижения' },
      { id: 'my-reviews', path: '/my-reviews', icon: 'star', label: 'Мои оценки' },
    ];

    // ============================================================
    // АДМИНИСТРАТОР
    // ============================================================
    if (role === 'admin') {
      return [
        ...commonItems,
        { id: 'crm', path: '/crm', icon: 'building', label: 'CRM' },
        { id: 'admin-users', path: '/admin/users', icon: 'users', label: 'Пользователи' },
        { id: 'admin-invite', path: '/admin/invite', icon: 'mail', label: 'Пригласить' },
        { id: 'event-teams', path: '/event-teams', icon: 'megaphone', label: 'Команды на форумы' },
        { id: 'clubs', path: '/clubs', icon: 'club', label: 'КЮДы' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'achievements', path: '/achievements', icon: 'trophy', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: 'report', label: 'Отчёты' },
        { id: 'analytics', path: '/analytics', icon: 'chart', label: 'Аналитика' },
        { id: 'appeals', path: '/appeals', icon: 'chat', label: 'Обращения' },
        { id: 'admin-news', path: '/admin/news', icon: 'news', label: 'Новости' },
        { id: 'documents-center', path: '/documents-center', icon: 'folder', label: 'Документы' },
        { id: 'mass-notifications', path: '/mass-notifications', icon: 'bell', label: 'Уведомления' },
        { id: 'consents-management', path: '/consents-management', icon: 'consent', label: 'Согласия' },
        { id: 'settings', path: '/settings', icon: 'settings', label: 'Настройки' },
        { id: 'import-participants', path: '/import-participants', icon: 'upload', label: 'Импорт участников' },
        { id: 'activity-log', path: '/activity-log', icon: 'list', label: 'Журнал действий' },
        { id: 'notification-history', path: '/notification-history', icon: 'archive', label: 'История уведомлений' },
        { id: 'goals', path: '/goals', icon: 'target', label: 'Цели и KPI' },
        { id: 'tasks-planner', path: '/tasks-planner', icon: 'tasks', label: 'Планировщик задач' },
        { id: 'staff', path: '/staff', icon: 'briefcase', label: 'Сотрудники' },
      ];
    }

    // ============================================================
    // КООРДИНАТОР ДВИЖЕНИЯ
    // ============================================================
    if (role === 'movement_coordinator') {
      return [
        ...commonItems,
        { id: 'crm', path: '/crm', icon: 'building', label: 'CRM' },
        { id: 'coordinator-dashboard', path: '/coordinator-dashboard', icon: 'dashboard', label: 'Дашборд координатора' },
        { id: 'clubs-management', path: '/clubs-management', icon: 'club', label: 'Управление КЮДами' },
        { id: 'admin-users', path: '/admin/users', icon: 'users', label: 'Пользователи' },
        { id: 'admin-invite', path: '/admin/invite', icon: 'mail', label: 'Пригласить' },
        { id: 'event-teams', path: '/event-teams', icon: 'megaphone', label: 'Команды на форумы' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'achievements', path: '/achievements', icon: 'trophy', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: 'report', label: 'Отчёты' },
        { id: 'analytics', path: '/analytics', icon: 'chart', label: 'Аналитика' },
        { id: 'appeals', path: '/appeals', icon: 'chat', label: 'Обращения' },
        { id: 'admin-news', path: '/admin/news', icon: 'news', label: 'Новости' },
        { id: 'documents-center', path: '/documents-center', icon: 'folder', label: 'Документы' },
        { id: 'mass-notifications', path: '/mass-notifications', icon: 'bell', label: 'Уведомления' },
        { id: 'consents-management', path: '/consents-management', icon: 'consent', label: 'Согласия' },
        { id: 'settings', path: '/settings', icon: 'settings', label: 'Настройки' },
        { id: 'import-participants', path: '/import-participants', icon: 'upload', label: 'Импорт участников' },
        { id: 'activity-log', path: '/activity-log', icon: 'list', label: 'Журнал действий' },
        { id: 'notification-history', path: '/notification-history', icon: 'archive', label: 'История уведомлений' },
        { id: 'tasks-planner', path: '/tasks-planner', icon: 'tasks', label: 'Планировщик задач' },
        { id: 'goals', path: '/goals', icon: 'target', label: 'Цели и KPI' },
        { id: 'club-analytics', path: '/club-analytics', icon: 'chart', label: 'Аналитика КЮДов' },
        { id: 'staff', path: '/staff', icon: 'briefcase', label: 'Сотрудники' },
        { id: 'staff-calendar', path: '/staff-calendar', icon: 'calendar', label: 'Календарь сотрудников' },
      ];
    }

    // ============================================================
    // КООРДИНАТОР КЛУБА
    // ============================================================
    if (role === 'club_coordinator') {
      return [
        ...commonItems,
        { id: 'clubs', path: '/clubs', icon: 'club', label: 'Мой КЮД' },
        { id: 'my-invitations', path: '/my-invitations', icon: 'megaphone', label: 'Приглашения на форумы' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'manage-achievements', path: '/manage-achievements', icon: 'trophy', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: 'report', label: 'Отчёты' },
        { id: 'appeals', path: '/appeals', icon: 'chat', label: 'Обращения' },
        { id: 'club-analytics', path: '/club-analytics', icon: 'chart', label: 'Аналитика клуба' },
        { id: 'club-calendar', path: '/club-calendar', icon: 'calendar', label: 'Календарь клуба' },
        { id: 'my-club-events', path: '/my-club-events', icon: 'calendar', label: 'Мероприятия клуба' },
        { id: 'tutor-requests', path: '/tutor-requests', icon: 'handshake', label: 'Запрос тьютора' },
        { id: 'tutor-invitations', path: '/tutor-invitations', icon: 'mail', label: 'Приглашения тьюторов' },
        { id: 'club-rating', path: '/club-rating', icon: 'star', label: 'Рейтинг клуба' },
        // Назначение президента — добавляем отдельно, если есть клуб
        ...(profile.club_id ? [
          { id: 'club-president', path: `/club/${profile.club_id}/president`, icon: 'crown', label: 'Назначить президента' },
        ] : []),
      ];
    }

    // ============================================================
    // УЧАСТНИК
    // ============================================================
    if (role === 'participant') {
      return [
        ...commonItems,
        { id: 'participant-dashboard', path: '/participant-dashboard', icon: 'dashboard', label: 'Мой дашборд' },
        { id: 'events', path: '/events', icon: 'calendar', label: 'Мероприятия' },
        { id: 'calendar', path: '/calendar', icon: 'grid', label: 'Календарь' },
        { id: 'my-achievements', path: '/my-achievements', icon: 'trophy', label: 'Мои достижения' },
        { id: 'my-reviews', path: '/my-reviews', icon: 'star', label: 'Мои оценки' },
      ];
    }

    // ============================================================
    // ТЬЮТОР
    // ============================================================
    if (role === 'tutor') {
      return [
        ...commonItems,
        { id: 'tutor-dashboard', path: '/tutor-dashboard', icon: 'dashboard', label: 'Дашборд тьютора' },
        { id: 'tutor-assignments', path: '/tutor-assignments', icon: 'calendar', label: 'Мои назначения' },
        { id: 'tutor-invitations', path: '/tutor-invitations', icon: 'mail', label: 'Приглашения' },
        { id: 'my-journal', path: '/my-journal', icon: 'journal', label: 'Мой журнал' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'staff-calendar', path: '/staff-calendar', icon: 'calendar', label: 'Календарь' },
        { id: 'achievements', path: '/achievements', icon: 'trophy', label: 'Достижения' },
      ];
    }

    // ============================================================
    // ПРЕЗИДЕНТ / ВИЦЕ-ПРЕЗИДЕНТ
    // ============================================================
    if (role === 'president' || role === 'vice_president') {
      return [
        ...commonItems,
        { id: 'president-tasks', path: '/president-tasks', icon: 'crown', label: 'Задания' },
        { id: 'clubs', path: '/clubs', icon: 'club', label: 'КЮДы' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'reports', path: '/reports', icon: 'report', label: 'Отчёты' },
        { id: 'documents', path: '/documents', icon: 'folder', label: 'Документы' },
        { id: 'appeals', path: '/appeals', icon: 'chat', label: 'Обращения' },
        { id: 'events', path: '/events', icon: 'calendar', label: 'Мероприятия' },
      ];
    }

    // ============================================================
    // РОДИТЕЛЬ
    // ============================================================
    if (role === 'parent') {
      return [
        ...commonItems,
        { id: 'parent-dashboard', path: '/parent-dashboard', icon: 'family', label: 'Дашборд родителя' },
        { id: 'parent-consents', path: '/parent-consents', icon: 'consent', label: 'Согласия' },
        { id: 'events', path: '/events', icon: 'calendar', label: 'Мероприятия' },
        { id: 'calendar', path: '/calendar', icon: 'grid', label: 'Календарь' },
        { id: 'my-achievements', path: '/my-achievements', icon: 'trophy', label: 'Достижения детей' },
      ];
    }

    // ============================================================
    // ПО УМОЛЧАНИЮ
    // ============================================================
    return commonItems;
  }, [profile]);
}

export default useMenuItems;