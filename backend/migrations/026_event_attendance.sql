-- 026: явка на мероприятия, итоги и журнал напоминаний
--
-- Раньше у мероприятия был только флаг is_completed, который нигде не
-- выставлялся. Теперь есть: когда завершили, кто, итоговый текст,
-- а у каждой записи — отметка «пришёл / не пришёл».

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS completed_at timestamp,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS results_summary text;

-- NULL — ещё не отмечали, true — пришёл, false — не пришёл
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS attended boolean,
  ADD COLUMN IF NOT EXISTS attendance_marked_at timestamp,
  ADD COLUMN IF NOT EXISTS attendance_marked_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Журнал отправленных напоминаний: по первичному ключу одно и то же
-- напоминание одному человеку не уйдёт дважды, даже если сервер перезапустится
CREATE TABLE IF NOT EXISTS event_reminder_log (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind     varchar(30) NOT NULL,
  sent_at  timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id, kind)
);
