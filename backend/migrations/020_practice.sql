-- ============================================================
-- ТРЕНАЖЁР И ТЕСТЫ
-- ============================================================
-- Две разные по смыслу вещи с одним устройством внутри:
--
--   • наборы движения — короткие упражнения по грамматике и лексике,
--     чтобы язык не забывался между занятиями. Их проходят сколько
--     угодно раз, и задания каждый раз идут в другом порядке;
--   • тесты КЮДа — то, что сотрудник клуба даёт своим участникам.
--
-- Отличаются они областью видимости и тем, можно ли перепроходить.
-- Заводить под это две таблицы значило бы дважды написать проверку
-- ответов — а проверка ответов должна быть ровно в одном месте.
--
-- Ответы лежат в базе и НИКОГДА не уходят на клиент: сверяет сервер.
-- Иначе правильный ответ видно в инструментах разработчика, и любой
-- ребёнок, который до этого додумается, пройдёт всё за минуту.
--
-- Применять после 019_report_deadline.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."practice_sets" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" text,

    -- grammar / vocabulary — тренажёр движения, test — тест КЮДа
    "kind" character varying(20) DEFAULT 'grammar' NOT NULL,

    -- movement виден всем, club — только участникам своего КЮДа
    "scope" character varying(10) DEFAULT 'club' NOT NULL,
    "club_id" uuid,

    -- Ступень: 1 — младшие, 2 — средние, 3 — старшие. NULL — для всех
    "level" integer,

    "is_published" boolean DEFAULT false,
    "allow_retry" boolean DEFAULT true,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),

    CONSTRAINT "practice_sets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "practice_sets_kind_check"
        CHECK ("kind" IN ('grammar', 'vocabulary', 'test')),
    CONSTRAINT "practice_sets_scope_check"
        CHECK ("scope" IN ('movement', 'club')),
    -- Набор клуба без клуба увидеть некому, набор движения к клубу не
    -- привязан: и то и другое — ошибка, которую лучше поймать здесь
    CONSTRAINT "practice_sets_scope_club_check" CHECK (
        ("scope" = 'club'     AND "club_id" IS NOT NULL) OR
        ("scope" = 'movement' AND "club_id" IS NULL)
    ),
    CONSTRAINT "practice_sets_level_check"
        CHECK ("level" IS NULL OR "level" BETWEEN 1 AND 3),
    CONSTRAINT "practice_sets_club_fkey" FOREIGN KEY ("club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE,
    CONSTRAINT "practice_sets_author_fkey" FOREIGN KEY ("created_by")
        REFERENCES "public"."users"("id") ON DELETE SET NULL
) WITH (oids = false);

CREATE INDEX IF NOT EXISTS "idx_practice_sets_club" ON "public"."practice_sets" ("club_id");
CREATE INDEX IF NOT EXISTS "idx_practice_sets_published" ON "public"."practice_sets" ("is_published");

COMMENT ON COLUMN "public"."practice_sets"."allow_retry" IS
    'Тренажёр перепроходят сколько угодно раз, контрольный тест — обычно один.';

-- ============================================================
-- ЗАДАНИЯ
-- ============================================================
-- Пять видов, и все пять проверяются без человека — иначе тренажёр
-- работает только там, где есть тьютор, готовый читать ответы каждую
-- неделю. Таких КЮДов у нас единицы.
--
--   choice — один правильный вариант
--   multi  — несколько правильных
--   gap    — вписать слово (сверяем по списку допустимых написаний)
--   match  — соотнести пары
--   order  — расставить по порядку
--
-- payload — то, что видит ребёнок (варианты, пары, куски предложения).
-- answer — то, с чем сверяет сервер. На клиент answer не уходит.
CREATE TABLE IF NOT EXISTS "public"."practice_tasks" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "set_id" uuid NOT NULL,
    "kind" character varying(10) NOT NULL,
    "prompt" text NOT NULL,
    "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "answer" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "hint" text,
    "explanation" text,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "practice_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "practice_tasks_kind_check"
        CHECK ("kind" IN ('choice', 'multi', 'gap', 'match', 'order')),
    CONSTRAINT "practice_tasks_set_fkey" FOREIGN KEY ("set_id")
        REFERENCES "public"."practice_sets"("id") ON DELETE CASCADE
) WITH (oids = false);

CREATE INDEX IF NOT EXISTS "idx_practice_tasks_set" ON "public"."practice_tasks" ("set_id", "sort_order");

COMMENT ON COLUMN "public"."practice_tasks"."explanation" IS
    'Показывается после ответа. Разбор важнее оценки: иначе ребёнок видит «неверно» и не узнаёт почему.';

-- ============================================================
-- ПРОХОЖДЕНИЯ
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."practice_runs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "set_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "score" integer DEFAULT 0,
    "total" integer DEFAULT 0,
    "started_at" timestamptz DEFAULT now(),
    "finished_at" timestamptz,
    CONSTRAINT "practice_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "practice_runs_set_fkey" FOREIGN KEY ("set_id")
        REFERENCES "public"."practice_sets"("id") ON DELETE CASCADE,
    CONSTRAINT "practice_runs_user_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."users"("id") ON DELETE CASCADE
) WITH (oids = false);

CREATE INDEX IF NOT EXISTS "idx_practice_runs_user" ON "public"."practice_runs" ("user_id", "set_id");

CREATE TABLE IF NOT EXISTS "public"."practice_answers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "run_id" uuid NOT NULL,
    "task_id" uuid NOT NULL,
    "given" jsonb,
    "correct" boolean DEFAULT false,
    "answered_at" timestamptz DEFAULT now(),
    CONSTRAINT "practice_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "practice_answers_key" UNIQUE ("run_id", "task_id"),
    CONSTRAINT "practice_answers_run_fkey" FOREIGN KEY ("run_id")
        REFERENCES "public"."practice_runs"("id") ON DELETE CASCADE,
    CONSTRAINT "practice_answers_task_fkey" FOREIGN KEY ("task_id")
        REFERENCES "public"."practice_tasks"("id") ON DELETE CASCADE
) WITH (oids = false);

CREATE INDEX IF NOT EXISTS "idx_practice_answers_task" ON "public"."practice_answers" ("task_id");
