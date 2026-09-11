-- ============================================================
-- СОТРУДНИКИ КЮДА
-- ============================================================
-- Раньше в клубе была одна должность: club_coordinator. Помощник,
-- заместитель и методист были либо тоже координаторами с полными
-- правами, либо никем. Отсюда выбор без выбора: дать помощнику право
-- удалять участников или не дать ему вообще ничего.
--
-- Вводим пять должностей внутри клуба. Это позиция в КОНКРЕТНОМ клубе,
-- а не глобальная роль: один человек может быть руководителем одного
-- КЮДа и методистом другого.
--
--   head       руководитель КЮДа — отвечает за клуб, один на клуб
--   deputy     заместитель — всё то же, кроме управления сотрудниками
--   methodist  методист — программы, мероприятия, отчётность
--   curator    куратор — работа с детьми: заметки, оценки, достижения
--   assistant  помощник — видит клуб, ничего не меняет
--
-- Применять после 004_consent_documents.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."club_staff" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "club_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "position" character varying(20) NOT NULL,
    "appointed_by" uuid,
    "appointed_at" timestamptz DEFAULT now(),
    "removed_at" timestamptz,
    "removed_by" uuid,
    "comment" text,
    CONSTRAINT "club_staff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_staff_position_check" CHECK (
        "position" IN ('head', 'deputy', 'methodist', 'curator', 'assistant')
    ),
    CONSTRAINT "club_staff_club_id_fkey" FOREIGN KEY ("club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE,
    CONSTRAINT "club_staff_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "club_staff_appointed_by_fkey" FOREIGN KEY ("appointed_by")
        REFERENCES "public"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "club_staff_removed_by_fkey" FOREIGN KEY ("removed_by")
        REFERENCES "public"."users"("id") ON DELETE SET NULL
) WITH (oids = false);

COMMENT ON TABLE "public"."club_staff" IS
    'Сотрудники клуба и их должности. Снятие мягкое: removed_at, строка остаётся для истории.';
COMMENT ON COLUMN "public"."club_staff"."removed_at" IS
    'Заполняется при снятии с должности. Строка не удаляется: через год должно быть видно, кем человек был, когда выдавал ребёнку достижение.';

-- Человек занимает в клубе одну действующую должность
CREATE UNIQUE INDEX IF NOT EXISTS "idx_club_staff_active"
    ON "public"."club_staff" ("club_id", "user_id") WHERE "removed_at" IS NULL;

-- Руководитель в клубе один
CREATE UNIQUE INDEX IF NOT EXISTS "idx_club_staff_one_head"
    ON "public"."club_staff" ("club_id")
    WHERE "position" = 'head' AND "removed_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_club_staff_user" ON "public"."club_staff" ("user_id") WHERE "removed_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_club_staff_club" ON "public"."club_staff" ("club_id") WHERE "removed_at" IS NULL;

-- ============================================================
-- ПЕРЕНОС ИЗ club_coordinators
-- ============================================================
-- Все, кто был координатором клуба, становятся его руководителями.
-- Если на один клуб их было несколько — руководителем станет тот, кто
-- назначен раньше, остальные станут заместителями: частичный уникальный
-- индекс не даст двух руководителей, а терять людей нельзя.
INSERT INTO "public"."club_staff" ("club_id", "user_id", "position", "appointed_at", "comment")
SELECT
    cc.club_id,
    cc.profile_id,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY cc.club_id ORDER BY cc.id) = 1
         THEN 'head' ELSE 'deputy' END,
    now(),
    'Перенесено из club_coordinators миграцией 005'
FROM "public"."club_coordinators" cc
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."club_staff" cs
    WHERE cs.club_id = cc.club_id AND cs.user_id = cc.profile_id AND cs.removed_at IS NULL
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE "public"."club_coordinators" IS
    'УСТАРЕЛО: см. club_staff. Оставлена до тех пор, пока весь код не переедет.';

-- ============================================================
-- club_coordinators СТАНОВИТСЯ ПРЕДСТАВЛЕНИЕМ
-- ============================================================
-- В server.js около двадцати мест читают club_coordinators. Переписывать
-- их все разом — напрашиваться на ошибку. Вместо этого делаем старую
-- таблицу представлением над club_staff: существующие запросы продолжают
-- работать слово в слово, но источником правды становится новая таблица.
--
-- Данные из старой таблицы уже перенесены выше, поэтому её можно
-- переименовать и оставить как страховку.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'club_coordinators'
          AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE "public"."club_coordinators" RENAME TO "club_coordinators_legacy";

        CREATE VIEW "public"."club_coordinators" AS
            SELECT
                cs.id,
                cs.user_id  AS profile_id,
                cs.club_id,
                cs.appointed_at AS created_at
            FROM "public"."club_staff" cs
            WHERE cs.removed_at IS NULL;

        COMMENT ON VIEW "public"."club_coordinators" IS
            'Представление над club_staff для обратной совместимости. Показывает всех действующих сотрудников клуба, а не только руководителей. Новый код должен обращаться к club_staff напрямую.';
        COMMENT ON TABLE "public"."club_coordinators_legacy" IS
            'Старая таблица координаторов. Данные перенесены в club_staff миграцией 005. Удалить, когда убедимся, что всё работает.';
    END IF;
END $$;
