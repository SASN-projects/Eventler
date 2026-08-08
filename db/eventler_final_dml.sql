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

-- Retire 'vibe', 'activity', and 'time-of-day' as slide questions: vibe/activity
-- category is now captured by the dedicated vibe-select step before sliding starts,
-- and the exact start time is already chosen in the base event-creation step.
-- Safe to delete outright — event_responses.question is free text, not an FK to
-- slider_questions, and question_options cascades on delete.
DELETE FROM slider_questions WHERE code IN ('vibe', 'activity', 'time-of-day');

-- Upsert budget question: keep stable ID, update label and image.
INSERT INTO slider_questions (id, code, label, description, answer_mode, image_url)
VALUES
    ('dddddddd-1111-1111-1111-111111111111', 'budget',
     'What is your budget per person?', '', 'options',
     'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80')
ON CONFLICT (code) DO UPDATE
    SET label     = EXCLUDED.label,
        image_url = EXCLUDED.image_url;

INSERT INTO slider_questions (id, code, label, description, answer_mode, image_url)
VALUES
    ('ffffffff-1111-1111-1111-111111111111', 'occasion',
     'What is the occasion for this event?', '', 'options',
     'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-4444-4444-4444-444444444444', 'setting',
     'Where would you prefer to go?', '', 'options',
     'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=80'),

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
     'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1400&q=80'),

    -- Activity-specific follow-ups (only surfaced once a vibe/activity category is
    -- known — see QUESTION TAGS below).
    ('ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cuisine',
     'What cuisine do you prefer?', '', 'options',
     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dining-style',
     'What kind of dining experience do you prefer?', '', 'options',
     'https://images.unsplash.com/photo-1592861956120-e524fc739696?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-cccc-cccc-cccc-cccccccccccc', 'active-type',
     'What kind of active experience do you want?', '', 'options',
     'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-dddd-dddd-dddd-dddddddddddd', 'difficulty',
     'How physically demanding should the activity be?', '', 'options',
     'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-eeee-eeee-eeee-eeeeeeeeeeee', 'culture-type',
     'What kind of cultural/arts experience do you prefer?', '', 'options',
     'https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=1400&q=80'),

    ('ffffffff-1234-1234-1234-123412341234', 'socialization',
     'What level of socialization are you looking for?', '', 'options',
     'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80')
ON CONFLICT (code) DO NOTHING;

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

-- Setting options
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-4444-4444-4444-444444444401', 'ffffffff-4444-4444-4444-444444444444', 'Indoors — restaurant, cafe, bar'),
    ('ffffffff-4444-4444-4444-444444444402', 'ffffffff-4444-4444-4444-444444444444', 'Outdoors — park, rooftop, beach'),
    ('ffffffff-4444-4444-4444-444444444403', 'ffffffff-4444-4444-4444-444444444444', 'A mix of both'),
    ('ffffffff-4444-4444-4444-444444444404', 'ffffffff-4444-4444-4444-444444444444', 'No strong preference')
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

