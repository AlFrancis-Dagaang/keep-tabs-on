ALTER TABLE "debts" ADD COLUMN "direction" text DEFAULT 'owe' NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_direction" CHECK ("debts"."direction" in ('owe', 'owed'));