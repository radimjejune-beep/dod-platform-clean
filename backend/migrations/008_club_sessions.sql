-- ============================================================
-- ЗАНЯТИЯ КЮДА И ПОСЕЩАЕМОСТЬ
-- ============================================================
-- Зачем.
-- Платформа до сих пор была нужна несколько раз в год: форум, отчёт,
-- ещё форум. Клуб же собирается еженедельно, и вся эта работа нигде не
-- отражалась. Отчёт за месяц руководитель писал по памяти, а то, что
-- участник перестал ходить, выяснялось в конце года.
--
-- Что храним: сами занятия и отметки присутствия по каждому участнику.
--
-- Почему четыре статуса, а не галочка. «Прогулял» и «болел» — разные
-- разговоры с родителем. Если оставить галочку, руководитель начнёт
-- дописывать причину в комментарий, и посчитать что-либо станет
-- невозможно.
--
-- Применять после 007_parent_invitations.sql.
-- ============================================================

-- 1. ЗАНЯТИЕ
CREATE TABLE IF NOT EXISTS "public"."club_sessions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "club_id" uuid NOT NULL,

    "session_date" date NOT NULL,
    "started_at" time,
    "duration_minutes" integer,
    "topic" text,
    "location" text,

    -- planned — занятие назначено, ещё не проведено
    -- held    — проведено, посещаемость отмечена
    -- cancelled — не состоялось, причина обязательна
    "status" text NOT NULL DEFAULT 'planned',
    "cancel_reason" text,

    "conducted_by" uuid,
    "notes" text,

    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT "club_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_sessions_status_check"
        CHECK ("status" IN ('planned', 'held', 'cancelled')),
    -- Отменённое занятие без причины — это просто пропавшее занятие
    CONSTRAINT "club_sessions_cancel_reason_check"
        CHECK ("status" <> 'cancelled' OR "cancel_reason" IS NOT NULL)
) WITH (oids = false);

ALTER TABLE "public"."club_sessions"
    DROP CONSTRAINT IF EXISTS "club_sessions_club_id_fkey";
ALTER TABLE "public"."club_sessions"
    ADD CONSTRAINT "club_sessions_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;

ALTER TABLE "public"."club_sessions"
    DROP CONSTRAINT IF EXISTS "club_sessions_conducted_by_fkey";
ALTER TABLE "public"."club_sessions"
    ADD CONSTRAINT "club_sessions_conducted_by_fkey"
    FOREIGN KEY ("conducted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."club_sessions"
    DROP CONSTRAINT IF EXISTS "club_sessions_created_by_fkey";
ALTER TABLE "public"."club_sessions"
    ADD CONSTRAINT "club_sessions_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Список занятий клуба за период — самый частый запрос
CREATE INDEX IF NOT EXISTS "idx_club_sessions_club_date"
    ON "public"."club_sessions" ("club_id", "session_date" DESC);

COMMENT ON TABLE "public"."club_sessions" IS 'Занятия клуба юных дипломатов';
COMMENT ON COLUMN "public"."club_sessions"."status" IS 'planned | held | cancelled';


-- 2. ПОСЕЩАЕМОСТЬ
CREATE TABLE IF NOT EXISTS "public"."session_attendance" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL,
    "participant_id" uuid NOT NULL,

    -- present  — был
    -- late     — опоздал
    -- absent   — не был
    -- excused  — не был по уважительной причине
    "status" text NOT NULL DEFAULT 'present',
    "comment" text,

    "marked_by" uuid,
    "marked_at" timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT "session_attendance_pkey" PRIMARY KEY ("id"),
    -- Один участник — одна отметка на занятии
    CONSTRAINT "session_attendance_unique" UNIQUE ("session_id", "participant_id"),
    CONSTRAINT "session_attendance_status_check"
        CHECK ("status" IN ('present', 'late', 'absent', 'excused'))
) WITH (oids = false);

ALTER TABLE "public"."session_attendance"
    DROP CONSTRAINT IF EXISTS "session_attendance_session_id_fkey";
ALTER TABLE "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "public"."club_sessions"("id") ON DELETE CASCADE;

ALTER TABLE "public"."session_attendance"
    DROP CONSTRAINT IF EXISTS "session_attendance_participant_id_fkey";
ALTER TABLE "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."session_attendance"
    DROP CONSTRAINT IF EXISTS "session_attendance_marked_by_fkey";
ALTER TABLE "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_marked_by_fkey"
    FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Посещаемость одного участника за период — для его карточки и рейтинга
CREATE INDEX IF NOT EXISTS "idx_session_attendance_participant"
    ON "public"."session_attendance" ("participant_id");

CREATE INDEX IF NOT EXISTS "idx_session_attendance_session"
    ON "public"."session_attendance" ("session_id");

COMMENT ON TABLE "public"."session_attendance" IS 'Отметки присутствия на занятиях клуба';
COMMENT ON COLUMN "public"."session_attendance"."status" IS 'present | late | absent | excused';
