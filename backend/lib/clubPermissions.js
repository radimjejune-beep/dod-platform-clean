// backend/lib/clubPermissions.js
//
// Права сотрудников внутри КЮДа.
//
// Должность — это позиция в КОНКРЕТНОМ клубе, а не глобальная роль
// пользователя. Один человек может быть руководителем одного КЮДа и
// методистом другого.
//
// Матрица собрана в одном месте намеренно: раньше проверки вида
// role === 'club_coordinator' были рассыпаны по двум десяткам мест в
// server.js, и изменить правило означало найти их все.

export const CLUB_POSITIONS = ['head', 'deputy', 'methodist', 'curator', 'assistant'];

export const CLUB_POSITION_LABELS = {
  head: 'Руководитель КЮДа',
  deputy: 'Заместитель руководителя',
  methodist: 'Методист',
  curator: 'Куратор',
  assistant: 'Помощник'
};

// Что вообще можно делать в клубе
export const CLUB_CAPABILITIES = [
  'view_participants',    // видеть участников клуба
  'manage_participants',  // добавлять и убирать участников
  'edit_participant',     // править данные участника
  'create_events',        // создавать мероприятия клуба
  'moderate_events',      // одобрять и отклонять мероприятия
  'write_notes',          // писать заметки об участниках
  'view_all_notes',       // видеть все заметки клуба, а не только свои
  'grant_achievements',   // выдавать достижения
  'submit_reports',       // сдавать отчёты за клуб
  'create_appeals',       // писать обращения в движение
  'assign_president',     // назначать президента клуба
  'invite_tutors',        // приглашать тьюторов
  'form_team',            // собирать команду на форум
  'submit_team',          // отправлять команду на утверждение
  'manage_staff',         // управлять составом сотрудников
  'view_consents',        // видеть согласия родителей
  'manage_sessions'       // проводить занятия клуба и отмечать посещаемость
];

function build(list) {
  const p = {};
  for (const c of CLUB_CAPABILITIES) p[c] = list.includes(c);
  return Object.freeze(p);
}

export const CLUB_POSITION_PERMISSIONS = Object.freeze({
  // Руководитель отвечает за клуб целиком
  head: build(CLUB_CAPABILITIES),

  // Заместитель замещает во всём, кроме двух вещей:
  //   submit_team  — подпись под списком детей, едущих на выезд,
  //                  должна быть персональной
  //   manage_staff — иначе заместитель назначит себе заместителя
  deputy: build([
    'view_participants', 'manage_participants', 'edit_participant',
    'create_events', 'moderate_events', 'write_notes', 'view_all_notes',
    'grant_achievements', 'submit_reports', 'create_appeals',
    'assign_president', 'invite_tutors', 'form_team', 'view_consents',
    'manage_sessions'
  ]),

  // Методист ведёт процесс: программы, мероприятия, отчётность.
  // Состав клуба не меняет, обращения не пишет.
  methodist: build([
    'view_participants', 'edit_participant', 'create_events',
    'write_notes', 'grant_achievements', 'submit_reports',
    'invite_tutors', 'view_consents', 'manage_sessions'
  ]),

  // Куратор работает с детьми. Организационных прав нет.
  // view_all_notes отсутствует намеренно: свои заметки видит всегда,
  // чужие — нет.
  // Занятия чаще всего ведёт именно куратор, поэтому отмечать
  // посещаемость он должен — иначе журнал будет вести кто-то другой
  // с его слов, а это худший способ вести журнал.
  curator: build([
    'view_participants', 'write_notes', 'grant_achievements', 'manage_sessions'
  ]),

  // Помощник — доступ на чтение. Волонтёр, практикант, новый сотрудник.
  assistant: build(['view_participants'])
});

// Координаторы движения и админы могут в клубе всё
export const ALL_CLUB_PERMISSIONS = build(CLUB_CAPABILITIES);
export const NO_CLUB_PERMISSIONS = build([]);

export function permissionsForPosition(position) {
  return CLUB_POSITION_PERMISSIONS[position] || NO_CLUB_PERMISSIONS;
}
