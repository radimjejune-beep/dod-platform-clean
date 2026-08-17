// frontend/src/hooks/useMenuItems.js

import { useMemo } from 'react';

export function useMenuItems(profile) {
  return useMemo(() => {
    const role = profile?.role;
    const isPresident = profile?.is_president || false;
    const items = [];

    // ============================================================
    // БАЗОВЫЕ ПУНКТЫ
    // ============================================================
    const baseItems = [
      { 
        id: 'dashboard', 
        label: 'Дашборд', 
        path: '/dashboard',
        icon: '📊'
      },
    ];

    // ============================================================
    // ПУНКТЫ ПО РОЛЯМ (С ПОДМЕНЮ)
    // ============================================================
    const roleItems = {
      admin: [
        { 
          id: 'management', 
          label: 'Управление', 
          icon: '⚙️',
          children: [
            { id: 'clubs', label: 'КЮДы', path: '/clubs' },
            { id: 'clubs-management', label: 'Управление КЮДами', path: '/clubs-management' },
            { id: 'users', label: 'Пользователи', path: '/admin/users' },
            { id: 'invite', label: 'Пригласить', path: '/admin/invite' },
            { id: 'import', label: 'Импорт', path: '/import-participants' },
            { id: 'settings', label: 'Настройки', path: '/settings' },
          ]
        },
        { 
          id: 'content', 
          label: 'Контент', 
          icon: '📝',
          children: [
            { id: 'events', label: 'Мероприятия', path: '/events' },
            { id: 'participants', label: 'Участники', path: '/participants' },
            { id: 'achievements', label: 'Достижения', path: '/achievements' },
            { id: 'achievements-categories', label: 'Категории достижений', path: '/achievements-categories' },
            { id: 'news', label: 'Новости', path: '/admin/news' },
          ]
        },
        { 
          id: 'reports', 
          label: 'Отчёты и аналитика', 
          icon: '📊',
          children: [
            { id: 'reports', label: 'Отчёты', path: '/reports' },
            { id: 'analytics', label: 'Аналитика', path: '/analytics' },
            { id: 'activity-log', label: 'Журнал действий', path: '/activity-log' },
          ]
        },
        { 
          id: 'communication', 
          label: 'Коммуникация', 
          icon: '💬',
          children: [
            { id: 'appeals', label: 'Обращения', path: '/appeals' },
            { id: 'mass-notifications', label: 'Массовые уведомления', path: '/mass-notifications' },
            { id: 'notification-history', label: 'История уведомлений', path: '/notification-history' },
          ]
        },
        { 
          id: 'documents', 
          label: 'Документы', 
          path: '/documents-center',
          icon: '📁'
        },
        { 
          id: 'goals', 
          label: 'Цели и KPI', 
          path: '/goals',
          icon: '🎯'
        },
        { 
          id: 'consents', 
          label: 'Согласия', 
          path: '/consents-management',
          icon: '📝'
        },
        { 
          id: 'tasks', 
          label: 'Планировщик задач', 
          path: '/tasks-planner',
          icon: '📅'
        },
      ],

      movement_coordinator: [
        { 
          id: 'management', 
          label: 'Управление', 
          icon: '⚙️',
          children: [
            { id: 'clubs', label: 'КЮДы', path: '/clubs' },
            { id: 'clubs-management', label: 'Управление КЮДами', path: '/clubs-management' },
          ]
        },
        { 
          id: 'content', 
          label: 'Контент', 
          icon: '📝',
          children: [
            { id: 'events', label: 'Мероприятия', path: '/events' },
            { id: 'participants', label: 'Участники', path: '/participants' },
            { id: 'achievements', label: 'Достижения', path: '/achievements' },
          ]
        },
        { 
          id: 'reports', 
          label: 'Отчёты и аналитика', 
          icon: '📊',
          children: [
            { id: 'reports', label: 'Отчёты', path: '/reports' },
            { id: 'analytics', label: 'Аналитика', path: '/analytics' },
          ]
        },
        { 
          id: 'communication', 
          label: 'Коммуникация', 
          icon: '💬',
          children: [
            { id: 'appeals', label: 'Обращения', path: '/appeals' },
          ]
        },
        { id: 'documents', label: 'Документы', path: '/documents-center', icon: '📁' },
        { id: 'goals', label: 'Цели и KPI', path: '/goals', icon: '🎯' },
        { id: 'consents', label: 'Согласия', path: '/consents-management', icon: '📝' },
      ],

      club_coordinator: [
        { 
          id: 'club', 
          label: 'Мой КЮД', 
          icon: '🏫',
          children: [
            { id: 'clubs', label: 'Информация о КЮДе', path: '/clubs' },
            { id: 'participants', label: 'Участники', path: '/participants' },
            { id: 'manage-achievements', label: 'Достижения', path: '/manage-achievements' },
            { id: 'staff', label: 'Сотрудники', path: '/staff' },
          ]
        },
        { 
          id: 'events', 
          label: 'Мероприятия', 
          path: '/events',
          icon: '📅'
        },
        { 
          id: 'reports', 
          label: 'Отчёты', 
          path: '/reports',
          icon: '📋'
        },
        { 
          id: 'communication', 
          label: 'Коммуникация', 
          icon: '💬',
          children: [
            { id: 'appeals', label: 'Обращения', path: '/appeals' },
          ]
        },
        { 
          id: 'documents', 
          label: 'Документы', 
          path: '/documents-center',
          icon: '📁'
        },
        { 
          id: 'calendar', 
          label: 'Календарь', 
          path: '/calendar',
          icon: '📆'
        },
        { 
          id: 'rating', 
          label: 'Рейтинг', 
          path: '/club-rating',
          icon: '🏆'
        },
      ],

      tutor: [
        { 
          id: 'tutor', 
          label: 'Тьюторство', 
          icon: '📚',
          children: [
            { id: 'participants', label: 'Участники', path: '/participants' },
            { id: 'achievements', label: 'Достижения', path: '/achievements' },
            { id: 'my-reviews', label: 'Оценки', path: '/my-reviews' },
            { id: 'my-journal', label: 'Мой журнал', path: '/my-journal' },
            { id: 'tutor-assignments', label: 'Назначения', path: '/tutor-assignments' },
          ]
        },
        { 
          id: 'events', 
          label: 'Мероприятия', 
          path: '/events',
          icon: '📅'
        },
        { 
          id: 'reports', 
          label: 'Отчёты', 
          path: '/reports',
          icon: '📋'
        },
        { 
          id: 'calendar', 
          label: 'Календарь', 
          path: '/staff-calendar',
          icon: '📆'
        },
        { 
          id: 'clubs', 
          label: 'КЮДы', 
          path: '/clubs',
          icon: '🏫'
        },
        { 
          id: 'tutor-requests', 
          label: 'Запросы', 
          path: '/tutor-requests',
          icon: '📨'
        },
      ],

      participant: [
        { 
          id: 'participant', 
          label: 'Участнику', 
          icon: '👤',
          children: [
            { id: 'events', label: 'Мероприятия', path: '/events' },
            { id: 'calendar', label: 'Календарь', path: '/calendar' },
            { id: 'my-achievements', label: 'Мои достижения', path: '/my-achievements' },
            { id: 'my-reviews', label: 'Мои оценки', path: '/my-reviews' },
          ]
        },
        { 
          id: 'participant-dashboard', 
          label: 'Мой профиль', 
          path: '/participant-dashboard',
          icon: '👤'
        },
      ],

      president: [
        { 
          id: 'president', 
          label: 'Президенту', 
          icon: '👑',
          children: [
            { id: 'clubs', label: 'КЮДы', path: '/clubs' },
            { id: 'events', label: 'Мероприятия', path: '/events' },
            { id: 'participants', label: 'Участники', path: '/participants' },
            { id: 'achievements', label: 'Достижения', path: '/achievements' },
            { id: 'president-tasks', label: 'Задания', path: '/president-tasks' },
          ]
        },
        { 
          id: 'reports', 
          label: 'Отчёты', 
          path: '/reports',
          icon: '📋'
        },
        { 
          id: 'analytics', 
          label: 'Аналитика', 
          path: '/analytics',
          icon: '📊'
        },
        { 
          id: 'communication', 
          label: 'Коммуникация', 
          icon: '💬',
          children: [
            { id: 'appeals', label: 'Обращения', path: '/appeals' },
          ]
        },
        { 
          id: 'rating', 
          label: 'Рейтинг', 
          path: '/club-rating',
          icon: '🏆'
        },
        { 
          id: 'documents', 
          label: 'Документы', 
          path: '/documents-center',
          icon: '📁'
        },
      ],

      vice_president: [
        { 
          id: 'vice-president', 
          label: 'Вице-президенту', 
          icon: '⭐',
          children: [
            { id: 'clubs', label: 'КЮДы', path: '/clubs' },
            { id: 'events', label: 'Мероприятия', path: '/events' },
            { id: 'participants', label: 'Участники', path: '/participants' },
            { id: 'achievements', label: 'Достижения', path: '/achievements' },
            { id: 'president-tasks', label: 'Задания', path: '/president-tasks' },
          ]
        },
        { 
          id: 'reports', 
          label: 'Отчёты', 
          path: '/reports',
          icon: '📋'
        },
        { 
          id: 'analytics', 
          label: 'Аналитика', 
          path: '/analytics',
          icon: '📊'
        },
        { 
          id: 'documents', 
          label: 'Документы', 
          path: '/documents-center',
          icon: '📁'
        },
      ],

      parent: [
        { 
          id: 'parent', 
          label: 'Родителю', 
          icon: '👨‍👩‍👦',
          children: [
            { id: 'events', label: 'Мероприятия', path: '/events' },
            { id: 'calendar', label: 'Календарь', path: '/calendar' },
            { id: 'my-achievements', label: 'Достижения детей', path: '/my-achievements' },
          ]
        },
        { 
          id: 'parent-dashboard', 
          label: 'Мой профиль', 
          path: '/parent-dashboard',
          icon: '👤'
        },
      ],
    };

    // ============================================================
    // СБОРКА МЕНЮ
    // ============================================================
    // Добавляем дашборд
    items.push({ 
      id: 'dashboard', 
      label: 'Дашборд', 
      path: '/dashboard',
      icon: '📊'
    });

    // Добавляем пункты по роли
    if (role && roleItems[role]) {
      for (const item of roleItems[role]) {
        items.push(item);
      }
    }

    // Для участника-президента добавляем задания
    if (role === 'participant' && isPresident) {
      const hasTasks = items.some(i => i.id === 'president-tasks');
      if (!hasTasks) {
        items.push({
          id: 'president-tasks',
          label: 'Задания президента',
          path: '/president-tasks',
          icon: '👑'
        });
      }
    }

    return items;
  }, [profile]);
}