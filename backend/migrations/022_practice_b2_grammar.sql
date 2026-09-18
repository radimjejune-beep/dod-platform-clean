-- ============================================================
-- НАБОР ДВИЖЕНИЯ: GERUND OR INFINITIVE, B2
-- ============================================================
-- Задания написаны заново. Из учебника взята только последовательность
-- тем: сами предложения свои, и это не только про авторские права — на
-- новых примерах ребёнок применяет правило, а на знакомых вспоминает
-- страницу.
--
-- У каждого задания есть русский перевод: без него упражнение работает
-- только у того, кто и так всё понял.
--
-- Примеры про делегации и переговоры: движение про дипломатию, и язык
-- держится лучше, когда он про то же, чем человек занят.
--
-- level = 3 — старшие. Те же темы для младших будут отдельными наборами.
--
-- Применять после 021_practice_translation.sql.
-- ============================================================

INSERT INTO "public"."practice_sets"
  ("id", "title", "description", "kind", "scope", "club_id", "level", "is_published", "allow_retry")
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Gerund or infinitive — B2',
  'После одних глаголов идёт -ing, после других — to. Двенадцать предложений из работы делегации, с переводом.',
  'grammar', 'movement', NULL, 3, true, true
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."practice_tasks"
  ("set_id", "kind", "prompt", "translation", "payload", "answer", "explanation", "sort_order")
VALUES
('a1b2c3d4-0001-4000-8000-000000000001', 'choice',
 'The delegation agreed ___ the draft before Friday.',
 'Делегация согласилась прочитать проект до пятницы. (draft — проект документа)',
 '{"options":["reading","to read","read","reads"]}',
 '{"value":"to read"}',
 'После agree идёт инфинитив с to.', 1),

('a1b2c3d4-0001-4000-8000-000000000001', 'choice',
 'She suggested ___ the meeting to Tuesday.',
 'Она предложила перенести встречу на вторник. (suggest — предлагать)',
 '{"options":["moving","to move","move","moved"]}',
 '{"value":"moving"}',
 'После suggest — форма на -ing. Частая ошибка: «suggested to move».', 2),

('a1b2c3d4-0001-4000-8000-000000000001', 'gap',
 'Впишите нужную форму глагола meet: We look forward to ___ your delegation in Moscow.',
 'Мы с нетерпением ждём встречи с вашей делегацией в Москве. (look forward to — ждать с нетерпением)',
 '{}',
 '{"accept":["meeting"]}',
 'В look forward to слово to — предлог, а не часть инфинитива, поэтому дальше идёт -ing.', 3),

('a1b2c3d4-0001-4000-8000-000000000001', 'gap',
 'Впишите нужную форму глагола answer: He refused ___ the question.',
 'Он отказался отвечать на вопрос. (refuse — отказываться)',
 '{}',
 '{"accept":["to answer"]}',
 'После refuse — инфинитив с to.', 4),

('a1b2c3d4-0001-4000-8000-000000000001', 'choice',
 'I remember ___ him at the forum last year.',
 'Я помню, как встретил его на форуме в прошлом году.',
 '{"options":["meeting","to meet","meet","met"]}',
 '{"value":"meeting"}',
 'remember + -ing — помнить о том, что уже было.', 5),

('a1b2c3d4-0001-4000-8000-000000000001', 'choice',
 'Remember ___ the tickets before you leave.',
 'Не забудь забронировать билеты перед отъездом. (book — бронировать)',
 '{"options":["booking","to book","book","booked"]}',
 '{"value":"to book"}',
 'remember + to — не забыть сделать. Сравните с предыдущим заданием: смысл меняется от формы.', 6),

('a1b2c3d4-0001-4000-8000-000000000001', 'multi',
 'После каких глаголов идёт форма на -ing? Отметьте все.',
 'Значения даны рядом с каждым словом.',
 '{"options":["avoid — избегать","decide — решать","enjoy — получать удовольствие","manage — суметь, справиться","mind — возражать","promise — обещать"]}',
 '{"values":["avoid — избегать","enjoy — получать удовольствие","mind — возражать"]}',
 'decide, manage и promise требуют инфинитива с to.', 7),

('a1b2c3d4-0001-4000-8000-000000000001', 'gap',
 'Впишите нужную форму глагола discuss: They stopped ___ the issue and went to lunch.',
 'Они прекратили обсуждать вопрос и пошли на обед. (issue — вопрос, проблема)',
 '{}',
 '{"accept":["discussing"]}',
 'stop + -ing — прекратить делать. stop to do — остановиться, чтобы сделать.', 8),

('a1b2c3d4-0001-4000-8000-000000000001', 'choice',
 'The chairman made everyone ___ their phones off.',
 'Председатель заставил всех выключить телефоны. (chairman — председатель)',
 '{"options":["to turn","turn","turning","turned"]}',
 '{"value":"turn"}',
 'После make в значении «заставить» идёт инфинитив без to.', 9),

('a1b2c3d4-0001-4000-8000-000000000001', 'gap',
 'Впишите нужную форму глагола argue: It is no use ___ about it now.',
 'Спорить об этом сейчас бесполезно. (argue — спорить)',
 '{}',
 '{"accept":["arguing"]}',
 'Оборот it is no use требует -ing.', 10),

('a1b2c3d4-0001-4000-8000-000000000001', 'choice',
 'We were allowed ___ the archive.',
 'Нам разрешили посетить архив. (allow — разрешать)',
 '{"options":["to visit","visiting","visit","visited"]}',
 '{"value":"to visit"}',
 'В страдательном залоге allow идёт с инфинитивом: were allowed to do.', 11),

('a1b2c3d4-0001-4000-8000-000000000001', 'gap',
 'Впишите нужную форму глагола start: I would rather ___ early tomorrow.',
 'Я бы предпочёл выехать завтра пораньше. (would rather — предпочёл бы)',
 '{}',
 '{"accept":["start"]}',
 'После would rather — инфинитив без to.', 12);
