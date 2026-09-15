// frontend/src/hooks/useMenuItems.js

import { useMemo } from 'react';

// Пункты для конкретных ролей перечисляются вместе с общими, и некоторые
// повторяются: у родителя «Мероприятия» и «Календарь» стояли в меню
// дважды. Убираем повторы по адресу, оставляя пункт на первом месте, но с
// названием из роли — родителю нужны «Достижения детей», а не «Мои
// достижения».
function dropDuplicates(items) {
  const order = [];
  const byPath = new Map();
  for (const item of items) {
    if (!byPath.has(item.path)) order.push(item.path);
    byPath.set(item.path, { ...byPath.get(item.path), ...item });
  }
  return order.map((path) => byPath.get(path));
}

// ============================================================
// РАЗДЕЛЫ МЕНЮ
// ============================================================
// У координатора движения в меню тридцать с лишним пунктов подряд. Найти
// среди них «Согласия» можно только перечитав весь список — а читают его
// каждый раз заново, потому что порядок ни на чём не основан.
//
// Пункты те же, ни один не убран: они просто разложены по разделам.
// Открытым остаётся только тот раздел, в котором вы сейчас находитесь.
//
// Раздел пункта определяется по его id — один список на все роли, чтобы
// новый пункт нельзя было завести, забыв про раздел.

const GROUP_TITLES = [
  ['people',   'Люди',                  'users'],
  ['clubs',    'КЮДы',                  'club'],
  ['events',   'Мероприятия и выезды',  'calendar'],
  ['movement', 'Движение',              'chart'],
  ['comms',    'Связь и документы',     'chat'],
  ['service',  'Служебное',             'settings'],
  ['me',       'Моё',                   'user'],
  ['other',    'Прочее',                'grid'],
];

// «main» — то, что остаётся наверху без заголовка: с этого начинают день
const GROUP_OF = {
  dashboard: 'main', attention: 'main', calendar: 'main',
  'coordinator-dashboard': 'main', 'participant-dashboard': 'main',
  'tutor-dashboard': 'main', 'parent-dashboard': 'main',

  participants: 'people', 'admin-users': 'people', 'movement-staff': 'people',
  staff: 'people', 'admin-invite': 'people', 'import-participants': 'people',
  'issue-credentials': 'people', 'tutor-requests': 'people',
  'tutor-invitations': 'people', 'club-president': 'people',
  'staff-calendar': 'people',

  clubs: 'clubs', 'clubs-health': 'clubs', 'clubs-management': 'clubs',
  reports: 'clubs', 'club-analytics': 'clubs', 'club-calendar': 'clubs',
  'club-sessions': 'clubs', 'club-rating': 'clubs', 'club-threads': 'clubs',
  'my-club-events': 'clubs',

  events: 'events', 'event-teams': 'events', 'my-delegations': 'events',
  'my-invitations': 'events', 'my-trips': 'events', achievements: 'events',
  'manage-achievements': 'events', 'my-journal': 'events',
  'tutor-assignments': 'events', 'president-tasks': 'events',

  crm: 'movement', 'movement-year': 'movement', analytics: 'movement',
  goals: 'movement', 'tasks-planner': 'movement',

  appeals: 'comms', 'admin-news': 'comms', 'mass-notifications': 'comms',
  'documents-center': 'comms', documents: 'comms',
  'notification-history': 'comms',

  'consents-management': 'service', 'parent-consents': 'service',
  settings: 'service', 'activity-log': 'service',

  profile: 'me', 'my-achievements': 'me', 'my-reviews': 'me',
};

// Ниже этого числа список и так читается — делить его на разделы значило бы
// прятать половину пунктов за лишний клик
const GROUP_FROM = 13;

function groupMenu(items) {
  if (items.length < GROUP_FROM) return items;

  const top = items.filter((item) => (GROUP_OF[item.id] || 'other') === 'main');
  const groups = [];

  for (const [key, label, icon] of GROUP_TITLES) {
    const children = items.filter((item) => (GROUP_OF[item.id] || 'other') === key);
    if (children.length > 0) {
      groups.push({ id: `group-${key}`, label, icon, children });
    }
  }

  return [...top, ...groups];
}

export function useMenuItems(profile) {
  return useMemo(() => groupMenu(dropDuplicates(buildMenu(profile))), [profile]);
}

