// frontend/src/lib/myClub.js
//
// Клуб, в котором работает человек.
//
// По всему фронтенду это искали так:
//
//     clubs.find(c => c.coordinator_id === me.id || c.leader_id === me.id)
//
// coordinator_id и leader_id — поля старой модели, где у клуба был ровно
// один координатор. С миграции 005 должности живут в club_staff, а колонки
// остались и почти везде пустые. Клуб не находился — и руководитель КЮДа
// видел пустой экран: ни достижений, ни сотрудников, ни аналитики, ни
// рейтинга своего клуба. Ошибку было не видно: страница не падала и не
// ругалась, она просто показывала пустоту, как будто в клубе ничего нет.
//
// Источник правды — club_id из /api/me: сервер проставляет его сам.
// Старые поля оставлены запасным путём, пока не вычищены из базы.

export function findMyClub(clubs, profile) {
  if (!profile || !Array.isArray(clubs)) return null;

  if (profile.club_id) {
    const byId = clubs.find((c) => c.id === profile.club_id);
    if (byId) return byId;
  }

  return clubs.find(
    (c) => (c.coordinator_id && c.coordinator_id === profile.id)
        || (c.leader_id && c.leader_id === profile.id)
  ) || null;
}

// Тот же вопрос про конкретный клуб: «это мой?»
export function isMyClub(profile, club) {
  if (!profile || !club) return false;
  if (profile.club_id && club.id === profile.club_id) return true;
  return (club.coordinator_id && club.coordinator_id === profile.id)
      || (club.leader_id && club.leader_id === profile.id);
}
