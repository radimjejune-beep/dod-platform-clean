-- ============================================================
-- ПОДКЛЮЧЕНИЕ ПО ТЕЛЕМОСТУ К МЕРОПРИЯТИЮ
-- ============================================================
-- Часть мероприятий КЮДов можно смотреть удалённо: заболевшему
-- участнику, родителям, соседнему клубу. Раньше об этом сообщали
-- отдельно в мессенджере, и ссылка терялась.
--
-- telemost_allowed — клуб допускает подключение по Телемосту.
-- telemost_url     — сама ссылка на подключение. Может быть пустой,
--                    если ссылку ещё не создали: тогда участники видят
--                    только отметку, что подключиться будет можно.
--
-- Применять после 023_practice_b2_vocabulary.sql.
-- ============================================================

ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "telemost_allowed" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "telemost_url" varchar(500);

COMMENT ON COLUMN "public"."events"."telemost_allowed" IS
    'Клуб допускает подключение к мероприятию по Телемосту';
COMMENT ON COLUMN "public"."events"."telemost_url" IS
    'Ссылка на подключение по Телемосту (https://...), может быть пустой';

-- Проверка после применения — должны вернуться две строки:
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'events' AND column_name LIKE 'telemost%';
