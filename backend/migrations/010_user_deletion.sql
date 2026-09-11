-- ============================================================
-- УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ПЕРЕСТАЁТ БЛОКИРОВАТЬСЯ
-- ============================================================
-- Что было не так.
-- Удалить пользователя было нельзя: десять внешних ключей ссылались на
-- users(id) без правила ON DELETE, а это значит «запретить удаление».
-- Сервер получал отказ от базы, ловил его общим обработчиком и отвечал
-- «Внутренняя ошибка сервера» — то есть человек видел поломку там, где
-- на самом деле сработало ограничение целостности.
--
-- Ключи эти — авторство: кто создал мероприятие, кто выдал достижение,
-- кто пригласил тьютора. Правильное поведение при удалении автора —
-- не запрещать удаление и не сносить запись следом, а забыть автора.
-- Мероприятие остаётся, достижение у ребёнка остаётся, а поле «кто
-- создал» становится пустым. Ровно так уже вёл себя журнал действий.
--
-- Исключение — announcements.created_by: поле объявлено NOT NULL, и
-- обнулить его нельзя. Объявления удаляются вместе с автором: это
-- короткие сообщения на доске, а не документы движения.
--
-- Почему удаление вообще должно работать. По 152-ФЗ отзыв согласия
-- влечёт уничтожение персональных данных. Если удалить участника
-- физически невозможно, выполнить это требование нечем.
--
-- Применять после 009_club_membership.sql.
-- ============================================================

-- Авторство: забываем автора, запись остаётся
ALTER TABLE "public"."achievements"
    DROP CONSTRAINT IF EXISTS "achievements_added_by_fkey";
ALTER TABLE "public"."achievements"
    ADD CONSTRAINT "achievements_added_by_fkey"
    FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."appeals"
    DROP CONSTRAINT IF EXISTS "appeals_coordinator_id_fkey";
ALTER TABLE "public"."appeals"
    ADD CONSTRAINT "appeals_coordinator_id_fkey"
    FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."event_tutors"
    DROP CONSTRAINT IF EXISTS "event_tutors_invited_by_fkey";
ALTER TABLE "public"."event_tutors"
    ADD CONSTRAINT "event_tutors_invited_by_fkey"
    FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events"
    DROP CONSTRAINT IF EXISTS "events_created_by_fkey";
ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events"
    DROP CONSTRAINT IF EXISTS "events_moderated_by_fkey";
ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_moderated_by_fkey"
    FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events"
    DROP CONSTRAINT IF EXISTS "events_proposed_by_fkey";
ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_proposed_by_fkey"
    FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."news"
    DROP CONSTRAINT IF EXISTS "news_created_by_fkey";
ALTER TABLE "public"."news"
    ADD CONSTRAINT "news_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Кто завёл учётную запись: при удалении того администратора запись
-- сотрудника остаётся, просто автор неизвестен
ALTER TABLE "public"."users"
    DROP CONSTRAINT IF EXISTS "users_created_by_fkey";
ALTER TABLE "public"."users"
    ADD CONSTRAINT "users_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Президент клуба: клуб остаётся, должность освобождается
ALTER TABLE "public"."clubs"
    DROP CONSTRAINT IF EXISTS "clubs_president_id_fkey";
ALTER TABLE "public"."clubs"
    ADD CONSTRAINT "clubs_president_id_fkey"
    FOREIGN KEY ("president_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Объявления: поле автора NOT NULL, обнулить нельзя — удаляем вместе
ALTER TABLE "public"."announcements"
    DROP CONSTRAINT IF EXISTS "announcements_created_by_fkey";
ALTER TABLE "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;
