CREATE TABLE "assets" (
	"asset_id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"file_type" text DEFAULT '' NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"preview_url" text,
	"s3_key" text,
	"user_id" text,
	"uploaded_by" text,
	"description" text DEFAULT '',
	"summary" text DEFAULT '',
	"caption" text DEFAULT '',
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text,
	"location" text,
	"licensing" text,
	"creator" text,
	"video_metadata" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'ready',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "assets_user_id_idx" ON "assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assets_created_at_idx" ON "assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assets_file_type_idx" ON "assets" USING btree ("file_type");