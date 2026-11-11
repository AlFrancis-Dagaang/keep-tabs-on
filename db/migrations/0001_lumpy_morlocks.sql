CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_id_kind_name_unique" UNIQUE("user_id","kind","name"),
	CONSTRAINT "categories_kind" CHECK ("categories"."kind" in ('spending', 'income'))
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"date" date NOT NULL,
	"account_id" uuid NOT NULL,
	"to_account_id" uuid,
	"category_id" uuid,
	"payee" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_type" CHECK ("transactions"."type" in ('income', 'expense', 'transfer')),
	CONSTRAINT "transactions_amount" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_transfer" CHECK (("transactions"."type" = 'transfer') = ("transactions"."to_account_id" is not null and "transactions"."to_account_id" <> "transactions"."account_id"))
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "own rows" ON "categories" AS PERMISSIVE FOR ALL TO public USING ("categories"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("categories"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);--> statement-breakpoint
CREATE POLICY "own rows" ON "transactions" AS PERMISSIVE FOR ALL TO public USING ("transactions"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("transactions"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);