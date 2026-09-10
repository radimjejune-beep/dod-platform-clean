-- ============================================================
-- СОГЛАСИЯ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ
-- ============================================================
-- Приводит хранение согласий к требованиям 152-ФЗ.
--
-- Что было не так:
--   1. Галочки согласий стояли в профиле самого участника. Участники —
--      несовершеннолетние, а согласие за них может давать только законный
--      представитель. Роскомнадзор признаёт такие согласия нарушением.
--   2. Три согласия собирались одной формой. С 01.09.2025 согласие должно
--      быть отдельным самостоятельным документом, объединять разные цели
--      в одном нельзя.
--   3. Нигде не сохранялось, КАКОЙ ТЕКСТ человек видел в момент согласия.
--      Без этого при проверке нечего предъявить: текст на сайте с тех пор
--      мог измениться десять раз.
--
-- Что вводится:
--   consent_documents — редакции текстов согласий, неизменяемые
--   user_consents     — текущее состояние: кто, за кого, по какой редакции
--   consent_logs      — журнал всех действий, только добавление
--
-- Применять после 001_schema.sql.
-- ============================================================

-- ============================================================
-- РЕДАКЦИИ ТЕКСТОВ СОГЛАСИЙ
-- ============================================================
-- Каждая редакция неизменяема. Правка текста = новая строка с новой
-- версией. Уже данные согласия продолжают ссылаться на ту редакцию,
-- которую человек действительно читал.
CREATE TABLE IF NOT EXISTS "public"."consent_documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "code" character varying(50) NOT NULL,
    "version" character varying(20) NOT NULL,
    "title" character varying(255) NOT NULL,
    "body" text NOT NULL,
    "purpose" text,
    "data_categories" text,
    "retention" text,
    "is_required" boolean DEFAULT true NOT NULL,
    "operator_name" character varying(255),
    "operator_address" text,
    "operator_inn" character varying(20),
    "is_current" boolean DEFAULT false NOT NULL,
    "published_at" timestamptz DEFAULT now(),
    "created_by" uuid,
    CONSTRAINT "consent_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consent_documents_code_version_key" UNIQUE ("code", "version")
) WITH (oids = false);

COMMENT ON TABLE "public"."consent_documents" IS 'Редакции текстов согласий. Строки не изменяются: правка = новая версия.';
COMMENT ON COLUMN "public"."consent_documents"."code" IS 'personal_data | data_distribution | event_participation';
COMMENT ON COLUMN "public"."consent_documents"."is_required" IS 'false для добровольных согласий (например, публикация фото)';

-- Текущей может быть только одна редакция каждого вида
CREATE UNIQUE INDEX IF NOT EXISTS "idx_consent_documents_current"
    ON "public"."consent_documents" ("code") WHERE "is_current";

-- ============================================================
-- ТЕКУЩЕЕ СОСТОЯНИЕ СОГЛАСИЙ
-- ============================================================
ALTER TABLE "public"."user_consents"
    ADD COLUMN IF NOT EXISTS "document_id" uuid,
    ADD COLUMN IF NOT EXISTS "given_by" uuid,
    ADD COLUMN IF NOT EXISTS "given_by_relation" character varying(30),
    ADD COLUMN IF NOT EXISTS "given_by_full_name" character varying(255),
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

COMMENT ON COLUMN "public"."user_consents"."user_id" IS 'Чьи данные обрабатываются (участник)';
COMMENT ON COLUMN "public"."user_consents"."given_by" IS 'Кто подтвердил: родитель или сам субъект, если ему есть 18';
COMMENT ON COLUMN "public"."user_consents"."given_by_relation" IS 'self | parent | guardian';
COMMENT ON COLUMN "public"."user_consents"."given_by_full_name" IS 'ФИО подтвердившего на момент согласия — фиксируем, потому что в профиле оно может измениться';

-- Одно действующее согласие каждого вида на человека
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_consents_user_id_consent_type_key'
    ) THEN
        ALTER TABLE "public"."user_consents"
            ADD CONSTRAINT "user_consents_user_id_consent_type_key" UNIQUE ("user_id", "consent_type");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_user_consents_user_id" ON "public"."user_consents" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_consents_given_by" ON "public"."user_consents" ("given_by");

-- ============================================================
-- ЖУРНАЛ СОГЛАСИЙ
-- ============================================================
-- Только добавление строк. Отзыв согласия — это новая запись, а не
-- изменение старой: журнал должен показывать всю историю.
ALTER TABLE "public"."consent_logs"
    ADD COLUMN IF NOT EXISTS "document_id" uuid,
    ADD COLUMN IF NOT EXISTS "document_version" character varying(20),
    ADD COLUMN IF NOT EXISTS "given_by_relation" character varying(30),
    ADD COLUMN IF NOT EXISTS "ip_address" character varying(64),
    ADD COLUMN IF NOT EXISTS "user_agent" text;

COMMENT ON TABLE "public"."consent_logs" IS 'Журнал согласий, только добавление. Отзыв — новая запись со status = false.';
COMMENT ON COLUMN "public"."consent_logs"."ip_address" IS 'Адрес, с которого подтверждено. Часть доказательства при проверке.';

-- ============================================================
-- ВНЕШНИЕ КЛЮЧИ
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_consents_document_id_fkey') THEN
        ALTER TABLE "public"."user_consents"
            ADD CONSTRAINT "user_consents_document_id_fkey"
            FOREIGN KEY ("document_id") REFERENCES "public"."consent_documents"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_consents_given_by_fkey') THEN
        ALTER TABLE "public"."user_consents"
            ADD CONSTRAINT "user_consents_given_by_fkey"
            FOREIGN KEY ("given_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- СТАРЫЕ ПОЛЯ В КАРТОЧКЕ УЧАСТНИКА
-- ============================================================
-- users.consent_* остаются, но больше не являются источником правды:
-- их заполнял сам ребёнок через свой профиль, что юридически ничтожно.
-- Удалим отдельной миграцией, когда фронтенд перестанет их читать.
COMMENT ON COLUMN "public"."users"."consent_personal_data" IS 'УСТАРЕЛО: см. user_consents. Заполнялось самим участником, юридической силы не имеет.';
COMMENT ON COLUMN "public"."users"."consent_photo_publication" IS 'УСТАРЕЛО: см. user_consents.';
COMMENT ON COLUMN "public"."users"."consent_event_participation" IS 'УСТАРЕЛО: см. user_consents.';
COMMENT ON COLUMN "public"."users"."consent_minor_data" IS 'УСТАРЕЛО: см. user_consents.';
