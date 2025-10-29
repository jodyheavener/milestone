-- Seed data for project setup
-- This file creates a project for the test user created in user.sql

-- Create a project for the test user
INSERT INTO public.project (
    user_id,
    title,
    goal
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'test@example.com'),
    'Performance Review Prep',
    'Collect highlights and impact metrics from this review period to support my self-assessment.'
);
