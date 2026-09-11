-- ============================================================
-- ПРИГЛАШЕНИЯ РОДИТЕЛЕЙ
-- ============================================================
-- Зачем.
-- Согласие на обработку данных несовершеннолетнего вправе дать только
-- законный представитель. Значит, у родителя должна быть собственная
-- учётная запись, и система должна знать, что она принадлежит именно
-- родителю этого ребёнка.
--
-- Как было. Родитель привязывал ребёнка, вводя email и пароль ребёнка.
-- На практике это означало, что пароль ребёнка ходит по семье, а чаще —
-- что родитель просто заходит под учёткой ребёнка. В такой схеме запись
-- «согласие дал законный представитель» не доказывает ничего.
--
-- Как стало. Приглашение выпускает тот, кто и так знает семью:
-- руководитель КЮДа из карточки участника. Либо сам участник получает
-- короткий код и передаёт его родителю. В обоих случаях родитель
-- заводит СВОЙ пароль, а пароль ребёнка нигде не участвует.
--
-- Токен в базе не хранится: лежит только его SHA-256. Утечка таблицы не
-- даёт возможности принять приглашение — ровно как с паролями.
--
-- Применять после 006_teams.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."parent_invitations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "child_id" uuid NOT NULL,

    -- SHA-256 от токена. Сам токен показывается один раз тому, кто
    -- выпустил приглашение, и больше нигде не хранится.
    "token_hash" text NOT NULL,

    -- Кто выпустил: сотрудник КЮДа или сам участник. Различать нужно
    -- для журнала: приглашение от ребёнка — более слабое основание.
    "source" text NOT NULL DEFAULT 'staff',

    -- Подсказки из карточки участника, чтобы родителю не пришлось
    -- вводить своё ФИО заново. Это не проверенные данные.
    "parent_full_name" text,
    "parent_email" text,
    "parent_phone" text,

    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "expires_at" timestamptz NOT NULL,

    "used_at" timestamptz,
    "used_by" uuid,
    "revoked_at" timestamptz,
    "revoked_by" uuid,

    CONSTRAINT "parent_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "parent_invitations_token_hash_key" UNIQUE ("token_hash"),
    CONSTRAINT "parent_invitations_source_check" CHECK ("source" IN ('staff', 'child'))
) WITH (oids = false);

ALTER TABLE "public"."parent_invitations"
    DROP CONSTRAINT IF EXISTS "parent_invitations_child_id_fkey";
ALTER TABLE "public"."parent_invitations"
    ADD CONSTRAINT "parent_invitations_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."parent_invitations"
    DROP CONSTRAINT IF EXISTS "parent_invitations_created_by_fkey";
ALTER TABLE "public"."parent_invitations"
    ADD CONSTRAINT "parent_invitations_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."parent_invitations"
    DROP CONSTRAINT IF EXISTS "parent_invitations_used_by_fkey";
ALTER TABLE "public"."parent_invitations"
    ADD CONSTRAINT "parent_invitations_used_by_fkey"
    FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Поиск при приёме приглашения идёт по хешу токена
CREATE INDEX IF NOT EXISTS "idx_parent_invitations_child"
    ON "public"."parent_invitations" ("child_id");

-- На одного ребёнка — не больше одного действующего приглашения из
-- каждого источника. Повторный выпуск сначала отзывает прежнее.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_parent_invitations_active"
    ON "public"."parent_invitations" ("child_id", "source")
    WHERE "used_at" IS NULL AND "revoked_at" IS NULL;

COMMENT ON TABLE "public"."parent_invitations" IS
    'Приглашения родителей. Токен хранится только как SHA-256.';
COMMENT ON COLUMN "public"."parent_invitations"."source" IS
    'staff — выпустил сотрудник КЮДа; child — участник получил код для родителя';
COMMENT ON COLUMN "public"."parent_invitations"."parent_email" IS
    'Подсказка из карточки участника, не подтверждённая. Родитель может указать другой адрес.';
