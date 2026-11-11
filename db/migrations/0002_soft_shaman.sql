CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"next_due_date" date NOT NULL,
	"due_day" smallint NOT NULL,
	"repeat" text NOT NULL,
	"cycle_start" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bills_amount" CHECK ("bills"."amount" > 0),
	CONSTRAINT "bills_due_day" CHECK ("bills"."due_day" between 1 and 31),
	CONSTRAINT "bills_repeat" CHECK ("bills"."repeat" in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'))
);
--> statement-breakpoint
ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "bill_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "own rows" ON "bills" AS PERMISSIVE FOR ALL TO public USING ("bills"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("bills"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);