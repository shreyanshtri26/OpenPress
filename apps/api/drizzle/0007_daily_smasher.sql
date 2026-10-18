CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"page_id" text,
	"page_title" text,
	"page_category" text,
	"referrer_domain" text,
	"device_type" text,
	"browser" text,
	"os" text,
	"language" text,
	"country" text,
	"region" text,
	"city" text,
	"duration_ms" integer,
	"depth" integer,
	"share_platform" text
);
--> statement-breakpoint
CREATE INDEX "analytics_events_ts_idx" ON "analytics_events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "analytics_events_user_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_session_idx" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "analytics_events_type_ts_idx" ON "analytics_events" USING btree ("type","ts");