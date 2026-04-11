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