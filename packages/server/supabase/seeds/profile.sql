-- Seed data for profile setup
-- This file sets up the profile for the test user created in user.sql

-- Update the profile for the test user
UPDATE public.profile 
SET 
    name = 'John Doe',
    job_title = 'Software Developer',
    employer_name = 'Brightstone Technologies',
    employer_description = 'Brightstone Technologies is a global SaaS company focused on building secure, AI-powered data platforms for enterprise clients. With offices across North America and Europe, Brightstone helps organizations streamline analytics, improve compliance, and scale their digital transformation efforts.',
    employer_website = 'https://brightstone.tech'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'test@example.com'
);
