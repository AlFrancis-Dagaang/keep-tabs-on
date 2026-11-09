-- Run once per Neon branch as the owner role (neondb_owner), in the Neon SQL editor.
-- Roles made in the Neon console get neon_superuser, which bypasses RLS, so the app role is made here.
CREATE ROLE app_user WITH LOGIN NOBYPASSRLS PASSWORD 'replace-with-a-long-random-password';
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
