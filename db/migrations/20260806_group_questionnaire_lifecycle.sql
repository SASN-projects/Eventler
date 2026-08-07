-- Migration: 20260806_group_questionnaire_lifecycle.sql
-- Description: Adds enum values, FK column, and indexes for Group Questionnaire Lifecycle

-- 1. Add new enum values to event_status_enum
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'generating_recommendations';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'recommendations_ready';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'final_selection_made';

-- 2. Add event_id FK to recommendations table
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 3. Create indexes for efficient lifecycle & recommendation queries
CREATE INDEX IF NOT EXISTS index_events_status_type ON events(status, event_type);
CREATE INDEX IF NOT EXISTS index_recommendations_event_id ON recommendations(event_id);
