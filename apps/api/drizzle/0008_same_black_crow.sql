CREATE TABLE "reader_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neon_auth_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"subscription_status" text DEFAULT 'active' NOT NULL,
	"subscription_expires_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reader_users_neon_auth_id_unique" UNIQUE("neon_auth_id"),
	CONSTRAINT "reader_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "reader_users_email_idx" ON "reader_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "reader_users_neon_auth_idx" ON "reader_users" USING btree ("neon_auth_id");