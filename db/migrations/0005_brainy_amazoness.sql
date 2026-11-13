CREATE TABLE "budget_months" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"month" date NOT NULL,
	"budget" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_months_user_id_category_id_month_unique" UNIQUE("user_id","category_id","month"),
	CONSTRAINT "budget_months_month" CHECK (extract(day from "budget_months"."month") = 1),
	CONSTRAINT "budget_months_budget" CHECK ("budget_months"."budget" > 0)
);
--> statement-breakpoint
ALTER TABLE "budget_months" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "own rows" ON "budget_months" AS PERMISSIVE FOR ALL TO public USING ("budget_months"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("budget_months"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);