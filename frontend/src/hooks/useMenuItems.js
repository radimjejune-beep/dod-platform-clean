// frontend/src/hooks/useMenuItems.js

import { useMemo } from 'react';

export function useMenuItems(profile) {
  return useMemo(() => {
    const role = profile?.role;
    const isPresident = profile?.is_president || false;
    const items = [];

    // ============================================================
    // БАЗОВЫЕ ПУНКТЫ (ЕСТЬ У ВСЕХ)
    // ============================================================
    const baseItems = [
      { id: 'dashboard', label: 'Дашборд', path: '/dashboard' },
      { id: 'events', label: 'Мероприятия', path: '/events' },
    ];

    // ============================================================
    // ПУНКТЫ ПО РОЛЯМ
    // ============================================================
    const roleItems = {
      admin: [
        { id: 'participants', label: 'Участники', path: '/participants' },
        { id: 'achievements', label: 'Достижения', path: '/achievements' },
        { id: 'clubs', label: 'КЮДы', path: '/clubs' },
        { id: 'reports', label: 'Отчёты', path: '/reports' },
        { id: 'appeals', label: 'Обращения', path: '/appeals' },
        { id: 'analytics', label: 'Аналитика', path: '/analytics' },
        { id: 'president-tasks', label: 'Задания', path: '/president-tasks' },
        { id: 'rating', label: 'Рейтинг', path: '/club-rating' },
        { id: 'documents', label: 'Документы', path: '/documents-center' },
        { id: 'users', label: 'Пользователи', path: '/admin/users' },
        { id: 'clubs-management', label: 'Управление КЮДами', path: '/clubs-management' },
        { id: 'mass-notifications', label: 'Массовые уведомления', path: '/mass-notifications' },
        { id: 'activity-log', label: 'Журнал действий', path: '/activity-log' },
        { id: 'consents', label: 'Согласия', path: '/consents-management' },
        { id: 'goals', label: 'Цели', path: '/goals' },
        { id: 'settings', label: 'Настройки', path: '/settings' },
      ],
      movement_coordinator: [
        { id: 'participants', label: 'Участники', path: '/participants' },
        { id: 'achievements', label: 'Достижения', path: '/achievements' },
        { id: 'clubs', label: 'КЮДы', path: '/clubs' },
        { id: 'reports', label: 'Отчёты', path: '/reports' },
        { id: 'appeals', label: 'Обращения', path: '/appeals' },
        { id: 'analytics', label: 'Аналитика', path: '/analytics' },
        { id: 'president-tasks', label: 'Задания', path: '/president-tasks' },
        { id: 'rating', label: 'Рейтинг', path: '/club-rating' },
        { id: 'documents', label: 'Документы', path: '/documents-center' },
        { id: 'clubs-management', label: 'Управление КЮДами', path: '/clubs-management' },
        { id: 'mass-notifications', label: 'Массовые уведомления', path: '/mass-notifications' },
        { id: 'activity-log', label: 'Журнал действий', path: '/activity-log' },
        { id: 'consents', label: 'Согласия', path: '/consents-management' },
        { id: 'goals', label: 'Цели', path: '/goals' },
      ],
      club_coordinator: [
        { id: 'participants', label: 'Участники', path: '/participants' },
        { id: 'achievements', label: 'Достижения', path: '/achievements' },
        { id: 'clubs', label: 'Мой КЮД', path: '/clubs' },
        { id: 'reports', label: 'Отчёты', path: '/reports' },
        { id: 'appeals', label: 'Обращения', path: '/appeals' },
        { id: 'rating', label: 'Рейтинг', path: '/club-rating' },
        { id: 'documents', label: 'Документы', path: '/documents-center' },
        { id: 'staff', label: 'Сотрудники', path: '/staff' },
        { id: 'calendar', label: 'Календарь', path: '/calendar' },
        { id: 'manage-achievements', label: 'Управление достижениями', path: '/manage-achievements' },
      ],
      tutor: [
        { id: 'participants', label: 'Участники', path: '/participants' },
        { id: 'achievements', label: 'Достижения', path: '/achievements' },
        { id: 'clubs', label: 'КЮДы', path: '/clubs' },
        { id: 'reports', label: 'Отчёты', path: '/reports' },
        { id: 'my-reviews', label: 'Мои оценки', path: '/my-reviews' },
        { id: 'my-journal', label: 'Мой журнал', path: '/my-journal' },
        { id: 'calendar', label: 'Календарь', path: '/staff-calendar' },
        { id: 'tutor-assignments', label: 'Назначения', path: '/tutor-assignments' },
        { id: 'tutor-requests', label: 'Запросы', path: '/tutor-requests' },
      ],
      participant: [
        { id: 'my-achievements', label: 'Мои достижения', path: '/my-achievements' },
        { id: 'my-reviews', label: 'Мои оценки', path: '/my-reviews' },
        { id: 'calendar', label: 'Календарь', path: '/calendar' },
        { id: 'participant-dashboard', label: 'Мой профиль', path: '/participant-dashboard' },
      ],
      president: [
        { id: 'participants', label: 'Участники', path: '/participants' },
        { id: 'achievements', label: 'Достижения', path: '/achievements' },
        { id: 'clubs', label: 'КЮДы', path: '/clubs' },
        { id: 'reports', label: 'Отчёты', path: '/reports' },
        { id: 'appeals', label: 'Обращения', path: '/appeals' },
        { id: 'analytics', label: 'Аналитика', path: '/analytics' },
        { id: 'president-tasks', label: 'Задания', path: '/president-tasks' },
        { id: 'rating', label: 'Рейтинг', path: '/club-rating' },
        { id: 'documents', label: 'Документы', path: '/documents-center' },
        { id: 'club-president', label: 'Управление', path: '/club-president' },
      ],
      vice_president: [
        { id: 'participants', label: 'Участники', path: '/participants' },
        { id: 'achievements', label: 'Достижения', path: '/achievements' },
        { id: 'clubs', label: 'КЮДы', path: '/clubs' },
        { id: 'reports', label: 'Отчёты', path: '/reports' },
        { id: 'appeals', label: 'Обращения', path: '/appeals' },
        { id: 'analytics', label: 'Аналитика', path: '/analytics' },
        { id: 'president-tasks', label: 'Задания', path: '/president-tasks' },
        { id: 'rating', label: 'Рейтинг', path: '/club-rating' },
        { id: 'documents', label: 'Документы', path: '/documents-center' },
      ],
      parent: [
        { id: 'my-achievements', label: 'Достижения детей', path: '/my-achievements' },
        { id: 'calendar', label: 'Календарь', path: '/calendar' },
        { id: 'parent-dashboard', label: 'Мой профиль', path: '/parent-dashboard' },
      ],
    };

    // ============================================================
    // СБОРКА МЕНЮ
    // ============================================================
    const existingPaths = new Set();

    // Добавляем базовые пункты
    for (const item of baseItems) {
      items.push(item);
      existingPaths.add(item.path);
    }

    // Добавляем пункты по роли
    if (role && roleItems[role]) {
      for (const item of roleItems[role]) {
        if (!existingPaths.has(item.path)) {
          items.push(item);
          existingPaths.add(item.path);
        }
      }
    }

    // Для участника-президента добавляем задания
    if (role === 'participant' && isPresident) {
      const hasTasks = items.some(i => i.id === 'president-tasks');
      if (!hasTasks) {
        items.push({ id: 'president-tasks', label: 'Задания', path: '/president-tasks' });
      }
    }

    return items;
  }, [profile]);
}