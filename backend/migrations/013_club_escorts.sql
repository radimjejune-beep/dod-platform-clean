-- 013_club_escorts.sql
--
-- Сопровождающие взрослые у КЮДа.
--
-- На каждый выездной форум руководитель вбивал ФИО, телефон и организацию
-- сопровождающего заново: нигде в платформе этот человек не хранился.
-- Учётной записи ему не заводят — и правильно, делать ему в платформе
-- нечего. Но сам факт «с этим клубом ездит такой-то учитель» повторяется
-- из года в год.
--
-- Это справочник клуба, а не пользователи: ни входа, ни ролей, ни прав.
-- Данные в заявку по-прежнему копируются снимком в team_members, поэтому
-- правка справочника не меняет уже поданные заявки.

CREATE TABLE IF NOT EXISTS "public"."club_escorts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "club_id" uuid NOT NULL,
    "full_name" varchar(255) NOT NULL,
    "phone" varchar(30) DEFAULT '',
    -- Место работы: в заявке это графа «учебное заведение»
    "organization" varchar(300) DEFAULT '',
    -- Кем приходится клубу: учитель, родитель, методист школы
    "relation" varchar(120) DEFAULT '',
    "comment" text DEFAULT '',
    -- Вместо удаления: человек мог ездить раньше, и в старых заявках он есть
    "archived_at" timestamptz,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "club_escorts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_escorts_club_fk" FOREIGN KEY ("club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE,
    CONSTRAINT "club_escorts_author_fk" FOREIGN KEY ("created_by")
        REFERENCES "public"."users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_club_escorts_club"
    ON "public"."club_escorts" ("club_id") WHERE "archived_at" IS NULL;

COMMENT ON TABLE "public"."club_escorts" IS
  'Справочник сопровождающих взрослых КЮДа. Не пользователи: входа и прав нет. В заявку на форум данные копируются снимком в team_members.';
