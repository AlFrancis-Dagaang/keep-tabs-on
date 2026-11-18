ALTER TABLE "goals" ALTER COLUMN "account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "installments" ALTER COLUMN "account_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "goals" SET "set_aside_before" = "set_aside_before" + "saved_before", "saved_before" = 0;--> statement-breakpoint
UPDATE "transactions" SET "set_aside_goal_id" = "goal_id", "goal_id" = NULL WHERE "goal_id" IS NOT NULL AND "set_aside_goal_id" IS NULL;--> statement-breakpoint
UPDATE "goals" SET "account_id" = NULL;--> statement-breakpoint
UPDATE "installments" SET "account_id" = NULL;
