CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE event_type_enum AS ENUM ('individual', 'group', 'manual');
CREATE TYPE event_status_enum AS ENUM ('draft', 'collecting_responses', 'recommended', 'finalized', 'cancelled');
CREATE TYPE group_role_enum AS ENUM ('owner', 'member');
CREATE TYPE participant_status_enum AS ENUM ('pending', 'submitted', 'declined');
CREATE TYPE answer_mode_enum AS ENUM ('options','value');
CREATE TYPE transportation_enum AS ENUM ('bus', 'car', 'walk', 'train');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    city VARCHAR(120),
    country VARCHAR(120),
    date_of_birth DATE,
    occupation VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    preferred_budget_min NUMERIC(10,2),
    preferred_budget_max NUMERIC(10,2),
    preferred_location TEXT,
    preferred_radius_km NUMERIC(6,2),
    preferred_transport VARCHAR(50),
    preferred_vibe VARCHAR(50),
    preferred_time_from TIME,
    preferred_time_to TIME,
    preferred_event_type event_type_enum NOT NULL,
    interests TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    invite_link_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role group_role_enum NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    address TEXT,
    city VARCHAR(120),
    country VARCHAR(120),
    price_level SMALLINT CHECK (price_level BETWEEN 1 AND 5),
    rating NUMERIC(3,2) CHECK (rating BETWEEN 0 AND 5),
    source VARCHAR(100),
    external_source_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorite_venues (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, venue_id)
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type event_type_enum NOT NULL,
    status event_status_enum NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    target_date DATE,
    target_date_from DATE,
    target_date_to DATE,
    deadline_at TIMESTAMP,
    -- budget_min NUMERIC(10,2),
    -- budget_max NUMERIC(10,2),
    location_city VARCHAR(120),
    location_country VARCHAR(120),
    participant_count INTEGER CHECK (participant_count IS NULL OR participant_count >= 1),
    -- transportation_method transportation_enum,
    -- preferred_vibe VARCHAR(50),
    selected_venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
    finalized_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_group_event_consistency
        CHECK (
            (event_type = 'group' AND group_id IS NOT NULL)
            OR
            (event_type IN ('individual', 'manual'))
        )
);

CREATE TABLE IF NOT EXISTS event_participants (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_status participant_status_enum NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS slider_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    answer_mode answer_mode_enum NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES slider_questions(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer_value TEXT,
    min_value INTEGER,
    max_value INTEGER,
    weight INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_user_question UNIQUE (event_id, user_id, question)
);

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    score NUMERIC(8,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_venue UNIQUE (event_id, venue_id)
);

CREATE INDEX IF NOT EXISTS index_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS index_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS index_events_selected_venue_id ON events(selected_venue_id);
CREATE INDEX IF NOT EXISTS index_event_responses_event_id ON event_responses(event_id);
CREATE INDEX IF NOT EXISTS index_recommendations_event_id ON recommendations(event_id);
