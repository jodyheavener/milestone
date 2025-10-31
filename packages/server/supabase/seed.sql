-- Seed data for test user
-- This file creates a test user for development and testing purposes

-- Insert test user into auth.users
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password', gen_salt('bf')),
  current_timestamp,
  current_timestamp,
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{}',
  current_timestamp,
  current_timestamp,
  '',
  '',
  '',
  ''
);

-- Insert corresponding identity record
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) (
  select
    uuid_generate_v4(),
    id,
    id,
    format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
    'email',
    current_timestamp,
    current_timestamp,
    current_timestamp
  from auth.users
  where email = 'test@example.com'
);

-- Seed data for profile setup
-- This file sets up the profile for the test user created in user.sql

-- Update the profile for the test user
UPDATE public.profile 
SET 
    name = 'John Doe',
    job_title = 'Software Developer',
    employer_name = 'Brightstone Technologies',
    employer_description = 'Brightstone Technologies is a global SaaS company focused on building secure, AI-powered data platforms for enterprise clients. With offices across North America and Europe, Brightstone helps organizations streamline analytics, improve compliance, and scale their digital transformation efforts.',
    employer_website = 'https://brightstone.tech',
    flags = ARRAY['unrestricted_operations']
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'test@example.com'
);

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