function buildMenu(profile) {
  {
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
        { id: 'attention', path: '/attention', icon: 'warning', label: 'Требует внимания' },
        { id: 'crm', path: '/crm', icon: 'building', label: 'CRM' },
        { id: 'clubs-health', path: '/clubs-health', icon: 'club', label: 'Состояние КЮДов' },
        { id: 'movement-year', path: '/movement-year', icon: 'chart', label: 'Год движения' },
        { id: 'movement-staff', path: '/movement-staff', icon: 'users', label: 'Кадры движения' },
        { id: 'admin-users', path: '/admin/users', icon: 'users', label: 'Пользователи' },
        { id: 'admin-invite', path: '/admin/invite', icon: 'mail', label: 'Пригласить' },
        { id: 'issue-credentials', path: '/issue-credentials', icon: 'key', label: 'Выдача доступов' },
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
        { id: 'attention', path: '/attention', icon: 'warning', label: 'Требует внимания' },
        { id: 'crm', path: '/crm', icon: 'building', label: 'CRM' },
        { id: 'coordinator-dashboard', path: '/coordinator-dashboard', icon: 'dashboard', label: 'Дашборд координатора' },
        { id: 'clubs-health', path: '/clubs-health', icon: 'club', label: 'Состояние КЮДов' },
        { id: 'movement-year', path: '/movement-year', icon: 'chart', label: 'Год движения' },
        { id: 'movement-staff', path: '/movement-staff', icon: 'users', label: 'Кадры движения' },
        { id: 'clubs-management', path: '/clubs-management', icon: 'club', label: 'Управление КЮДами' },
        { id: 'admin-users', path: '/admin/users', icon: 'users', label: 'Пользователи' },
        { id: 'admin-invite', path: '/admin/invite', icon: 'mail', label: 'Пригласить' },
        { id: 'event-teams', path: '/event-teams', icon: 'megaphone', label: 'Команды на форумы' },
        { id: 'my-delegations', path: '/my-delegations', icon: 'flag', label: 'Делегации' },
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
        { id: 'attention', path: '/attention', icon: 'warning', label: 'Требует внимания' },
        { id: 'clubs', path: '/clubs', icon: 'club', label: 'Мой КЮД' },
        { id: 'my-invitations', path: '/my-invitations', icon: 'megaphone', label: 'Приглашения на форумы' },
        { id: 'my-delegations', path: '/my-delegations', icon: 'flag', label: 'Мои делегации' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'manage-achievements', path: '/manage-achievements', icon: 'trophy', label: 'Достижения' },
        { id: 'reports', path: '/reports', icon: 'report', label: 'Отчёты' },
        { id: 'documents-center', path: '/documents-center', icon: 'folder', label: 'Документы' },
        { id: 'appeals', path: '/appeals', icon: 'chat', label: 'Обращения в движение' },
        { id: 'club-threads', path: '/club-threads', icon: 'chat', label: 'Переписка КЮДов' },
        { id: 'club-analytics', path: '/club-analytics', icon: 'chart', label: 'Аналитика клуба' },
        { id: 'club-calendar', path: '/club-calendar', icon: 'calendar', label: 'Календарь клуба' },
        { id: 'club-sessions', path: '/club-sessions', icon: 'journal', label: 'Занятия и посещаемость' },
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
        { id: 'my-trips', path: '/my-trips', icon: 'flag', label: 'Мои выезды' },
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
        { id: 'my-delegations', path: '/my-delegations', icon: 'flag', label: 'Мои делегации' },
        { id: 'tutor-invitations', path: '/tutor-invitations', icon: 'mail', label: 'Приглашения' },
        { id: 'my-journal', path: '/my-journal', icon: 'journal', label: 'Мой журнал' },
        { id: 'participants', path: '/participants', icon: 'user', label: 'Участники' },
        { id: 'staff-calendar', path: '/staff-calendar', icon: 'calendar', label: 'Календарь' },
        { id: 'achievements', path: '/achievements', icon: 'trophy', label: 'Достижения' },
        { id: 'documents-center', path: '/documents-center', icon: 'folder', label: 'Документы' },
      ];
    }

    // ============================================================
    // ПРЕЗИДЕНТ / ВИЦЕ-ПРЕЗИДЕНТ
    // ============================================================
    if (role === 'president' || role === 'vice_president') {
      return [
        ...commonItems,
        { id: 'president-tasks', path: '/president-tasks', icon: 'crown', label: 'Задания' },
        { id: 'clubs-health', path: '/clubs-health', icon: 'club', label: 'Состояние КЮДов' },
        { id: 'movement-year', path: '/movement-year', icon: 'chart', label: 'Год движения' },
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
        { id: 'my-trips', path: '/my-trips', icon: 'flag', label: 'Выезды ребёнка' },
        { id: 'events', path: '/events', icon: 'calendar', label: 'Мероприятия' },
        { id: 'calendar', path: '/calendar', icon: 'grid', label: 'Календарь' },
        { id: 'my-achievements', path: '/my-achievements', icon: 'trophy', label: 'Достижения детей' },
      ];
    }

    // ============================================================
    // ПО УМОЛЧАНИЮ
    // ============================================================
    return commonItems;
  }
}

export default useMenuItems;