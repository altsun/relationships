CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_categories" (
	"contact_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "contact_categories_contact_id_category_id_pk" PRIMARY KEY("contact_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"full_name" text NOT NULL,
	"phone" text,
	"facebook" text,
	"zalo" text,
	"tiktok" text,
	"birth_year" integer,
	"birthday" text,
	"hometown" text,
	"address" text,
	"university" text,
	"high_school" text,
	"job_title" text,
	"has_work_schedule" boolean DEFAULT false,
	"work_start_am" time,
	"lunch_break" time,
	"work_start_pm" time,
	"work_end_pm" time,
	"family" jsonb,
	"hobbies" text[],
	"notes" text,
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "contact_categories" ADD CONSTRAINT "contact_categories_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_categories" ADD CONSTRAINT "contact_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_uidx" ON "categories" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_birthday_idx" ON "contacts" USING btree ("birthday");