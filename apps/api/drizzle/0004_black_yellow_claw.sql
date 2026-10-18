CREATE TABLE "pages" (
	"page_id" text PRIMARY KEY NOT NULL,
	"page_type" text NOT NULL,
	"layout_scope" text,
	"source_page_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "pages_page_type_idx" ON "pages" USING btree ("page_type");--> statement-breakpoint
CREATE INDEX "pages_layout_scope_idx" ON "pages" USING btree ("layout_scope");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");