-- Cuisine options (dining vibe follow-up)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Italian'),
    ('ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaa02', 'ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asian'),
    ('ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaa03', 'ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mediterranean or Middle Eastern'),
    ('ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaa04', 'ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'American or burgers'),
    ('ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaa05', 'ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Open to anything')
ON CONFLICT (id) DO NOTHING;

-- Dining style options (dining vibe follow-up)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Casual or quick bite'),
    ('ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sit-down restaurant'),
    ('ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Fine dining'),
    ('ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Street food or market'),
    ('ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'ffffffff-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'No strong preference')
ON CONFLICT (id) DO NOTHING;

-- Active type options (active vibe follow-up)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-cccc-cccc-cccc-cccccccccc01', 'ffffffff-cccc-cccc-cccc-cccccccccccc', 'Sports or games (bowling, escape room)'),
    ('ffffffff-cccc-cccc-cccc-cccccccccc02', 'ffffffff-cccc-cccc-cccc-cccccccccccc', 'Outdoor adventure (hiking, biking)'),
    ('ffffffff-cccc-cccc-cccc-cccccccccc03', 'ffffffff-cccc-cccc-cccc-cccccccccccc', 'Fitness or movement (climbing, dance)'),
    ('ffffffff-cccc-cccc-cccc-cccccccccc04', 'ffffffff-cccc-cccc-cccc-cccccccccccc', 'Water activities'),
    ('ffffffff-cccc-cccc-cccc-cccccccccc05', 'ffffffff-cccc-cccc-cccc-cccccccccccc', 'Open to anything')
ON CONFLICT (id) DO NOTHING;

-- Difficulty options (active vibe follow-up)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-dddd-dddd-dddd-dddddddddd01', 'ffffffff-dddd-dddd-dddd-dddddddddddd', 'Very light — mostly relaxed'),
    ('ffffffff-dddd-dddd-dddd-dddddddddd02', 'ffffffff-dddd-dddd-dddd-dddddddddddd', 'Moderate — some movement'),
    ('ffffffff-dddd-dddd-dddd-dddddddddd03', 'ffffffff-dddd-dddd-dddd-dddddddddddd', 'Challenging — a real workout'),
    ('ffffffff-dddd-dddd-dddd-dddddddddd04', 'ffffffff-dddd-dddd-dddd-dddddddddddd', 'No preference')
ON CONFLICT (id) DO NOTHING;

-- Culture type options (cultural/sightseeing vibe follow-up)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-eeee-eeee-eeee-eeeeeeeeee01', 'ffffffff-eeee-eeee-eeee-eeeeeeeeeeee', 'Museums and galleries'),
    ('ffffffff-eeee-eeee-eeee-eeeeeeeeee02', 'ffffffff-eeee-eeee-eeee-eeeeeeeeeeee', 'Historical sites and landmarks'),
    ('ffffffff-eeee-eeee-eeee-eeeeeeeeee03', 'ffffffff-eeee-eeee-eeee-eeeeeeeeeeee', 'Live performance (theater, music)'),
    ('ffffffff-eeee-eeee-eeee-eeeeeeeeee04', 'ffffffff-eeee-eeee-eeee-eeeeeeeeeeee', 'Local markets and neighborhoods'),
    ('ffffffff-eeee-eeee-eeee-eeeeeeeeee05', 'ffffffff-eeee-eeee-eeee-eeeeeeeeeeee', 'Architecture and scenic views')
ON CONFLICT (id) DO NOTHING;

-- Socialization options (cultural/clubbing/casual vibe follow-up)
INSERT INTO question_options (id, question_id, value)
VALUES
    ('ffffffff-1234-1234-1234-123412341201', 'ffffffff-1234-1234-1234-123412341234', 'Intimate — just us'),
    ('ffffffff-1234-1234-1234-123412341202', 'ffffffff-1234-1234-1234-123412341234', 'Social — mingling welcome'),
    ('ffffffff-1234-1234-1234-123412341203', 'ffffffff-1234-1234-1234-123412341234', 'Lively — meeting new people'),
    ('ffffffff-1234-1234-1234-123412341204', 'ffffffff-1234-1234-1234-123412341234', 'Open to anything')
ON CONFLICT (id) DO NOTHING;

-- QUESTION TAGS
-- Assign tags to questions so getSlides() can filter tag-based follow-up questions.
-- Tags align with the vibe taxonomy: initial, preference, dining, sightseeing, active,
-- clubbing, casual, cultural.
-- These UPDATE statements are idempotent — safe to re-run on existing databases.
UPDATE slider_questions SET tags = ARRAY['initial','preference']     WHERE code = 'occasion';
UPDATE slider_questions SET tags = ARRAY['preference','budget']      WHERE code = 'budget';
UPDATE slider_questions SET tags = ARRAY['active','casual']          WHERE code = 'energy-level';
UPDATE slider_questions SET tags = ARRAY['dining','casual']          WHERE code = 'food-drinks';
UPDATE slider_questions SET tags = ARRAY['preference']               WHERE code = 'group-dynamic';
UPDATE slider_questions SET tags = ARRAY['preference']               WHERE code = 'must-have';
UPDATE slider_questions SET tags = ARRAY['active','casual','sightseeing'] WHERE code = 'setting';

-- Activity-specific follow-up tags — align with the vibe-select options
-- (dining, sightseeing, active, clubbing, casual, cultural).
UPDATE slider_questions SET tags = ARRAY['dining']                   WHERE code = 'cuisine';
UPDATE slider_questions SET tags = ARRAY['dining']                   WHERE code = 'dining-style';
UPDATE slider_questions SET tags = ARRAY['active']                   WHERE code = 'active-type';
UPDATE slider_questions SET tags = ARRAY['active']                   WHERE code = 'difficulty';
UPDATE slider_questions SET tags = ARRAY['cultural','sightseeing']   WHERE code = 'culture-type';
UPDATE slider_questions SET tags = ARRAY['cultural','clubbing','casual'] WHERE code = 'socialization';
