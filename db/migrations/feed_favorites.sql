-- Migration: Home Screen Feed & Favorites
-- Safe to re-run (idempotent). Apply against an existing eventler database with:
--   psql -U postgres -d eventler < db/migrations/0001_feed_favorites.sql

ALTER TABLE venues ADD COLUMN IF NOT EXISTS photo_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_venues_source_external_id
    ON venues (source, external_source_id)
    WHERE external_source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_feed_items (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score NUMERIC(10,4),
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, venue_id)
);

-- Widen in case this migration was already applied with the original NUMERIC(6,4).
ALTER TABLE user_feed_items ALTER COLUMN score TYPE NUMERIC(10,4);

CREATE INDEX IF NOT EXISTS index_user_feed_items_user_rank ON user_feed_items (user_id, rank);
