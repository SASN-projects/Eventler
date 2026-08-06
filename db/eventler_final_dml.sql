-- USERS
INSERT INTO users (id, username, first_name, last_name, email, password_hash, city, country, date_of_birth, occupation)
VALUES
('11111111-1111-1111-1111-111111111111', 'shakedg', 'Shaked', 'Goren', 'shaked@example.com', 'hashed_pw_1', 'Tel Aviv', 'Israel', DATE '1999-01-10', 'Student'),
('22222222-2222-2222-2222-222222222222', 'sivan_a', 'Sivan', 'Alchasov', 'sivan@example.com', 'hashed_pw_2', 'Ramat Gan', 'Israel', DATE '2000-02-14', 'Student'),
('33333333-3333-3333-3333-333333333333', 'amit_s', 'Amit', 'Sahar', 'amit@example.com', 'hashed_pw_3', 'Herzliya', 'Israel', DATE '1999-06-01', 'Software Developer'),
('44444444-4444-4444-4444-444444444444', 'noam_n', 'Noam', 'Nahman', 'noam@example.com', 'hashed_pw_4', 'Petah Tikva', 'Israel', DATE '2001-03-21', 'Student')
ON CONFLICT (email) DO NOTHING;

-- USER PREFERENCES
INSERT INTO user_preferences
(id, user_id, preferred_budget_min, preferred_budget_max, preferred_location, preferred_radius_km, preferred_transport, preferred_vibe, preferred_time_from, preferred_time_to, preferred_event_type, interests)
VALUES
('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 50, 200, 'Tel Aviv', 15, 'car', 'lively', '18:00', '23:00', 'group', ARRAY['food','nightlife']),
('aaaaaaaa-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 30, 150, 'Ramat Gan', 10, 'bus', 'chill', '17:00', '22:00', 'individual', ARRAY['coffee','friends']),
('aaaaaaaa-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 80, 250, 'Herzliya', 20, 'car', 'luxury', '19:00', '23:30', 'manual', ARRAY['fine dining','concerts']),
('aaaaaaaa-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 0, 120, 'Petah Tikva', 25, 'walk', 'relaxed', '08:00', '18:00', 'group', ARRAY['nature','culture'])
ON CONFLICT (user_id) DO NOTHING;

-- VENUES
INSERT INTO venues (id, name, category, description, address, city, country, price_level, rating, source, external_source_id)
VALUES
('cccccccc-1111-1111-1111-111111111111', 'Urban Grill', 'Restaurant', 'Casual dinner place', '10 Rothschild Blvd', 'Tel Aviv', 'Israel', 3, 4.50, 'manual', 'v001'),
('cccccccc-2222-2222-2222-222222222222', 'Skyline Rooftop', 'Bar', 'Rooftop cocktails and city view', '25 Allenby St', 'Tel Aviv', 'Israel', 4, 4.70, 'google', 'g_002'),
('cccccccc-3333-3333-3333-333333333333', 'Yarkon Picnic Park', 'Outdoor Activity', 'Open green area for outdoor gatherings', 'Yarkon Park', 'Tel Aviv', 'Israel', 1, 4.60, 'manual', 'v003'),
('cccccccc-4444-4444-4444-444444444444', 'Museum Cafe', 'Museum', 'Quiet cafe near cultural attractions', '3 Shaul Hamelech Blvd', 'Tel Aviv', 'Israel', 2, 4.20, 'facebook', 'fb_004')
ON CONFLICT (id) DO NOTHING;

-- FAVORITE VENUES
INSERT INTO favorite_venues (user_id, venue_id)
VALUES
('11111111-1111-1111-1111-111111111111', 'cccccccc-2222-2222-2222-222222222222'),
('22222222-2222-2222-2222-222222222222', 'cccccccc-1111-1111-1111-111111111111'),
('44444444-4444-4444-4444-444444444444', 'cccccccc-3333-3333-3333-333333333333')
ON CONFLICT (user_id, venue_id) DO NOTHING;

-- SCHEMA COMPATIBILITY
-- Add tags column to slider_questions if it does not exist yet
-- (supports existing dev databases built from an earlier DDL version).
ALTER TABLE slider_questions ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- SLIDER QUESTIONS AND OPTIONS
--
-- RETIRED QUESTIONS (idempotent cleanup — safe on both fresh and existing databases)
-- Options must be deleted before their parent questions due to the FK constraint.
DELETE FROM question_options
WHERE question_id IN (
    SELECT id FROM slider_questions
    WHERE code IN (
        'transportation', 'location-type', 'evening-structure',
        'crowd', 'planning-style', 'event-type'
    )
);
DELETE FROM slider_questions
WHERE code IN (
    'transportation', 'location-type', 'evening-structure',
    'crowd', 'planning-style', 'event-type'
);

-- Remove old budget options before reinserting with improved labels.
-- The budget question row (dddddddd-1111-...) is kept and updated below.
DELETE FROM question_options
WHERE question_id = 'dddddddd-1111-1111-1111-111111111111';

-- Upsert budget question: keep stable ID, update label and image.
INSERT INTO slider_questions (id, code, label, description, answer_mode, image_url)
VALUES
    ('dddddddd-1111-1111-1111-111111111111', 'budget',
     'What is your budget per person?', '', 'options',
     'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80')
ON CONFLICT (code) DO UPDATE
    SET label     = EXCLUDED.label,
        image_url = EXCLUDED.image_url;

-- New questions (9): insert only — conflict is a no-op.
INSERT INTO slider_questions (id, code, label, description, answer_mode, image_url)
VALUES
    ('ffffffff-1111-1111-1111-111111111111', 'occasion',
     'What is the occasion for this event?', '', 'options',
     'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-2222-2222-2222-222222222222', 'vibe',
     'What vibe are you going for?', '', 'options',
     'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-3333-3333-3333-333333333333', 'activity',
     'What kind of activity do you have in mind?', '', 'options',
     'https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-4444-4444-4444-444444444444', 'setting',
     'Where would you prefer to go?', '', 'options',
     'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-5555-5555-5555-555555555555', 'time-of-day',
     'When during the day do you plan to go?', '', 'options',
     'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-6666-6666-6666-666666666666', 'food-drinks',
     'How important is food or drinks at this event?', '', 'options',
     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-7777-7777-7777-777777777777', 'group-dynamic',
     'What best describes your group for this event?', '', 'options',
     'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-8888-8888-8888-888888888888', 'energy-level',
     'How active or energetic should the event be?', '', 'options',
     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-9999-9999-9999-999999999999', 'must-have',
     'Is there anything that is a must-have for this event?', '', 'options',
     'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1400&q=80')
ON CONFLICT (code) DO NOTHING;

-- Budget options (replacement — old rows deleted above)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('bbbbbbbb-1111-1111-1111-111111111101', 'dddddddd-1111-1111-1111-111111111111', 'Low — up to 50 NIS'),
    ('bbbbbbbb-1111-1111-1111-111111111102', 'dddddddd-1111-1111-1111-111111111111', 'Moderate — 50 to 150 NIS'),
    ('bbbbbbbb-1111-1111-1111-111111111103', 'dddddddd-1111-1111-1111-111111111111', 'Generous — 150 to 300 NIS'),
    ('bbbbbbbb-1111-1111-1111-111111111104', 'dddddddd-1111-1111-1111-111111111111', 'Splurge — over 300 NIS')
ON CONFLICT (id) DO NOTHING;

-- Occasion options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-1111-1111-1111-111111111101', 'ffffffff-1111-1111-1111-111111111111', 'Birthday or milestone'),
    ('ffffffff-1111-1111-1111-111111111102', 'ffffffff-1111-1111-1111-111111111111', 'Date night or romantic'),
    ('ffffffff-1111-1111-1111-111111111103', 'ffffffff-1111-1111-1111-111111111111', 'Friends hangout'),
    ('ffffffff-1111-1111-1111-111111111104', 'ffffffff-1111-1111-1111-111111111111', 'Team or work event'),
    ('ffffffff-1111-1111-1111-111111111105', 'ffffffff-1111-1111-1111-111111111111', 'Family gathering'),
    ('ffffffff-1111-1111-1111-111111111106', 'ffffffff-1111-1111-1111-111111111111', 'Just for fun')
ON CONFLICT (id) DO NOTHING;

-- Vibe options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-2222-2222-2222-222222222201', 'ffffffff-2222-2222-2222-222222222222', 'Lively and energetic'),
    ('ffffffff-2222-2222-2222-222222222202', 'ffffffff-2222-2222-2222-222222222222', 'Relaxed and laid-back'),
    ('ffffffff-2222-2222-2222-222222222203', 'ffffffff-2222-2222-2222-222222222222', 'Upscale and refined'),
    ('ffffffff-2222-2222-2222-222222222204', 'ffffffff-2222-2222-2222-222222222222', 'Fun and playful'),
    ('ffffffff-2222-2222-2222-222222222205', 'ffffffff-2222-2222-2222-222222222222', 'Cozy and intimate')
ON CONFLICT (id) DO NOTHING;

-- Activity options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-3333-3333-3333-333333333301', 'ffffffff-3333-3333-3333-333333333333', 'Food and dining'),
    ('ffffffff-3333-3333-3333-333333333302', 'ffffffff-3333-3333-3333-333333333333', 'Drinks and nightlife'),
    ('ffffffff-3333-3333-3333-333333333303', 'ffffffff-3333-3333-3333-333333333333', 'Outdoor adventure'),
    ('ffffffff-3333-3333-3333-333333333304', 'ffffffff-3333-3333-3333-333333333333', 'Culture or arts'),
    ('ffffffff-3333-3333-3333-333333333305', 'ffffffff-3333-3333-3333-333333333333', 'Entertainment (escape room, bowling, cinema)'),
    ('ffffffff-3333-3333-3333-333333333306', 'ffffffff-3333-3333-3333-333333333333', 'Wellness and relaxation')
ON CONFLICT (id) DO NOTHING;

-- Setting options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-4444-4444-4444-444444444401', 'ffffffff-4444-4444-4444-444444444444', 'Indoors — restaurant, cafe, bar'),
    ('ffffffff-4444-4444-4444-444444444402', 'ffffffff-4444-4444-4444-444444444444', 'Outdoors — park, rooftop, beach'),
    ('ffffffff-4444-4444-4444-444444444403', 'ffffffff-4444-4444-4444-444444444444', 'A mix of both'),
    ('ffffffff-4444-4444-4444-444444444404', 'ffffffff-4444-4444-4444-444444444444', 'No strong preference')
ON CONFLICT (id) DO NOTHING;

-- Time of day options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-5555-5555-5555-555555555501', 'ffffffff-5555-5555-5555-555555555555', 'Morning or brunch (8am-12pm)'),
    ('ffffffff-5555-5555-5555-555555555502', 'ffffffff-5555-5555-5555-555555555555', 'Afternoon (12pm-5pm)'),
    ('ffffffff-5555-5555-5555-555555555503', 'ffffffff-5555-5555-5555-555555555555', 'Evening (5pm-9pm)'),
    ('ffffffff-5555-5555-5555-555555555504', 'ffffffff-5555-5555-5555-555555555555', 'Late night (9pm onward)')
ON CONFLICT (id) DO NOTHING;

-- Food and drinks options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-6666-6666-6666-666666666601', 'ffffffff-6666-6666-6666-666666666666', 'It is the main focus — great food or drinks'),
    ('ffffffff-6666-6666-6666-666666666602', 'ffffffff-6666-6666-6666-666666666666', 'Nice to have but not the main point'),
    ('ffffffff-6666-6666-6666-666666666603', 'ffffffff-6666-6666-6666-666666666666', 'Not important — we will eat before or after'),
    ('ffffffff-6666-6666-6666-666666666604', 'ffffffff-6666-6666-6666-666666666666', 'Completely open')
ON CONFLICT (id) DO NOTHING;

-- Group dynamic options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-7777-7777-7777-777777777701', 'ffffffff-7777-7777-7777-777777777777', 'Close friends who know each other well'),
    ('ffffffff-7777-7777-7777-777777777702', 'ffffffff-7777-7777-7777-777777777777', 'Mixed group — some people are new'),
    ('ffffffff-7777-7777-7777-777777777703', 'ffffffff-7777-7777-7777-777777777777', 'Colleagues or professional acquaintances'),
    ('ffffffff-7777-7777-7777-777777777704', 'ffffffff-7777-7777-7777-777777777777', 'Couple or two people'),
    ('ffffffff-7777-7777-7777-777777777705', 'ffffffff-7777-7777-7777-777777777777', 'Family including children')
ON CONFLICT (id) DO NOTHING;

-- Energy level options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-8888-8888-8888-888888888801', 'ffffffff-8888-8888-8888-888888888888', 'High energy — dancing, sports, adventure'),
    ('ffffffff-8888-8888-8888-888888888802', 'ffffffff-8888-8888-8888-888888888888', 'Moderate — a fun activity or walkable experience'),
    ('ffffffff-8888-8888-8888-888888888803', 'ffffffff-8888-8888-8888-888888888888', 'Low — sitting down, relaxing, or just talking'),
    ('ffffffff-8888-8888-8888-888888888804', 'ffffffff-8888-8888-8888-888888888888', 'Flexible — open to anything')
ON CONFLICT (id) DO NOTHING;

-- Must-have options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-9999-9999-9999-999999999901', 'ffffffff-9999-9999-9999-999999999999', 'Parking available'),
    ('ffffffff-9999-9999-9999-999999999902', 'ffffffff-9999-9999-9999-999999999999', 'Kid-friendly'),
    ('ffffffff-9999-9999-9999-999999999903', 'ffffffff-9999-9999-9999-999999999999', 'Pet-friendly'),
    ('ffffffff-9999-9999-9999-999999999904', 'ffffffff-9999-9999-9999-999999999999', 'Wheelchair accessible'),
    ('ffffffff-9999-9999-9999-999999999905', 'ffffffff-9999-9999-9999-999999999999', 'Private or semi-private space'),
    ('ffffffff-9999-9999-9999-999999999906', 'ffffffff-9999-9999-9999-999999999999', 'None of the above')
ON CONFLICT (id) DO NOTHING;

-- QUESTION TAGS
-- Assign tags to questions so getSlides() can filter tag-based follow-up questions.
-- Tags align with the vibe taxonomy: initial, preference, dining, sightseeing, active,
-- clubbing, casual, cultural.
-- These UPDATE statements are idempotent — safe to re-run on existing databases.
UPDATE slider_questions SET tags = ARRAY['initial','preference']     WHERE code = 'occasion';
UPDATE slider_questions SET tags = ARRAY['initial']                  WHERE code = 'vibe';
UPDATE slider_questions SET tags = ARRAY['dining','active','cultural','casual'] WHERE code = 'activity';
UPDATE slider_questions SET tags = ARRAY['preference','budget']      WHERE code = 'budget';
UPDATE slider_questions SET tags = ARRAY['active','casual']          WHERE code = 'energy-level';
UPDATE slider_questions SET tags = ARRAY['dining','casual']          WHERE code = 'food-drinks';
UPDATE slider_questions SET tags = ARRAY['preference']               WHERE code = 'group-dynamic';
UPDATE slider_questions SET tags = ARRAY['preference']               WHERE code = 'must-have';
UPDATE slider_questions SET tags = ARRAY['active','casual','sightseeing'] WHERE code = 'setting';
UPDATE slider_questions SET tags = ARRAY['preference']               WHERE code = 'time-of-day';