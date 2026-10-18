CREATE TABLE "stories" (
	"story_id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Untitled Draft' NOT NULL,
	"description" text DEFAULT '',
	"proposed_filing_date" timestamp with time zone,
	"assigned_to" text,
	"author_id" text,
	"slug" text,
	"publish" text,
	"image" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"state" text DEFAULT '',
	"is_complete" boolean DEFAULT false,
	"publish_url" text,
	"published_at" timestamp with time zone,
	"scheduled_publish_date" timestamp with time zone,
	"body" jsonb,
	"fields" jsonb DEFAULT '{}'::jsonb,
	"comments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "stories_status_idx" ON "stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stories_author_id_idx" ON "stories" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");