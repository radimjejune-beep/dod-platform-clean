-- ============================================================
-- ДОД «Дипломаты Будущего» — структура базы данных
-- ============================================================
-- Снято из рабочей базы db_dod_platform_clean (PostgreSQL 17)
-- через Adminer 4.8.1, 10 сентября 2026 года.
--
-- Здесь ТОЛЬКО структура: таблицы, индексы, внешние ключи,
-- последовательности. Данных нет и быть не должно — в базе
-- хранятся персональные данные несовершеннолетних участников
-- и их родителей.
--
-- Применение к пустой базе:
--   psql "$DATABASE_URL" -f 001_schema.sql
-- ============================================================

-- Adminer 4.8.1 PostgreSQL 17.9 dump

CREATE TABLE "public"."achievement_categories" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" text,
    "icon" character varying(50),
    "color" character varying(20),
    "points" integer DEFAULT '0',
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "achievement_categories_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."achievements" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "participant_id" uuid,
    "title" character varying(255) NOT NULL,
    "description" text,
    "achievement_date" date,
    "created_at" timestamp DEFAULT now(),
    "added_by" uuid,
    "category" text DEFAULT 'Другое',
    "category_id" uuid,
    "points" integer DEFAULT '0',
    "is_club_award" boolean DEFAULT false,
    "is_tutor_award" boolean DEFAULT false,
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_achievements_category" ON "public"."achievements" USING btree ("category");

CREATE INDEX "idx_achievements_date" ON "public"."achievements" USING btree ("achievement_date");

CREATE INDEX "idx_achievements_participant" ON "public"."achievements" USING btree ("participant_id");

CREATE TABLE "public"."activity_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "action" character varying(100) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" uuid,
    "details" jsonb,
    "ip_address" character varying(45),
    "user_agent" text,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING btree ("created_at");

CREATE INDEX "idx_activity_logs_entity_type" ON "public"."activity_logs" USING btree ("entity_type");

CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING btree ("user_id");

CREATE SEQUENCE announcements_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."announcements" (
    "id" integer DEFAULT nextval('announcements_id_seq') NOT NULL,
    "club_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" text NOT NULL,
    "priority" character varying(20) DEFAULT 'normal',
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_announcements_club_id" ON "public"."announcements" USING btree ("club_id");

CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING btree ("created_at" DESC);

CREATE TABLE "public"."appeal_replies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "appeal_id" uuid NOT NULL,
    "author_id" uuid NOT NULL,
    "message" text NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "appeal_replies_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_appeal_replies_appeal" ON "public"."appeal_replies" USING btree ("appeal_id");

CREATE INDEX "idx_appeal_replies_appeal_id" ON "public"."appeal_replies" USING btree ("appeal_id");

CREATE INDEX "idx_appeal_replies_author" ON "public"."appeal_replies" USING btree ("author_id");

CREATE INDEX "idx_appeal_replies_author_id" ON "public"."appeal_replies" USING btree ("author_id");

CREATE TABLE "public"."appeals" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "club_id" uuid,
    "coordinator_id" uuid,
    "subject" character varying(255) NOT NULL,
    "message" text NOT NULL,
    "priority" character varying(20) DEFAULT 'medium',
    "status" character varying(20) DEFAULT 'pending',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp,
    "resolved_by" uuid,
    "resolved_at" timestamptz,
    "resolution_comment" text,
    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_appeals_club" ON "public"."appeals" USING btree ("club_id");

CREATE INDEX "idx_appeals_coordinator" ON "public"."appeals" USING btree ("coordinator_id");

CREATE INDEX "idx_appeals_status" ON "public"."appeals" USING btree ("status");

CREATE TABLE "public"."bulk_actions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "action_type" character varying(50) NOT NULL,
    "target_ids" uuid[] NOT NULL,
    "created_by" uuid NOT NULL,
    "status" character varying(20) DEFAULT 'pending',
    "result" jsonb,
    "created_at" timestamp DEFAULT now(),
    "completed_at" timestamp,
    CONSTRAINT "bulk_actions_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE SEQUENCE child_parent_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."child_parent" (
    "id" integer DEFAULT nextval('child_parent_id_seq') NOT NULL,
    "parent_id" uuid NOT NULL,
    "child_id" uuid NOT NULL,
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "child_parent_parent_id_child_id_key" UNIQUE ("parent_id", "child_id"),
    CONSTRAINT "child_parent_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_child_parent_child_id" ON "public"."child_parent" USING btree ("child_id");

CREATE INDEX "idx_child_parent_parent_id" ON "public"."child_parent" USING btree ("parent_id");

CREATE TABLE "public"."club_coordinators" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "profile_id" uuid NOT NULL,
    "club_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "club_coordinators_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_coordinators_profile_id_club_id_key" UNIQUE ("profile_id", "club_id")
) WITH (oids = false);

