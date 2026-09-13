-- 015_report_form.sql
--
-- Отчёт КЮДа за месяц: структура вместо одного абзаца.
--
-- Платформа уже считала за месяц занятия, темы, посещаемость, мероприятия,
-- достижения и приток участников — и показывала всё это руководителю при
-- заполнении. А сохранял отчёт из этого две цифры (events_count,
-- participants_count) и один текст в свободной форме. Свести такие отчёты по
-- сорока КЮДам во что-то осмысленное было невозможно.
--
-- Теперь отчёт хранит снимок цифр на момент сдачи и три именованных раздела,
-- которые руководитель пишет сам. Снимок нужен потому, что журнал занятий
-- живёт дальше: занятие можно дозаполнить задним числом, и пересчёт задним
-- числом менял бы уже утверждённый отчёт.

ALTER TABLE "public"."reports"
  ADD COLUMN IF NOT EXISTS "sessions_held" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sessions_cancelled" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "average_attendance" numeric(5,1),
  ADD COLUMN IF NOT EXISTS "achievements_count" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "new_participants" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "session_topics" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "event_titles" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "highlights" text,
  ADD COLUMN IF NOT EXISTS "difficulties" text,
  ADD COLUMN IF NOT EXISTS "plans" text;

COMMENT ON COLUMN "public"."reports"."sessions_held" IS
  'Снимок на момент сдачи: сколько занятий проведено. Считает платформа, руками не правится.';
COMMENT ON COLUMN "public"."reports"."average_attendance" IS
  'Снимок: среднее число пришедших на одно проведённое занятие.';
COMMENT ON COLUMN "public"."reports"."session_topics" IS
  'Снимок: темы проведённых занятий месяца.';
COMMENT ON COLUMN "public"."reports"."highlights" IS
  'Главное за месяц — пишет руководитель КЮДа.';
COMMENT ON COLUMN "public"."reports"."difficulties" IS
  'Трудности и просьбы к движению — пишет руководитель КЮДа, читает координатор.';
COMMENT ON COLUMN "public"."reports"."plans" IS
  'Планы на следующий месяц — пишет руководитель КЮДа.';
COMMENT ON COLUMN "public"."reports"."report_text" IS
  'УСТАРЕЛО. Прежний отчёт одним абзацем. Новые отчёты пишутся в highlights, difficulties и plans.';

-- Один КЮД — один отчёт за месяц. Раньше ничто не мешало сдать три отчёта
-- за март и утвердить все.
--
-- Если в базе уже есть дубли (тестовые отчёты), индекс не создастся —
-- миграция на этом не падает, а пишет замечание: дубли надо разобрать
-- руками, вслепую удалять чужие отчёты нельзя.
DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "reports_club_month_key"
            ON "public"."reports" ("club_id", "report_month")
            WHERE club_id IS NOT NULL;
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'Индекс не создан: в reports уже есть несколько отчётов одного КЮДа за один месяц. Разберите дубли и выполните CREATE UNIQUE INDEX отдельно.';
    END;
END $$;
