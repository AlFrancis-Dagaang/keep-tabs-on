ALTER TABLE "transactions" ADD COLUMN "set_aside_bill_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "set_aside_debt_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "set_aside_goal_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "set_aside_installment_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_to" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_set_aside_bill_id_bills_id_fk" FOREIGN KEY ("set_aside_bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_set_aside_debt_id_debts_id_fk" FOREIGN KEY ("set_aside_debt_id") REFERENCES "public"."debts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_set_aside_goal_id_goals_id_fk" FOREIGN KEY ("set_aside_goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_set_aside_installment_id_installments_id_fk" FOREIGN KEY ("set_aside_installment_id") REFERENCES "public"."installments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_set_aside" CHECK (num_nonnulls("transactions"."set_aside_bill_id", "transactions"."set_aside_debt_id", "transactions"."set_aside_goal_id", "transactions"."set_aside_installment_id") = 0
        or ("transactions"."type" = 'transfer' and num_nonnulls("transactions"."set_aside_bill_id", "transactions"."set_aside_debt_id", "transactions"."set_aside_goal_id", "transactions"."set_aside_installment_id") = 1));