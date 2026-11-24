ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "job_notes" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.contact_notes'::regclass AND conname = 'contact_notes_contact_id_contacts_id_fk') THEN
		ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_notes_contact_id_idx" ON "contact_notes" USING btree ("contact_id");
