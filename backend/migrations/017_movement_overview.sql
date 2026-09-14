-- 017_movement_overview.sql
--
-- География КЮДов.
--
-- У клуба был записан только город — строкой, без страны и региона. При
-- этом движение межрегиональное и международное: в списке есть Бухара,
-- Ташкент и Могилёв. Разрезать статистику по субъектам и странам — а это
-- ровно то, что спрашивают министерства и грантодатели — приходилось
-- руками по названию города.
--
-- Никаких справочников регионов не заводим: список субъектов меняется,
-- а поддерживать его ради сорока клубов дороже, чем ввести текстом.
-- Значения нормализуем подсказками в интерфейсе.

ALTER TABLE "public"."clubs"
  ADD COLUMN IF NOT EXISTS "country" character varying(80) DEFAULT 'Россия',
  ADD COLUMN IF NOT EXISTS "region" character varying(120);

COMMENT ON COLUMN "public"."clubs"."country" IS
  'Страна КЮДа. Движение международное: Узбекистан, Беларусь и другие.';
COMMENT ON COLUMN "public"."clubs"."region" IS
  'Субъект РФ или область/вилоят за рубежом — разрез, в котором движение отчитывается.';

CREATE INDEX IF NOT EXISTS "idx_clubs_country" ON "public"."clubs" ("country");
CREATE INDEX IF NOT EXISTS "idx_clubs_region" ON "public"."clubs" ("region");

-- Дата основания клуба: нужна и для годового свода («открыто за год»),
-- и просто чтобы знать возраст КЮДа. created_at — это дата появления
-- записи в платформе, а клуб мог работать десять лет до неё.
ALTER TABLE "public"."clubs"
  ADD COLUMN IF NOT EXISTS "founded_on" date;

COMMENT ON COLUMN "public"."clubs"."founded_on" IS
  'Когда КЮД открылся на самом деле. created_at — лишь дата заведения в платформе.';
