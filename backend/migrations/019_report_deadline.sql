-- ============================================================
-- СРОК СДАЧИ ЕЖЕМЕСЯЧНОГО ОТЧЁТА
-- ============================================================
-- Отчёты собирали вручную: координатор движения помнил, кто сдал, а кто
-- нет, и писал остальным сам. Срока в платформе не было вовсе — «не
-- сдал» ничем не отличалось от «ещё рано».
--
-- Один день на всё движение: отчёт за месяц сдаётся до этого числа
-- следующего месяца. По умолчанию пятое.
--
-- Применять после 018_approved_teams_to_event_participants.sql.
-- ============================================================

ALTER TABLE "public"."site_settings"
  ADD COLUMN IF NOT EXISTS "report_due_day" integer DEFAULT 5;

COMMENT ON COLUMN "public"."site_settings"."report_due_day" IS
    'До какого числа следующего месяца КЮД сдаёт отчёт за месяц. 1-28: двадцать девятое и позже есть не в каждом месяце.';

UPDATE "public"."site_settings" SET "report_due_day" = 5 WHERE "report_due_day" IS NULL;

-- Строка настроек должна существовать: без неё срок неоткуда взять
INSERT INTO "public"."site_settings" ("report_due_day")
SELECT 5
 WHERE NOT EXISTS (SELECT 1 FROM "public"."site_settings");
