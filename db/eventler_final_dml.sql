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

-- GROUPS
INSERT INTO groups (id, name, description, created_by, invite_link_token, created_at, updated_at)
VALUES
('77777777-7777-7777-7777-777777777777', 'The Gang', 'Close friends that hang out frequently', '11111111-1111-1111-1111-111111111111', 'thegang-token-abc', NOW(), NOW()),
('88888888-8888-8888-8888-888888888888', 'Homies', 'Casual group for nearby meetups', '22222222-2222-2222-2222-222222222222', 'homies-token-xyz', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- GROUP MEMBERS
INSERT INTO group_members (group_id, user_id, role, joined_at)
VALUES
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'ADMIN', NOW()),
('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'MEMBER', NOW()),
('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'MEMBER', NOW()),
('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'ADMIN', NOW()),
('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'MEMBER', NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

-- FAVORITE VENUES
INSERT INTO favorite_venues (user_id, venue_id)
VALUES
('11111111-1111-1111-1111-111111111111', 'cccccccc-2222-2222-2222-222222222222'),
('22222222-2222-2222-2222-222222222222', 'cccccccc-1111-1111-1111-111111111111'),
('44444444-4444-4444-4444-444444444444', 'cccccccc-3333-3333-3333-333333333333')
ON CONFLICT (user_id, venue_id) DO NOTHING;

-- SLIDER QUESTIONS AND OPTIONS
INSERT INTO slider_questions (id, code, label, description, answer_mode, image_url)
VALUES
('dddddddd-1111-1111-1111-111111111111', 'budget', 'What is your preferred budget?', '', 'options', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80'),
('dddddddd-2222-2222-2222-222222222222', 'event-type', 'What type of event do you prefer?', '', 'options', 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?auto=format&fit=crop&w=1400&q=80'),
('dddddddd-3333-3333-3333-333333333333', 'transportation', 'Transportation preference?', '', 'options', 'https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=1400&q=80'),
('dddddddd-4444-4444-4444-444444444444', 'crowd', 'Preferred crowd size?', '', 'options', 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=1400&q=80'),
('dddddddd-5555-5555-5555-555555555555', 'planning-style', 'Do we want a spontaneous night or something planned in advance?', '', 'options', 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1400&q=80'),
('dddddddd-6666-6666-6666-666666666666', 'location-type', 'Do we prefer a local spot or somewhere special or unique?', '', 'options', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80'),
('dddddddd-7777-7777-7777-777777777777', 'evening-structure', 'Should it be one main activity or a multi-stop evening?', '', 'options', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80')
ON CONFLICT (code) DO NOTHING;

INSERT INTO question_options (id, question_id, value)
VALUES
('eeeeeeee-1111-1111-1111-111111111111', 'dddddddd-1111-1111-1111-111111111111', 'Low (Under 50 NIS)'),
('eeeeeeee-2222-2222-2222-222222222222', 'dddddddd-1111-1111-1111-111111111111', 'Medium (50-150 NIS)'),
('eeeeeeee-3333-3333-3333-333333333333', 'dddddddd-1111-1111-1111-111111111111', 'High (150-300 NIS)'),
('eeeeeeee-4444-4444-4444-444444444444', 'dddddddd-1111-1111-1111-111111111111', 'Luxury (Over 300 NIS)'),
('eeeeeeee-5555-5555-5555-555555555555', 'dddddddd-2222-2222-2222-222222222222', 'Party and Social Gathering'),
('eeeeeeee-6666-6666-6666-666666666666', 'dddddddd-2222-2222-2222-222222222222', 'Relaxation and Wellness'),
('eeeeeeee-7777-7777-7777-777777777777', 'dddddddd-2222-2222-2222-222222222222', 'Restaurant and Dining'),
('eeeeeeee-8888-8888-8888-888888888888', 'dddddddd-2222-2222-2222-222222222222', 'Outdoor and Adventure'),
('eeeeeeee-9999-9999-9999-999999999999', 'dddddddd-3333-3333-3333-333333333333', 'Car'),
('eeeeeeee-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-3333-3333-3333-333333333333', 'Public Transport'),
('eeeeeeee-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-3333-3333-3333-333333333333', 'Bike'),
('eeeeeeee-cccc-cccc-cccc-cccccccccccc', 'dddddddd-3333-3333-3333-333333333333', 'Walking'),
('eeeeeeee-1111-1111-1111-111111111112', 'dddddddd-5555-5555-5555-555555555555', 'Spontaneous and open-ended'),
('eeeeeeee-1111-1111-1111-111111111113', 'dddddddd-5555-5555-5555-555555555555', 'Planned for tonight with a known place'),
('eeeeeeee-1111-1111-1111-111111111114', 'dddddddd-5555-5555-5555-555555555555', 'Booked reservation ahead of time'),
('eeeeeeee-1111-1111-1111-111111111115', 'dddddddd-5555-5555-5555-555555555555', 'Mix of plan and flexibility'),
('eeeeeeee-2222-2222-2222-222222222223', 'dddddddd-6666-6666-6666-666666666666', 'Stay local and easy'),
('eeeeeeee-2222-2222-2222-222222222224', 'dddddddd-6666-6666-6666-666666666666', 'Try a trendy new venue'),
('eeeeeeee-2222-2222-2222-222222222225', 'dddddddd-6666-6666-6666-666666666666', 'Go for a memorable destination'),
('eeeeeeee-2222-2222-2222-222222222226', 'dddddddd-6666-6666-6666-666666666666', 'Choose something with a unique vibe'),
('eeeeeeee-3333-3333-3333-333333333337', 'dddddddd-7777-7777-7777-777777777777', 'One focused plan (dinner only)'),
('eeeeeeee-3333-3333-3333-333333333338', 'dddddddd-7777-7777-7777-777777777777', 'Dinner then drinks'),
('eeeeeeee-3333-3333-3333-333333333339', 'dddddddd-7777-7777-7777-777777777777', 'Dinner plus an activity'),
('eeeeeeee-3333-3333-3333-333333333330', 'dddddddd-7777-7777-7777-777777777777', 'Bar/cafe crawl with a few stops'),
('eeeeeeee-dddd-dddd-dddd-dddddddddddd', 'dddddddd-4444-4444-4444-444444444444', 'Small (1-10 people)'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dddddddd-4444-4444-4444-444444444444', 'Medium (11-50 people)'),
('eeeeeeee-ffff-ffff-ffff-ffffffffffff', 'dddddddd-4444-4444-4444-444444444444', 'Large (51-100 people)'),
('eeeeeeee-999a-9999-9999-999999999999', 'dddddddd-4444-4444-4444-444444444444', 'Very Large (101+ people)')
ON CONFLICT (id) DO NOTHING;