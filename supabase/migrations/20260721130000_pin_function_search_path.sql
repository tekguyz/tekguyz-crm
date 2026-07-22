-- Supabase advisor flagged private.current_org_ids and
-- public.sync_modified_timestamp as having a mutable search_path — every
-- other function in this schema already has SET search_path pinned, these
-- two were simply missed in the original Phase 1 migration.
--
-- SET search_path = '' is safe for both: every object either function
-- references is already schema-qualified (public.organization_members,
-- auth.uid(), auth.users), and unqualified built-ins like now() still
-- resolve via pg_catalog, which Postgres always searches regardless of this
-- setting. current_org_ids is the higher-risk of the two since it's
-- SECURITY DEFINER; sync_modified_timestamp is a plain trigger function
-- (no elevated privileges) but is pinned too for consistency.

alter function private.current_org_ids() set search_path = '';
alter function public.sync_modified_timestamp() set search_path = '';
