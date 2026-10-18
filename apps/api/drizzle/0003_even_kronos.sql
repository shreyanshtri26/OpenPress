CREATE TABLE "articles" (
	"article_id" text PRIMARY KEY NOT NULL,
	"post_format" text DEFAULT 'standard',
	"title" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '',
	"content" text DEFAULT '',
	"cate" text DEFAULT '',
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"slug" text,
	"cate_bg" text,
	"cate_img" text,
	"feature_img" text,
	"date" timestamp with time zone,
	"post_views" integer DEFAULT 0 NOT NULL,
	"post_share" integer DEFAULT 0 NOT NULL,
	"author" text,
	"author_email" text,
	"author_name" text,
	"author_desg" text,
	"author_img" text,
	"author_bio" text,
	"author_social" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remarks" text DEFAULT '',
	"reviewed_at" timestamp with time zone,
	"editor_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_author_idx" ON "articles" USING btree ("author");--> statement-breakpoint
CREATE INDEX "articles_editor_id_idx" ON "articles" USING btree ("editor_id");--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");