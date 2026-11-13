CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target" bigint NOT NULL,
	"deadline" date NOT NULL,
	"account_id" uuid NOT NULL,
	"saved_before" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target" CHECK ("goals"."target" > 0),
	CONSTRAINT "goals_saved_before" CHECK ("goals"."saved_before" between 0 and "goals"."target")
);
--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "own rows" ON "goals" AS PERMISSIVE FOR ALL TO public USING ("goals"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("goals"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);