CREATE INDEX "idx_club_coordinators_club" ON "public"."club_coordinators" USING btree ("club_id");

CREATE INDEX "idx_club_coordinators_profile" ON "public"."club_coordinators" USING btree ("profile_id");

CREATE TABLE "public"."club_participants" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "profile_id" uuid,
    "club_id" uuid,
    "status" character varying(20) DEFAULT 'active',
    "joined_at" timestamp DEFAULT now(),
    CONSTRAINT "club_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_participants_profile_id_club_id_key" UNIQUE ("profile_id", "club_id")
) WITH (oids = false);

CREATE INDEX "idx_club_participants_club" ON "public"."club_participants" USING btree ("club_id");

CREATE INDEX "idx_club_participants_profile" ON "public"."club_participants" USING btree ("profile_id");

CREATE TABLE "public"."clubs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" text,
    "city" character varying(100),
    "created_at" timestamp DEFAULT now(),
    "school" text DEFAULT '',
    "leader_name" text DEFAULT '',
    "contact_email" text DEFAULT '',
    "contact_phone" text DEFAULT '',
    "coordinator_id" uuid,
    "leader_id" uuid,
    "president_id" uuid,
    "updated_at" timestamp DEFAULT now(),
    "status" character varying(20) DEFAULT 'active',
    "archived_at" timestamp,
    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

DELIMITER ;;

CREATE TRIGGER "update_clubs_updated_at" BEFORE UPDATE ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

CREATE TABLE "public"."consent_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "consent_type" character varying(50) NOT NULL,
    "status" boolean NOT NULL,
    "changed_by" uuid,
    "changed_at" timestamp DEFAULT now(),
    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_consent_logs_changed_at" ON "public"."consent_logs" USING btree ("changed_at");

CREATE INDEX "idx_consent_logs_user_id" ON "public"."consent_logs" USING btree ("user_id");

CREATE TABLE "public"."document_acknowledgments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid,
    "user_id" uuid,
    "read_at" timestamp DEFAULT now(),
    "acknowledged_at" timestamp,
    CONSTRAINT "document_acknowledgments_document_id_user_id_key" UNIQUE ("document_id", "user_id"),
    CONSTRAINT "document_acknowledgments_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."document_comments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid,
    "user_id" uuid,
    "comment" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" text,
    "category" character varying(50) DEFAULT 'general',
    "document_type" character varying(50) DEFAULT 'pdf',
    "is_public" boolean DEFAULT true,
    "club_id" uuid,
    "tags" text[],
    "created_by" uuid,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_documents_category" ON "public"."documents" USING btree ("category");

CREATE INDEX "idx_documents_club_id" ON "public"."documents" USING btree ("club_id");

CREATE INDEX "idx_documents_created_by" ON "public"."documents" USING btree ("created_by");

DELIMITER ;;

CREATE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

CREATE TABLE "public"."event_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid,
    "staff_id" uuid,
    "role" text DEFAULT 'Тьютор',
    "responsibilities" text[] DEFAULT '{}',
    "notes" text DEFAULT '',
    "start_date" date,
    "end_date" date,
    "assigned_by" uuid,
    "invited_by" uuid,
    "status" text DEFAULT 'pending',
    "is_lead_tutor" boolean DEFAULT false,
    "assignment_type" text DEFAULT 'event',
    "tutor_email" text,
    "tutor_name" text,
    "assigned_at" timestamptz DEFAULT now(),
    "responded_at" timestamptz,
    CONSTRAINT "event_assignments_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_event_assignments_event" ON "public"."event_assignments" USING btree ("event_id");

CREATE INDEX "idx_event_assignments_staff" ON "public"."event_assignments" USING btree ("staff_id");

CREATE INDEX "idx_event_assignments_status" ON "public"."event_assignments" USING btree ("status");

