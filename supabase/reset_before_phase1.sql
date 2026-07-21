-- ONE-TIME MANUAL RESET — run this ONLY if your Supabase project has leftover
-- schema from a prior attempt at this CRM. This is DESTRUCTIVE and drops every
-- table, function, and row of data in the public schema. Do not run this
-- against a project with data you want to keep.
--
-- Run this in the Supabase Dashboard SQL Editor, then run
-- supabase/migrations/20260706220545_phase1_core_schema.sql afterward.

-- Drop the custom tenant-resolution function if a prior attempt created it
-- (it lives in the auth schema, so dropping/recreating public won't touch it).
drop function if exists auth.current_org_ids();

-- Wipe and recreate the public schema.
drop schema public cascade;
create schema public;

-- Restore Supabase's default schema privileges (mirrors a fresh project).
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
