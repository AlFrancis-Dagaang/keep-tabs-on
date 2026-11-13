CREATE TABLE "settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"setup_done" boolean DEFAULT false NOT NULL,
	CONSTRAINT "settings_currency" CHECK ("settings"."currency" in ('PHP', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD'))
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own rows" ON "settings" AS PERMISSIVE FOR ALL TO public USING ("settings"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) WITH CHECK ("settings"."user_id" = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);--> statement-breakpoint
-- Users who already have data skip setup.
INSERT INTO "settings" ("user_id", "setup_done") SELECT "user_id", true FROM "accounts" UNION SELECT "user_id", true FROM "categories";
