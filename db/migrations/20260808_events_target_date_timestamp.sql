-- Migration: 20260808_events_target_date_timestamp.sql
-- Description: events.target_date / target_date_from / target_date_to were DATE columns,
-- which silently discarded the time-of-day submitted by the client and made every
-- event's history card display the same "00:00" time (rendered as a fixed local time,
-- e.g. 3:00-3:00). Widen them to TIMESTAMP so the stored value keeps its time component.

ALTER TABLE events ALTER COLUMN target_date TYPE TIMESTAMP;
ALTER TABLE events ALTER COLUMN target_date_from TYPE TIMESTAMP;
ALTER TABLE events ALTER COLUMN target_date_to TYPE TIMESTAMP;