CREATE TABLE "public"."event_club_targets" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "club_id" uuid NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "event_club_targets_event_id_club_id_key" UNIQUE ("event_id", "club_id"),
    CONSTRAINT "event_club_targets_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_event_club_targets_club_id" ON "public"."event_club_targets" USING btree ("club_id");

CREATE INDEX "idx_event_club_targets_event_id" ON "public"."event_club_targets" USING btree ("event_id");

CREATE SEQUENCE event_participants_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."event_participants" (
    "id" integer DEFAULT nextval('event_participants_id_seq') NOT NULL,
    "event_id" uuid,
    "user_id" uuid,
    "status" character varying(50) DEFAULT 'registered',
    "registered_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_participants_event_id_user_id_key" UNIQUE ("event_id", "user_id"),
    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_event_participants_event" ON "public"."event_participants" USING btree ("event_id");

CREATE INDEX "idx_event_participants_event_id" ON "public"."event_participants" USING btree ("event_id");

CREATE INDEX "idx_event_participants_user" ON "public"."event_participants" USING btree ("user_id");

CREATE INDEX "idx_event_participants_user_id" ON "public"."event_participants" USING btree ("user_id");

CREATE TABLE "public"."event_registrations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "status" text DEFAULT 'pending',
    "registered_at" timestamp DEFAULT now(),
    "confirmed_at" timestamp,
    "comment" text,
    "coordinator_comment" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "event_registrations_event_id_user_id_key" UNIQUE ("event_id", "user_id"),
    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_event_registrations_event_id" ON "public"."event_registrations" USING btree ("event_id");

CREATE INDEX "idx_event_registrations_status" ON "public"."event_registrations" USING btree ("status");

CREATE INDEX "idx_event_registrations_user_id" ON "public"."event_registrations" USING btree ("user_id");

DELIMITER ;;

CREATE TRIGGER "update_event_registrations_updated_at" BEFORE UPDATE ON "public"."event_registrations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

CREATE TABLE "public"."event_tutor_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid,
    "tutor_id" uuid,
    "role" character varying(50) DEFAULT 'tutor',
    "status" character varying(50) DEFAULT 'pending',
    "assigned_by" uuid,
    "assigned_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "notes" text,
    CONSTRAINT "event_tutor_assignments_event_id_tutor_id_key" UNIQUE ("event_id", "tutor_id"),
    CONSTRAINT "event_tutor_assignments_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE SEQUENCE event_tutors_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."event_tutors" (
    "id" integer DEFAULT nextval('event_tutors_id_seq') NOT NULL,
    "event_id" uuid,
    "tutor_id" uuid,
    "role" character varying(50) DEFAULT 'tutor',
    "status" character varying(50) DEFAULT 'pending',
    "invited_by" uuid,
    "invited_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_tutors_event_id_tutor_id_key" UNIQUE ("event_id", "tutor_id"),
    CONSTRAINT "event_tutors_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_event_tutors_event_id" ON "public"."event_tutors" USING btree ("event_id");

CREATE INDEX "idx_event_tutors_tutor_id" ON "public"."event_tutors" USING btree ("tutor_id");

CREATE TABLE "public"."events" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "event_date" date NOT NULL,
    "end_date" date,
    "start_time" character varying(20),
    "end_time" character varying(20),
    "location" character varying(255),
    "type" character varying(50) DEFAULT 'internal',
    "capacity" integer,
    "club_id" uuid,
    "created_at" timestamp DEFAULT now(),
    "form_url" text,
    "moderation_status" character varying(20) DEFAULT 'approved',
    "moderated_by" uuid,
    "moderated_at" timestamp,
    "moderation_comment" text,
    "proposed_by" uuid,
    "is_club_event" boolean DEFAULT false,
    "status" character varying(50) DEFAULT 'pending',
    "moderator_comment" text,
    "max_participants" integer DEFAULT '20',
    "current_participants" integer DEFAULT '0',
    "registration_deadline" date,
    "is_global" boolean DEFAULT false,
    "created_by" uuid,
    "is_completed" boolean DEFAULT false,
    "registrations_count" integer DEFAULT '0',
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_events_club_id" ON "public"."events" USING btree ("club_id");

CREATE INDEX "idx_events_event_date" ON "public"."events" USING btree ("event_date");

CREATE INDEX "idx_events_is_club_event" ON "public"."events" USING btree ("is_club_event");

CREATE INDEX "idx_events_registration_deadline" ON "public"."events" USING btree ("registration_deadline");

CREATE INDEX "idx_events_status" ON "public"."events" USING btree ("status");

CREATE TABLE "public"."extra_activities" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "participant_id" uuid,
    "name" character varying(255) NOT NULL,
    "organization" character varying(255),
    "type" character varying(50) DEFAULT 'club',
    "schedule" character varying(255),
    "teacher" character varying(255),
    "achievements" text,
    "start_date" date,
    "end_date" date,
    "is_active" boolean DEFAULT true,
    "comment" text,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "extra_activities_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_extra_activities_participant" ON "public"."extra_activities" USING btree ("participant_id");

CREATE INDEX "idx_extra_activities_type" ON "public"."extra_activities" USING btree ("type");

CREATE TABLE "public"."goals" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "category" character varying(50) DEFAULT 'general',
    "target_value" integer,
    "current_value" integer DEFAULT '0',
    "unit" character varying(20),
    "status" character varying(20) DEFAULT 'active',
    "start_date" date,
    "end_date" date,
    "assigned_to" uuid,
    "club_id" uuid,
    "created_by" uuid,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_goals_assigned_to" ON "public"."goals" USING btree ("assigned_to");

CREATE INDEX "idx_goals_category" ON "public"."goals" USING btree ("category");

CREATE INDEX "idx_goals_club_id" ON "public"."goals" USING btree ("club_id");

CREATE INDEX "idx_goals_status" ON "public"."goals" USING btree ("status");

DELIMITER ;;

CREATE TRIGGER "update_goals_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

CREATE TABLE "public"."invitation_codes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "code" text NOT NULL,
    "role" text NOT NULL,
    "club_id" uuid,
    "created_by" uuid,
    "invited_name" text,
    "invited_email" text,
    "invited_password" text,
    "is_used" boolean DEFAULT false,
    "expires_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "invitation_codes_code_key" UNIQUE ("code"),
    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_invitation_codes_code" ON "public"."invitation_codes" USING btree ("code");

CREATE TABLE "public"."mass_notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" text NOT NULL,
    "recipients" character varying(50) NOT NULL,
    "priority" character varying(20) DEFAULT 'normal',
    "status" character varying(20) DEFAULT 'pending',
    "scheduled_at" timestamp,
    "sent_at" timestamp,
    "created_by" uuid,
    "created_at" timestamp DEFAULT now(),
    "recipient_count" integer DEFAULT '0',
    CONSTRAINT "mass_notifications_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_mass_notifications_created_by" ON "public"."mass_notifications" USING btree ("created_by");

CREATE INDEX "idx_mass_notifications_status" ON "public"."mass_notifications" USING btree ("status");

CREATE TABLE "public"."news" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "image_url" text DEFAULT '',
    "author_id" uuid,
    "is_published" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "created_by" uuid,
    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_news_author" ON "public"."news" USING btree ("author_id");

CREATE INDEX "idx_news_created" ON "public"."news" USING btree ("created_at" DESC);

CREATE INDEX "idx_news_created_at" ON "public"."news" USING btree ("created_at" DESC);

CREATE SEQUENCE notifications_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."notifications" (
    "id" integer DEFAULT nextval('notifications_id_seq') NOT NULL,
    "user_id" uuid,
    "role" character varying(50),
    "type" character varying(50) DEFAULT 'system',
    "title" character varying(255) NOT NULL,
    "message" text NOT NULL,
    "link" character varying(500),
    "priority" character varying(20) DEFAULT 'normal',
    "read" boolean DEFAULT false,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING btree ("created_at" DESC);

CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING btree ("read");

CREATE INDEX "idx_notifications_role" ON "public"."notifications" USING btree ("role");

CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING btree ("type");

CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING btree ("user_id");

CREATE TABLE "public"."official_documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" text NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "status" character varying(50) DEFAULT 'draft',
    "created_by" uuid,
    "approved_by" uuid,
    "approved_at" timestamp,
    "published_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "is_urgent" boolean DEFAULT false,
    "priority" character varying(50) DEFAULT 'normal',
    CONSTRAINT "official_documents_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."parent_child_relations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "parent_id" uuid,
    "child_id" uuid,
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "parent_child_relations_parent_id_child_id_key" UNIQUE ("parent_id", "child_id"),
    CONSTRAINT "parent_child_relations_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."parent_data" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "full_name" character varying(255) NOT NULL,
    "phone" character varying(50),
    "email" character varying(255),
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "parent_data_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."participant_notes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "participant_id" uuid NOT NULL,
    "author_id" uuid NOT NULL,
    "content" text NOT NULL,
    "visibility" character varying(20) DEFAULT 'coordinator_only',
    "pinned" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "participant_notes_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_participant_notes_author" ON "public"."participant_notes" USING btree ("author_id");

CREATE INDEX "idx_participant_notes_participant" ON "public"."participant_notes" USING btree ("participant_id");

CREATE TABLE "public"."participant_scores" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid,
    "participant_id" uuid,
    "tutor_id" uuid,
    "engagement_score" integer DEFAULT '0',
    "teamwork_score" integer DEFAULT '0',
    "initiative_score" integer DEFAULT '0',
    "communication_score" integer DEFAULT '0',
    "responsibility_score" integer DEFAULT '0',
    "comment" text,
    "status" character varying(20) DEFAULT 'draft',
    "created_by" uuid,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "participant_scores_event_id_participant_id_tutor_id_key" UNIQUE ("event_id", "participant_id", "tutor_id"),
    CONSTRAINT "participant_scores_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_participant_scores_event" ON "public"."participant_scores" USING btree ("event_id");

CREATE INDEX "idx_participant_scores_participant" ON "public"."participant_scores" USING btree ("participant_id");

CREATE INDEX "idx_participant_scores_tutor" ON "public"."participant_scores" USING btree ("tutor_id");

CREATE TABLE "public"."participation_reviews" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid,
    "participant_id" uuid,
    "reviewer_id" uuid,
    "engagement" text,
    "teamwork" text,
    "communication" text,
    "initiative" text,
    "responsibility" text,
    "overall_impression" text,
    "comment" text,
    "strengths" text,
    "areas_for_growth" text,
    "status" text DEFAULT 'draft',
    "is_final" boolean DEFAULT false,
    "approved_by" uuid,
    "approved_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "participation_reviews_event_id_participant_id_key" UNIQUE ("event_id", "participant_id"),
    CONSTRAINT "participation_reviews_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_participation_reviews_event" ON "public"."participation_reviews" USING btree ("event_id");

CREATE INDEX "idx_participation_reviews_participant" ON "public"."participation_reviews" USING btree ("participant_id");

CREATE INDEX "idx_participation_reviews_reviewer" ON "public"."participation_reviews" USING btree ("reviewer_id");

CREATE TABLE "public"."president_reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid,
    "content" text NOT NULL,
    "submitted_by" uuid,
    "submitted_at" timestamptz DEFAULT now(),
    "reviewed_by" uuid,
    "reviewed_at" timestamptz,
    "status" text DEFAULT 'pending',
    "feedback" text,
    CONSTRAINT "president_reports_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_president_reports_task" ON "public"."president_reports" USING btree ("task_id");

CREATE TABLE "public"."president_task_responses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid,
    "president_id" uuid,
    "response" text,
    "status" character varying(50) DEFAULT 'pending',
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "president_task_responses_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_president_task_responses_president_id" ON "public"."president_task_responses" USING btree ("president_id");

CREATE INDEX "idx_president_task_responses_task_id" ON "public"."president_task_responses" USING btree ("task_id");

CREATE TABLE "public"."president_tasks" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "status" character varying(50) DEFAULT 'pending',
    "priority" character varying(20) DEFAULT 'medium',
    "created_by" uuid,
    "club_id" uuid,
    "assigned_to" uuid,
    "is_global" boolean DEFAULT false,
    "deadline" date,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "president_tasks_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_president_tasks_assigned_to" ON "public"."president_tasks" USING btree ("assigned_to");

CREATE INDEX "idx_president_tasks_club_id" ON "public"."president_tasks" USING btree ("club_id");

CREATE INDEX "idx_president_tasks_created_by" ON "public"."president_tasks" USING btree ("created_by");

CREATE INDEX "idx_president_tasks_status" ON "public"."president_tasks" USING btree ("status");

CREATE TABLE "public"."registrations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "event_id" uuid,
    "status" character varying(20) DEFAULT 'pending',
    "registered_at" timestamp DEFAULT now(),
    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "registrations_user_id_event_id_key" UNIQUE ("user_id", "event_id")
) WITH (oids = false);

CREATE INDEX "idx_registrations_event_id" ON "public"."registrations" USING btree ("event_id");

CREATE INDEX "idx_registrations_user_id" ON "public"."registrations" USING btree ("user_id");

CREATE TABLE "public"."reminders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid,
    "user_id" uuid,
    "type" character varying(20) NOT NULL,
    "title" character varying(200) NOT NULL,
    "message" text,
    "remind_at" timestamp NOT NULL,
    "sent" boolean DEFAULT false,
    "sent_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_reminders_remind_at" ON "public"."reminders" USING btree ("remind_at");

CREATE INDEX "idx_reminders_sent" ON "public"."reminders" USING btree ("sent");

CREATE INDEX "idx_reminders_user" ON "public"."reminders" USING btree ("user_id");

CREATE TABLE "public"."reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "club_id" uuid,
    "report_month" character varying(7) NOT NULL,
    "report_text" text,
    "events_count" integer DEFAULT '0',
    "participants_count" integer DEFAULT '0',
    "status" text DEFAULT 'draft',
    "submitted_by" uuid,
    "submitted_at" timestamptz,
    "approved_by" uuid,
    "approved_at" timestamptz,
    "reviewer_comment" text,
    "quality_score" integer,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "title" character varying(255),
    "content" text,
    "created_by" uuid,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_reports_club" ON "public"."reports" USING btree ("club_id");

CREATE INDEX "idx_reports_club_id" ON "public"."reports" USING btree ("club_id");

CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING btree ("created_at");

CREATE INDEX "idx_reports_created_by" ON "public"."reports" USING btree ("created_by");

CREATE INDEX "idx_reports_month" ON "public"."reports" USING btree ("report_month");

CREATE INDEX "idx_reports_report_month" ON "public"."reports" USING btree ("report_month");

CREATE INDEX "idx_reports_status" ON "public"."reports" USING btree ("status");

CREATE TABLE "public"."review_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "review_id" uuid,
    "changed_by" uuid,
    "changes" jsonb,
    "action" text,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "review_history_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_review_history_review" ON "public"."review_history" USING btree ("review_id");

CREATE SEQUENCE site_settings_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."site_settings" (
    "id" integer DEFAULT nextval('site_settings_id_seq') NOT NULL,
    "site_name" text DEFAULT 'Дипломаты будущего',
    "hero_title" text DEFAULT 'Добро пожаловать в ДОД «Дипломаты будущего»',
    "hero_subtitle" text DEFAULT 'Система управления движением',
    "primary_color" text DEFAULT '#0B1F3A',
    "accent_color" text DEFAULT '#C9A227',
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."tasks" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "category" character varying(50) DEFAULT 'general',
    "priority" character varying(20) DEFAULT 'medium',
    "status" character varying(20) DEFAULT 'pending',
    "due_date" date,
    "assigned_to" uuid,
    "created_by" uuid,
    "recurrence" character varying(20) DEFAULT 'none',
    "recurrence_end" date,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING btree ("assigned_to");

CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING btree ("due_date");

CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING btree ("priority");

CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING btree ("status");

DELIMITER ;;

CREATE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

CREATE TABLE "public"."tutor_invitations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "tutor_id" uuid NOT NULL,
    "event_id" uuid,
    "club_id" uuid,
    "created_by" uuid NOT NULL,
    "message" text,
    "role" text DEFAULT 'Тьютор',
    "responsibilities" text[] DEFAULT '{}',
    "start_date" date,
    "end_date" date,
    "status" text DEFAULT 'pending',
    "responded_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "tutor_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tutor_invitations_tutor_id_event_id_key" UNIQUE ("tutor_id", "event_id")
) WITH (oids = false);

CREATE INDEX "idx_tutor_invitations_event" ON "public"."tutor_invitations" USING btree ("event_id");

CREATE INDEX "idx_tutor_invitations_status" ON "public"."tutor_invitations" USING btree ("status");

CREATE INDEX "idx_tutor_invitations_tutor" ON "public"."tutor_invitations" USING btree ("tutor_id");

CREATE TABLE "public"."tutor_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "club_id" uuid,
    "requested_by" uuid,
    "event_id" uuid,
    "tutor_name" text NOT NULL,
    "tutor_email" text NOT NULL,
    "tutor_phone" text DEFAULT '',
    "role" text DEFAULT '',
    "responsibilities" text[] DEFAULT '{}',
    "notes" text DEFAULT '',
    "start_date" date,
    "end_date" date,
    "status" text DEFAULT 'pending',
    "reviewed_by" uuid,
    "reviewed_at" timestamptz,
    "comment" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "event_date" date,
    "event_name" text,
    "event_description" text,
    CONSTRAINT "tutor_requests_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_tutor_requests_club" ON "public"."tutor_requests" USING btree ("club_id");

CREATE INDEX "idx_tutor_requests_event" ON "public"."tutor_requests" USING btree ("event_id");

CREATE INDEX "idx_tutor_requests_requested_by" ON "public"."tutor_requests" USING btree ("requested_by");

CREATE INDEX "idx_tutor_requests_status" ON "public"."tutor_requests" USING btree ("status");

CREATE TABLE "public"."user_consents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "consent_type" character varying(100) NOT NULL,
    "given_at" timestamp DEFAULT now(),
    "revoked_at" timestamp,
    "version" character varying(20) DEFAULT '1.0',
    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."users" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" text NOT NULL,
    "password_hash" text NOT NULL,
    "full_name" text NOT NULL,
    "role" text DEFAULT 'participant',
    "created_at" timestamptz DEFAULT now(),
    "registration_status" character varying(20) DEFAULT 'pending',
    "approved_at" timestamp,
    "is_minor" boolean DEFAULT false,
    "phone" character varying(50) DEFAULT '',
    "school" character varying(255) DEFAULT '',
    "class_name" character varying(50) DEFAULT '',
    "birth_date" date,
    "interests" text DEFAULT '',
    "bio" text DEFAULT '',
    "city" text DEFAULT '',
    "club_id" uuid,
    "position" text DEFAULT '',
    "status" text DEFAULT 'active',
    "avatar_url" text,
    "is_president" boolean DEFAULT false,
    "social_links" text,
    "skills" text,
    "education" text,
    "achievements" text,
    "telegram" text,
    "vk" text,
    "achievements_text" text,
    "consent_personal_data" boolean DEFAULT false,
    "consent_photo_publication" boolean DEFAULT false,
    "consent_event_participation" boolean DEFAULT false,
    "consent_minor_data" boolean DEFAULT false,
    "consent_agreement_date" date,
    "parent_full_name" character varying(255),
    "parent_phone" character varying(50),
    "parent_email" character varying(255),
    "charter_acceptance_date" date,
    "must_change_password" boolean DEFAULT false,
    "created_by" uuid,
    "last_password_change" timestamp,
    "login_attempts" integer DEFAULT '0',
    "locked_until" timestamp,
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_users_club_id" ON "public"."users" USING btree ("club_id");

CREATE INDEX "idx_users_email" ON "public"."users" USING btree ("email");

CREATE INDEX "idx_users_is_president" ON "public"."users" USING btree ("is_president");

CREATE INDEX "idx_users_role" ON "public"."users" USING btree ("role");

ALTER TABLE ONLY "public"."achievements" ADD CONSTRAINT "achievements_added_by_fkey" FOREIGN KEY (added_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."achievements" ADD CONSTRAINT "achievements_category_id_fkey" FOREIGN KEY (category_id) REFERENCES achievement_categories(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."achievements" ADD CONSTRAINT "achievements_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."announcements" ADD CONSTRAINT "announcements_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."appeal_replies" ADD CONSTRAINT "appeal_replies_appeal_id_fkey" FOREIGN KEY (appeal_id) REFERENCES appeals(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."appeal_replies" ADD CONSTRAINT "appeal_replies_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."appeals" ADD CONSTRAINT "appeals_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."appeals" ADD CONSTRAINT "appeals_coordinator_id_fkey" FOREIGN KEY (coordinator_id) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."appeals" ADD CONSTRAINT "appeals_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."bulk_actions" ADD CONSTRAINT "bulk_actions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."child_parent" ADD CONSTRAINT "child_parent_child_id_fkey" FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."child_parent" ADD CONSTRAINT "child_parent_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."club_coordinators" ADD CONSTRAINT "club_coordinators_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."club_coordinators" ADD CONSTRAINT "club_coordinators_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."club_participants" ADD CONSTRAINT "club_participants_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."club_participants" ADD CONSTRAINT "club_participants_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."clubs" ADD CONSTRAINT "clubs_coordinator_id_fkey" FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."clubs" ADD CONSTRAINT "clubs_leader_id_fkey" FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."clubs" ADD CONSTRAINT "clubs_president_id_fkey" FOREIGN KEY (president_id) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."consent_logs" ADD CONSTRAINT "consent_logs_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."consent_logs" ADD CONSTRAINT "consent_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."document_acknowledgments" ADD CONSTRAINT "document_acknowledgments_document_id_fkey" FOREIGN KEY (document_id) REFERENCES official_documents(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."document_acknowledgments" ADD CONSTRAINT "document_acknowledgments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."document_comments" ADD CONSTRAINT "document_comments_document_id_fkey" FOREIGN KEY (document_id) REFERENCES official_documents(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."document_comments" ADD CONSTRAINT "document_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."documents" ADD CONSTRAINT "documents_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_assignments" ADD CONSTRAINT "event_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_assignments" ADD CONSTRAINT "event_assignments_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_assignments" ADD CONSTRAINT "event_assignments_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_assignments" ADD CONSTRAINT "event_assignments_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_club_targets" ADD CONSTRAINT "event_club_targets_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_club_targets" ADD CONSTRAINT "event_club_targets_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_participants" ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_tutor_assignments" ADD CONSTRAINT "event_tutor_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_tutor_assignments" ADD CONSTRAINT "event_tutor_assignments_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_tutor_assignments" ADD CONSTRAINT "event_tutor_assignments_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_tutors" ADD CONSTRAINT "event_tutors_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_tutors" ADD CONSTRAINT "event_tutors_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_tutors" ADD CONSTRAINT "event_tutors_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."events" ADD CONSTRAINT "events_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."events" ADD CONSTRAINT "events_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."events" ADD CONSTRAINT "events_proposed_by_fkey" FOREIGN KEY (proposed_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."extra_activities" ADD CONSTRAINT "extra_activities_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."goals" ADD CONSTRAINT "goals_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."goals" ADD CONSTRAINT "goals_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."goals" ADD CONSTRAINT "goals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."invitation_codes" ADD CONSTRAINT "invitation_codes_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."invitation_codes" ADD CONSTRAINT "invitation_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."mass_notifications" ADD CONSTRAINT "mass_notifications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."news" ADD CONSTRAINT "news_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."news" ADD CONSTRAINT "news_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."official_documents" ADD CONSTRAINT "official_documents_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."official_documents" ADD CONSTRAINT "official_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."parent_child_relations" ADD CONSTRAINT "parent_child_relations_child_id_fkey" FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."parent_child_relations" ADD CONSTRAINT "parent_child_relations_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."parent_data" ADD CONSTRAINT "parent_data_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participant_notes" ADD CONSTRAINT "participant_notes_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participant_notes" ADD CONSTRAINT "participant_notes_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participant_scores" ADD CONSTRAINT "participant_scores_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participant_scores" ADD CONSTRAINT "participant_scores_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participant_scores" ADD CONSTRAINT "participant_scores_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participant_scores" ADD CONSTRAINT "participant_scores_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participation_reviews" ADD CONSTRAINT "participation_reviews_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participation_reviews" ADD CONSTRAINT "participation_reviews_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participation_reviews" ADD CONSTRAINT "participation_reviews_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."participation_reviews" ADD CONSTRAINT "participation_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_reports" ADD CONSTRAINT "president_reports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_reports" ADD CONSTRAINT "president_reports_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_task_responses" ADD CONSTRAINT "president_task_responses_president_id_fkey" FOREIGN KEY (president_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_task_responses" ADD CONSTRAINT "president_task_responses_task_id_fkey" FOREIGN KEY (task_id) REFERENCES president_tasks(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_tasks" ADD CONSTRAINT "president_tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_tasks" ADD CONSTRAINT "president_tasks_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."president_tasks" ADD CONSTRAINT "president_tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."review_history" ADD CONSTRAINT "review_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."review_history" ADD CONSTRAINT "review_history_review_id_fkey" FOREIGN KEY (review_id) REFERENCES participation_reviews(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_invitations" ADD CONSTRAINT "tutor_invitations_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_invitations" ADD CONSTRAINT "tutor_invitations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_invitations" ADD CONSTRAINT "tutor_invitations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_invitations" ADD CONSTRAINT "tutor_invitations_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_requests" ADD CONSTRAINT "tutor_requests_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_requests" ADD CONSTRAINT "tutor_requests_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_requests" ADD CONSTRAINT "tutor_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tutor_requests" ADD CONSTRAINT "tutor_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) NOT DEFERRABLE;

-- 2026-09-10 20:28:18.562397+00
