-- group_members.role exists in the DDL (eventler_final_ddl.sql) but was never
-- applied to databases created before that column was added. Backfills it so
-- GroupMember inserts (e.g. POST /groups) stop failing with
-- "column \"role\" of relation \"group_members\" does not exist".
ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS role group_role_enum NOT NULL DEFAULT 'member';
