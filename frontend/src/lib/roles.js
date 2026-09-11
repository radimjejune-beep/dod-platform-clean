// frontend/src/lib/roles.js
//
// Названия ролей по-русски.
//
// Раньше этот словарь был скопирован в четырёх файлах — с разным
// набором ролей: в приглашениях не было участника и родителя, в
// остальных местах роль и вовсе выводилась как есть, и пользователь
// видел «admin» и «movement_coordinator».

export const ROLE_LABELS = {
  admin: 'Администратор',
  movement_coordinator: 'Координатор движения',
  club_coordinator: 'Руководитель КЮДа',
  tutor: 'Тьютор',
  participant: 'Участник',
  parent: 'Законный представитель',
  president: 'Президент',
  vice_president: 'Вице-президент'
};

// Неизвестное значение возвращаем как есть: в некоторых таблицах в поле
// role лежит не системная роль, а свободный текст (например, роль
// сопровождающего на мероприятии).
export function roleLabel(role) {
  if (!role) return '—';
  return ROLE_LABELS[role] || role;
}

export default roleLabel;
