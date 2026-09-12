-- 012_club_messages.sql
--
-- Переписка между КЮДами.
--
-- Раньше руководители договаривались мимо платформы — в личных
-- мессенджерах. Спросить у соседнего клуба, как они проводили занятие по
-- переговорам, попросить материалы, сговориться о совместном выезде —
-- всё это уходило в переписку, которой в движении не остаётся следа: ушёл
-- человек, ушла и вся история.
--
-- Существующие «Обращения» устроены как «снизу вверх», в администрацию.
-- Смешивать с ними переписку равных нельзя: администрации завалило бы
-- почту чужими разговорами.
--
-- Кто участвует: только взрослые сотрудники КЮДов. Участники и родители
-- в эту переписку не попадают ни при каких условиях — это проверяется на
-- сервере, а не только прятанием кнопки.

CREATE TABLE IF NOT EXISTS "public"."club_threads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "from_club_id" uuid NOT NULL,
    "to_club_id" uuid NOT NULL,
    -- Кому адресовано. NULL — всему КЮДу, иначе конкретный сотрудник.
    -- Видят переписку всё равно сотрудники обоих клубов: адресат — это
    -- «кому вопрос», а не «от кого спрятать». Если человек в отпуске,
    -- ответить должен кто-то из его коллег.
    "to_user_id" uuid,
    "subject" varchar(200) NOT NULL,
    -- open — ждёт ответа или продолжается, closed — вопрос закрыт
    "status" varchar(16) DEFAULT 'open' NOT NULL,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "last_message_at" timestamptz DEFAULT now(),
    CONSTRAINT "club_threads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_threads_from_fk" FOREIGN KEY ("from_club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE,
    CONSTRAINT "club_threads_to_fk" FOREIGN KEY ("to_club_id")
        REFERENCES "public"."clubs"("id") ON DELETE CASCADE,
    -- Автор мог уволиться: переписка клуба остаётся, автор пропадает
    CONSTRAINT "club_threads_author_fk" FOREIGN KEY ("created_by")
        REFERENCES "public"."users"("id") ON DELETE SET NULL,
    -- Адресат мог уволиться: вопрос остаётся вопросом к клубу
    CONSTRAINT "club_threads_to_user_fk" FOREIGN KEY ("to_user_id")
        REFERENCES "public"."users"("id") ON DELETE SET NULL,
    -- Писать самому себе бессмысленно
    CONSTRAINT "club_threads_not_self" CHECK ("from_club_id" <> "to_club_id")
);

CREATE INDEX IF NOT EXISTS "idx_club_threads_from" ON "public"."club_threads" ("from_club_id");
CREATE INDEX IF NOT EXISTS "idx_club_threads_to" ON "public"."club_threads" ("to_club_id");
CREATE INDEX IF NOT EXISTS "idx_club_threads_last" ON "public"."club_threads" ("last_message_at" DESC);

CREATE TABLE IF NOT EXISTS "public"."club_thread_messages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "thread_id" uuid NOT NULL,
    "author_id" uuid,
    -- От чьего имени написано: нужно, даже если человек потом уволился
    "author_club_id" uuid,
    "body" text NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "club_thread_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_thread_messages_thread_fk" FOREIGN KEY ("thread_id")
        REFERENCES "public"."club_threads"("id") ON DELETE CASCADE,
    CONSTRAINT "club_thread_messages_author_fk" FOREIGN KEY ("author_id")
        REFERENCES "public"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "club_thread_messages_club_fk" FOREIGN KEY ("author_club_id")
        REFERENCES "public"."clubs"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_club_thread_messages_thread"
    ON "public"."club_thread_messages" ("thread_id", "created_at");

COMMENT ON TABLE "public"."club_threads" IS
  'Переписка между КЮДами. Видна только сотрудникам двух клубов-участников; координаторы движения её в интерфейсе не читают.';
