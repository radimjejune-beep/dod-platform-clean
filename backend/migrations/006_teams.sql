-- ============================================================
-- КОМАНДЫ КЛУБОВ НА ФОРУМЫ И ВЫЕЗДЫ
-- ============================================================
-- Раньше сбор шёл вручную: письмо руководителям, ссылка на Google-форму,
-- ответы в мессенджер, сведение в таблицу руками. Помимо трудозатрат это
-- означало, что списки детей с датами рождения, школами и телефонами
-- родителей ходили по мессенджерам и зарубежному сервису форм.
--
-- Применять после 005_club_staff.sql.
-- ============================================================

-- ============================================================
-- ПРИГЛАШЕНИЕ КЛУБА НА МЕРОПРИЯТИЕ
-- ============================================================
-- Расширяем существующую event_club_targets, а не заводим новую таблицу.
ALTER TABLE "public"."event_club_targets"
    ADD COLUMN IF NOT EXISTS "invited_by" uuid,
    ADD COLUMN IF NOT EXISTS "invited_at" timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS "deadline" date,
    ADD COLUMN IF NOT EXISTS "quota" integer,
    ADD COLUMN IF NOT EXISTS "allow_escorts" boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "message" text;

COMMENT ON COLUMN "public"."event_club_targets"."quota" IS
    'Сколько человек от клуба. NULL — без ограничения. Задаётся заранее, до отправки приглашения.';
COMMENT ON COLUMN "public"."event_club_targets"."allow_escorts" IS
    'Можно ли включать в команду сопровождающих взрослых. Нужно не на каждом мероприятии.';

-- ============================================================
-- КОМАНДА ОТ КЛУБА
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."team_submissions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "club_id" uuid NOT NULL,
    "status" character varying(24) DEFAULT 'draft' NOT NULL,
    "created_by" uuid,
    "submitted_by" uuid,
    "submitted_at" timestamptz,
    "reviewed_by" uuid,
    "reviewed_at" timestamptz,
    "review_comment" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "team_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "team_submissions_event_club_key" UNIQUE ("event_id", "club_id"),
    CONSTRAINT "team_submissions_status_check" CHECK (
        "status" IN ('draft', 'submitted', 'approved', 'revision_requested')
    ),
    CONSTRAINT "team_submissions_event_fkey" FOREIGN KEY ("event_id")
        REFERENCES "public"."events"("id") ON DELETE CASCADE,
    CONSTRAINT "team_submissions_club_fkey" FOREIGN KEY ("club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE
) WITH (oids = false);

COMMENT ON TABLE "public"."team_submissions" IS
    'Заявка клуба на мероприятие. Отказа «окончательно» нет: возврат на доработку покрывает все случаи.';

CREATE INDEX IF NOT EXISTS "idx_team_submissions_event" ON "public"."team_submissions" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_team_submissions_club" ON "public"."team_submissions" ("club_id");
CREATE INDEX IF NOT EXISTS "idx_team_submissions_status" ON "public"."team_submissions" ("status");

-- ============================================================
-- УЧАСТНИКИ КОМАНДЫ
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "submission_id" uuid NOT NULL,
    "participant_id" uuid,
    "role_in_team" character varying(16) DEFAULT 'student' NOT NULL,

    -- Снимок данных на момент подачи. Карточка потом изменится: ребёнок
    -- перейдёт в другой класс, сменит телефон, уйдёт из клуба — а список
    -- поехавших на форум в марте должен остаться таким, каким его подали.
    "full_name" character varying(255) NOT NULL,
    "birth_date" date,
    "city" character varying(120),
    "school_full_name" character varying(300),
    "class_name" character varying(50),
    "parent_full_name" character varying(255),
    "parent_phone" character varying(30),
    "participant_phone" character varying(30),

    -- Дополнительная программа за свой счёт
    "extra_program" boolean DEFAULT false,
    "extra_program_ack" boolean DEFAULT false,

    "comment" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "team_members_role_check" CHECK ("role_in_team" IN ('student', 'captain', 'escort')),
    CONSTRAINT "team_members_submission_fkey" FOREIGN KEY ("submission_id")
        REFERENCES "public"."team_submissions"("id") ON DELETE CASCADE,
    CONSTRAINT "team_members_participant_fkey" FOREIGN KEY ("participant_id")
        REFERENCES "public"."users"("id") ON DELETE SET NULL
) WITH (oids = false);

COMMENT ON COLUMN "public"."team_members"."participant_id" IS
    'Ссылка на карточку участника. По ней проверяются согласия родителей. NULL допустим для сопровождающих взрослых.';
COMMENT ON COLUMN "public"."team_members"."full_name" IS
    'Снимок на момент подачи: карточка изменится, а поданный список должен остаться прежним.';

-- Один человек — один раз в команде
CREATE UNIQUE INDEX IF NOT EXISTS "idx_team_members_unique_participant"
    ON "public"."team_members" ("submission_id", "participant_id")
    WHERE "participant_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_team_members_submission" ON "public"."team_members" ("submission_id");

-- ============================================================
-- ДОКУМЕНТЫ, УДОСТОВЕРЯЮЩИЕ ЛИЧНОСТЬ — ОТДЕЛЬНАЯ ТАБЛИЦА
-- ============================================================
-- Вынесено намеренно. Паспортные данные и данные свидетельства о
-- рождении — чувствительные сведения, и держать их в общей таблице,
-- которую читает каждый список, нельзя.
--
-- Отдельная таблица позволяет: не тянуть документ в списки случайно,
-- ограничить доступ отдельной проверкой прав, и удалить документы после
-- мероприятия, не трогая сам состав команды.
CREATE TABLE IF NOT EXISTS "public"."team_member_documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "member_id" uuid NOT NULL,
    "document_type" character varying(30) NOT NULL,  -- passport | birth_certificate
    "series_number" character varying(60),
    "issued_by" text,
    "issued_at" date,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "purged_at" timestamptz,
    CONSTRAINT "team_member_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "team_member_documents_member_key" UNIQUE ("member_id"),
    CONSTRAINT "team_member_documents_type_check" CHECK (
        "document_type" IN ('passport', 'birth_certificate')
    ),
    CONSTRAINT "team_member_documents_member_fkey" FOREIGN KEY ("member_id")
        REFERENCES "public"."team_members"("id") ON DELETE CASCADE
) WITH (oids = false);

COMMENT ON TABLE "public"."team_member_documents" IS
    'Данные документов участников команды. Чувствительные сведения: доступ только у руководителя КЮДа, подавшего заявку, и координаторов движения. После мероприятия подлежат удалению — см. purged_at.';
COMMENT ON COLUMN "public"."team_member_documents"."purged_at" IS
    'Когда данные документа были удалены после мероприятия. Строка остаётся, чтобы было видно, что документ был и когда его убрали.';
