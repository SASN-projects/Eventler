-- Sample user data
INSERT INTO users (id, email, username, password, city, age, occupation)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'test@eventler.com', 'testuser', 'hashedpassword', 'Tel Aviv', 28, 'Software Developer');

-- Sample event types
INSERT INTO event_types (id, name)
VALUES 
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Restaurant'),
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Concert'),
  ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Outdoor Activity'),
  ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'Museum'),
  ('b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'Movie');

-- Sample user preferences
INSERT INTO user_preferences (user_id, budget, location, event_type_id, transportation)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 100, 'Tel Aviv', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'BUS');
