ALTER TABLE "settings" DROP CONSTRAINT "settings_currency";--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_currency" CHECK ("settings"."currency" in ('PHP', 'USD'));