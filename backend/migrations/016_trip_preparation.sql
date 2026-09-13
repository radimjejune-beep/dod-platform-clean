-- 016_trip_preparation.sql
--
-- Подготовка к выезду: что сделать, какие документы, какие билеты.
--
-- До сих пор платформа доводила ребёнка до состава утверждённой команды и
-- там останавливалась. Всё, что происходит дальше — собрать справки, купить
-- билеты, узнать время сбора — жило в родительском чате, а руководитель
-- делегации выяснял, кто когда прилетает, обзванивая семьи накануне.
--
-- Три таблицы:
--   trip_checklist_items    — что нужно сделать (пункт списка подготовки)
--   trip_checklist_progress — кто что отметил
--   trip_travel             — билеты: рейс, время, куда прибывает
--
-- Пункт движения (club_id IS NULL) виден всем клубам этого мероприятия.
-- Пункт КЮДа виден только его делегации: «сбор у школы в шесть утра»
-- остальным клубам ни к чему.

-- ============================================================
-- МЕРОПРИЯТИЕ: КТО ПОКУПАЕТ БИЛЕТЫ И ГДЕ СБОР
-- ============================================================
ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "tickets_by" character varying(20) DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS "gathering_info" text;

COMMENT ON COLUMN "public"."events"."tickets_by" IS
  'Кто покупает билеты: family — каждая семья сама, club — КЮД на всю группу, movement — движение. Задаётся при создании мероприятия.';
COMMENT ON COLUMN "public"."events"."gathering_info" IS
  'Место и время сбора, что сообщить родителям. Видно участникам утверждённых команд.';

-- ============================================================
-- РУКОВОДИТЕЛЬ ДЕЛЕГАЦИИ
-- ============================================================
-- Роль на один выезд, а не должность в клубе. В марте детей везёт учитель
-- истории, в мае — заместитель руководителя КЮДа. Если бы это была
-- клубная должность, учителю ради одной поездки пришлось бы открыть
-- заметки о детях, отчёты и состав клуба на весь год.
ALTER TABLE "public"."team_submissions"
  ADD COLUMN IF NOT EXISTS "leader_user_id" uuid,
  ADD COLUMN IF NOT EXISTS "leader_name" character varying(255),
  ADD COLUMN IF NOT EXISTS "leader_phone" character varying(30),
  ADD COLUMN IF NOT EXISTS "leader_note" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_submissions_leader_fkey') THEN
    ALTER TABLE "public"."team_submissions"
      ADD CONSTRAINT "team_submissions_leader_fkey" FOREIGN KEY ("leader_user_id")
      REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN "public"."team_submissions"."leader_user_id" IS
  'Руководитель делегации, если у него есть вход в платформу. Доступ к делегации даёт именно эта запись, а не глобальная роль.';
COMMENT ON COLUMN "public"."team_submissions"."leader_name" IS
  'Руководитель без входа в платформу — например, учитель школы. Тогда список подготовки ведёт руководитель КЮДа.';

-- ============================================================
-- ПУНКТЫ ПОДГОТОВКИ
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."trip_checklist_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "club_id" uuid,
    "title" character varying(200) NOT NULL,
    "description" text,
    "responsible" character varying(20) DEFAULT 'participant' NOT NULL,
    "kind" character varying(20) DEFAULT 'check' NOT NULL,
    "is_required" boolean DEFAULT true,
    "due_date" date,
    "sort_order" integer DEFAULT 0,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "trip_checklist_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_checklist_items_responsible_check"
        CHECK ("responsible" IN ('participant', 'leader')),
    CONSTRAINT "trip_checklist_items_kind_check"
        CHECK ("kind" IN ('check', 'file', 'ticket')),
    CONSTRAINT "trip_checklist_items_event_fkey" FOREIGN KEY ("event_id")
        REFERENCES "public"."events"("id") ON DELETE CASCADE,
    CONSTRAINT "trip_checklist_items_club_fkey" FOREIGN KEY ("club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE
) WITH (oids = false);

COMMENT ON COLUMN "public"."trip_checklist_items"."club_id" IS
  'NULL — пункт движения, общий для всех клубов. Заполнен — пункт одного КЮДа, остальные делегации его не видят.';
COMMENT ON COLUMN "public"."trip_checklist_items"."responsible" IS
  'participant — отмечает участник или его родитель; leader — руководитель делегации, пункт на всю группу.';
COMMENT ON COLUMN "public"."trip_checklist_items"."kind" IS
  'check — просто отметка; file — нужно приложить файл; ticket — заполняются данные проезда в trip_travel.';

CREATE INDEX IF NOT EXISTS "idx_trip_items_event" ON "public"."trip_checklist_items" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_trip_items_club" ON "public"."trip_checklist_items" ("club_id");

-- ============================================================
-- ОТМЕТКИ О ВЫПОЛНЕНИИ
-- ============================================================
-- Привязка к team_members, а не к участнику: один и тот же ребёнок за год
-- ездит на несколько форумов, и подготовка у каждого своя.
CREATE TABLE IF NOT EXISTS "public"."trip_checklist_progress" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "item_id" uuid NOT NULL,
    "member_id" uuid NOT NULL,
    "done" boolean DEFAULT false,
    "done_at" timestamptz,
    "done_by" uuid,
    "comment" text,
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "trip_checklist_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_checklist_progress_key" UNIQUE ("item_id", "member_id"),
    CONSTRAINT "trip_checklist_progress_item_fkey" FOREIGN KEY ("item_id")
        REFERENCES "public"."trip_checklist_items"("id") ON DELETE CASCADE,
    CONSTRAINT "trip_checklist_progress_member_fkey" FOREIGN KEY ("member_id")
        REFERENCES "public"."team_members"("id") ON DELETE CASCADE
) WITH (oids = false);

CREATE INDEX IF NOT EXISTS "idx_trip_progress_member" ON "public"."trip_checklist_progress" ("member_id");

-- ============================================================
-- ПРОЕЗД
-- ============================================================
-- Отдельной таблицей, потому что руководителю делегации нужна не галочка
-- «билеты куплены», а сводка: кто, чем и во сколько приезжает. Без неё
-- встречу собирают обзвоном родителей накануне вылета.
CREATE TABLE IF NOT EXISTS "public"."trip_travel" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "member_id" uuid NOT NULL,
    "direction" character varying(10) NOT NULL,
    "mode" character varying(20),
    "carrier_number" character varying(60),
    "depart_at" timestamptz,
    "arrive_at" timestamptz,
    "point_name" character varying(200),
    "bought" boolean DEFAULT false,
    "comment" text,
    "updated_by" uuid,
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "trip_travel_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_travel_key" UNIQUE ("member_id", "direction"),
    CONSTRAINT "trip_travel_direction_check" CHECK ("direction" IN ('there', 'back')),
    CONSTRAINT "trip_travel_mode_check"
        CHECK ("mode" IS NULL OR "mode" IN ('plane', 'train', 'bus', 'car', 'other')),
    CONSTRAINT "trip_travel_member_fkey" FOREIGN KEY ("member_id")
        REFERENCES "public"."team_members"("id") ON DELETE CASCADE
) WITH (oids = false);

COMMENT ON COLUMN "public"."trip_travel"."point_name" IS
  'Аэропорт, вокзал или место высадки — то, куда руководителю делегации ехать встречать.';

CREATE INDEX IF NOT EXISTS "idx_trip_travel_member" ON "public"."trip_travel" ("member_id");
