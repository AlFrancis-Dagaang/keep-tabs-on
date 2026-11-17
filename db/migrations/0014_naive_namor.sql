ALTER TABLE "bills" ADD COLUMN "set_aside_before" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "set_aside_before_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "set_aside_before" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "set_aside_before" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "installments" ADD COLUMN "set_aside_before" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "installments" ADD COLUMN "set_aside_before_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_set_aside_before" CHECK ("bills"."set_aside_before" >= 0);--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_set_aside_before" CHECK ("debts"."set_aside_before" >= 0);--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_set_aside_before" CHECK ("goals"."set_aside_before" >= 0);--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_set_aside_before" CHECK ("installments"."set_aside_before" >= 0);