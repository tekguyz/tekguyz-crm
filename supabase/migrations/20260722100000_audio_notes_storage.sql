-- Prompt 13: voice memo storage for NoteCaptureForm's recording mode.
--
-- The audio-notes bucket already existed in the live project (created
-- out-of-band, not by any migration in this repo) as `public = true` with
-- zero storage.objects policies. That's wrong for tenant-private audio: a
-- public bucket serves reads to anyone with the path regardless of any
-- policy written here, since "public" bypasses read-side RLS entirely. This
-- migration flips it private and adds real tenant-scoped policies. It's
-- written as an idempotent upsert so it's also correct on a fresh project
-- where the bucket doesn't exist yet.

insert into storage.buckets (id, name, public)
values ('audio-notes', 'audio-notes', false)
on conflict (id) do update set public = false;

-- Path convention: {organization_id}/{leadId}/{timestamp}.webm — the first
-- path segment is the tenant boundary, checked against private.current_org_ids()
-- (this project's tenant-resolution function; it lives in `private`, not `auth`).

create policy "Members read tenant audio notes"
on storage.objects for select
using (
    bucket_id = 'audio-notes'
    and (storage.foldername(name))[1]::uuid in (select private.current_org_ids())
);

create policy "Members upload tenant audio notes"
on storage.objects for insert
with check (
    bucket_id = 'audio-notes'
    and (storage.foldername(name))[1]::uuid in (select private.current_org_ids())
);

-- No UPDATE/DELETE policies — audio notes are immutable, same as
-- activity_logs having no update/delete grant at all.
