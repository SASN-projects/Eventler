-- -------------------------------------------------------------
-- Tag-Based Dynamic Recommendation Wizard DDL
-- -------------------------------------------------------------

-- 1. Create the Tags Table
-- Stores the high-level vibes/topics (e.g., dining, sightseeing, active, clubbing, casual, cultural)
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create the Questions Table (Replaces or adapts slider_questions)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- E.g., 'dining-style', 'exploration-mode'
    question_text VARCHAR(255) NOT NULL,
    description TEXT,
    answer_mode VARCHAR(50) NOT NULL DEFAULT 'options', -- E.g., 'options', 'value'
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Create the Junction Table for Question Tags (Many-to-Many)
-- Connects questions to the vibes/tags that make them relevant
CREATE TABLE IF NOT EXISTS question_tags (
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- 4. Create the Question Options Table
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. OPTIONAL: Option-to-Tag Junction Table (Highly recommended for dynamic progression)
-- When a user selects a specific option, it can activate/add new tags to their session
-- (e.g., choosing "Fine dining" option can dynamically activate the "cultural" tag for subsequent questions)
CREATE TABLE IF NOT EXISTS option_tags (
    option_id UUID REFERENCES question_options(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (option_id, tag_id)
);

-- Indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_option_tags_tag_id ON option_tags(tag_id);
