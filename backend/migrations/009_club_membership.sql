-- ============================================================
-- ОДИН ИСТОЧНИК СОСТАВА КЛУБА
-- ============================================================
-- Что было не так.
-- Состав клуба хранился в двух местах: поле users.club_id и таблица
-- club_participants. При переводе участника в другой клуб поле
-- обновлялось, а в club_participants просто добавлялась ещё одна
-- строка — прежняя оставалась активной. Человек начинал числиться
-- сразу в двух клубах.
--
-- Видно это было так: в списке КЮДов у Владивостока значилось шесть
-- участников, а в журнале занятий и в отчёте — три. Три из шести
-- давно перешли в другие клубы.
--
-- Почему это опаснее, чем выглядит. Лист посещаемости, приглашения
-- родителям и подсчёт для отчёта берут состав из users.club_id. Счётчик
-- в списке клубов брал его из club_participants. Пока числа расходятся,
-- руководитель не может доверять ни одному из них.
--
-- Решение. users.club_id — единственный источник истины: участник
-- состоит ровно в одном клубе. club_participants остаётся историей
-- членства: когда пришёл и когда ушёл. Считать по ней состав больше
-- нельзя, и ниже это закреплено комментарием к таблице.
--
-- Применять после 008_club_sessions.sql.
-- ============================================================

-- 1. Когда человек ушёл из клуба — раньше это было негде записать
ALTER TABLE "public"."club_participants"
    ADD COLUMN IF NOT EXISTS "left_at" timestamptz;

-- 2. Закрываем записи, которые разошлись с действительностью:
--    участник числится активным в клубе, в котором больше не состоит
UPDATE "public"."club_participants" cp
   SET "status" = 'left',
       "left_at" = COALESCE(cp."left_at", now())
 WHERE cp."status" = 'active'
   AND NOT EXISTS (
         SELECT 1 FROM "public"."users" u
          WHERE u."id" = cp."profile_id"
            AND u."club_id" = cp."club_id"
       );

-- 3. И наоборот: участник состоит в клубе, но записи о членстве нет —
--    заводим её, чтобы история не начиналась с пустоты
INSERT INTO "public"."club_participants" ("profile_id", "club_id", "status", "joined_at")
SELECT u."id", u."club_id", 'active', COALESCE(u."created_at", now())
  FROM "public"."users" u
 WHERE u."club_id" IS NOT NULL
   AND u."role" = 'participant'
   AND NOT EXISTS (
         SELECT 1 FROM "public"."club_participants" cp
          WHERE cp."profile_id" = u."id" AND cp."club_id" = u."club_id"
       )
ON CONFLICT ("profile_id", "club_id") DO NOTHING;

-- 4. Быстрый поиск действующего членства
CREATE INDEX IF NOT EXISTS "idx_club_participants_active"
    ON "public"."club_participants" ("club_id")
    WHERE "status" = 'active';

COMMENT ON TABLE "public"."club_participants" IS
    'История членства в клубах. Действующий состав берётся из users.club_id, а не отсюда.';
COMMENT ON COLUMN "public"."club_participants"."left_at" IS
    'Когда участник перестал состоять в этом клубе';
