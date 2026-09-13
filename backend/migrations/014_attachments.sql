-- 014_attachments.sql
--
-- Вложения к записям платформы.
--
-- До сих пор загрузить в платформу файл было некуда: аватар и картинка к
-- новости лежат прямо в колонке в виде base64, а «Документы движения»
-- хранили только текст — поле document_type со значением 'pdf' не значило
-- ничего, самого PDF не существовало. Методичку или скан приложить было
-- нельзя, и разговор уходил в мессенджер.
--
-- Файл лежит в bytea в отдельной таблице. Отдельной — намеренно:
--   * списки документов и обращений не тянут содержимое файлов;
--   * когда движение перерастёт этот способ, содержимое переедет в
--     объектное хранилище заменой одного слоя, а ссылки и права останутся.
--
-- owner_type/owner_id — общая привязка: одна таблица обслуживает и
-- документы, и обращения, и ответы на них. Новый вид записи добавляется
-- строкой в CHECK, а не новой таблицей.

CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "owner_type" character varying(30) NOT NULL,
    "owner_id" uuid NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "mime_type" character varying(120) NOT NULL,
    "byte_size" integer NOT NULL,
    "content" bytea NOT NULL,
    "uploaded_by" uuid,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attachments_owner_type_check"
        CHECK (owner_type IN ('document', 'appeal', 'appeal_reply')),
    CONSTRAINT "attachments_byte_size_check"
        CHECK (byte_size > 0 AND byte_size <= 15728640)
) WITH (oids = false);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attachments_uploaded_by_fkey'
    ) THEN
        ALTER TABLE ONLY "public"."attachments"
            ADD CONSTRAINT "attachments_uploaded_by_fkey"
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_attachments_owner"
    ON "public"."attachments" USING btree ("owner_type", "owner_id");

-- Содержимое сжимать не надо: PDF, docx и картинки уже сжаты, а TOAST
-- будет тратить на них процессор впустую.
ALTER TABLE "public"."attachments" ALTER COLUMN "content" SET STORAGE EXTERNAL;

COMMENT ON TABLE "public"."attachments" IS
  'Файлы, приложенные к документам движения и обращениям. Содержимое в bytea, максимум 15 МБ на файл.';
