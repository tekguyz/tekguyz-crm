-- Task editing + non-destructive dismiss (2026-08-19).
--
-- `dismissed` is to `tasks` what `archived` is to `leads`: it removes a row
-- from every active surface without ever removing the row. There is
-- deliberately still NO DELETE grant and NO DELETE policy on this table — a
-- literal delete would contradict the no-hard-deletes discipline that the
-- Resurrection Engine depends on, and nothing here adds one.
--
-- No new RLS policy is needed. "Tenant members update their tasks" is a plain
-- paired USING/WITH CHECK on organization_id with no column-level gate (unlike
-- `leads`, whose lifecycle columns are gated by a BEFORE UPDATE trigger), so
-- it already authorises writing this column. Confirmed against the live
-- catalog before this file was written.
--
-- `dismissed` is orthogonal to `completed`: a task can be open-and-dismissed
-- or complete-and-dismissed, and dismissing never touches completion state.

alter table public.tasks
    add column dismissed boolean not null default false;

-- The agenda's worklist query filters completed = false AND dismissed = false,
-- so the existing partial index's predicate has to learn the second condition
-- or it stops covering that query. Replaced rather than supplemented — two
-- overlapping partial indexes on the same columns would both need maintaining
-- on every write for no read benefit.
drop index if exists public.idx_tasks_org_due;

create index idx_tasks_org_due on public.tasks(organization_id, due_at)
    where completed = false and dismissed = false;
