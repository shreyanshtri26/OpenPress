CREATE TABLE "roles" (
	"role_id" text PRIMARY KEY NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"is_author" boolean DEFAULT false NOT NULL,
	"author_name" text,
	"profile_pic" text,
	"bio" text,
	"status" text DEFAULT 'active' NOT NULL,
	"mobile" text,
	"reset_token" text,
	"reset_expires_at" timestamp with time zone,
	"profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_role_id_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("role_id") ON DELETE restrict ON UPDATE no action;