CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"total" bigint NOT NULL,
	"deadline" date NOT NULL,
	"paid_before" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_total" CHECK ("debts"."total" > 0),
	CONSTRAINT "debts_paid_before" CHECK ("debts"."paid_before" between 0 and "debts"."total")
);
--> statement-breakpoint
ALTER TABLE "debts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "debt_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "own rows" ON "debts" AS PERMISSIVE FOR ALL TO public USING ("debts"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("debts"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);