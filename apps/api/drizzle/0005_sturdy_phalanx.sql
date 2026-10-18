CREATE TABLE "documents" (
	"table_name" text NOT NULL,
	"pk" text NOT NULL,
	"item" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "documents_table_name_pk_pk" PRIMARY KEY("table_name","pk")
);
