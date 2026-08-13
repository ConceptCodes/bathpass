CREATE TABLE "bathrooms" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"name" text NOT NULL,
	"location_hint" text,
	"state" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"bathroom_id" text NOT NULL,
	"pass_id" text,
	"type" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"auth_subject" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_label" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"bathroom_id" text NOT NULL,
	"public_code" text NOT NULL,
	"possession_token_digest" text NOT NULL,
	"status" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"response_window_seconds" integer DEFAULT 300 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bathrooms" ADD CONSTRAINT "bathrooms_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_bathroom_id_bathrooms_id_fk" FOREIGN KEY ("bathroom_id") REFERENCES "public"."bathrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_bathroom_id_bathrooms_id_fk" FOREIGN KEY ("bathroom_id") REFERENCES "public"."bathrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bathrooms_venue_id" ON "bathrooms" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "idx_events_venue_occurred" ON "events" USING btree ("venue_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_events_bathroom_occurred" ON "events" USING btree ("bathroom_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_operators_venue_auth_subject" ON "operators" USING btree ("venue_id","auth_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_passes_possession_token_digest" ON "passes" USING btree ("possession_token_digest");--> statement-breakpoint
CREATE INDEX "idx_passes_venue_bathroom_status" ON "passes" USING btree ("venue_id","bathroom_id","status");--> statement-breakpoint
CREATE INDEX "idx_passes_status_joined" ON "passes" USING btree ("status","joined_at");