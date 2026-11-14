CREATE TABLE "installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"monthly_amount" bigint NOT NULL,
	"months" smallint NOT NULL,
	"paid_before" smallint DEFAULT 0 NOT NULL,
	"due_day" smallint NOT NULL,
	"next_due_date" date NOT NULL,
	"account_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installments_monthly_amount" CHECK ("installments"."monthly_amount" > 0),
	CONSTRAINT "installments_months" CHECK ("installments"."months" between 1 and 120),
	CONSTRAINT "installments_paid_before" CHECK ("installments"."paid_before" between 0 and "installments"."months" - 1),
	CONSTRAINT "installments_due_day" CHECK ("installments"."due_day" between 1 and 31)
);
--> statement-breakpoint
ALTER TABLE "installments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_transfer";--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "to_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_id" uuid;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installment_id_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."installments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer" CHECK (("transactions"."type" = 'transfer') = (("transactions"."to_account_id" is not null and "transactions"."to_account_id" <> "transactions"."account_id") or "transactions"."to_name" is not null)
        and not ("transactions"."to_account_id" is not null and "transactions"."to_name" is not null));--> statement-breakpoint
CREATE POLICY "own rows" ON "installments" AS PERMISSIVE FOR ALL TO public USING ("installments"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("installments"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);