-- ============================================================================
-- 6Homes — client portal
-- Paste into the Supabase SQL Editor and Run. Idempotent, additive.
--
-- It does two things:
--   1. adds a PRIVATE bucket for customer documents
--   2. tightens the existing RLS so the portal's customers — who now hold real
--      Supabase auth accounts — cannot read the CRM
--
-- Portal state (who may see a build, what we've asked for, what's approved)
-- lives inside the existing projects.data jsonb, so there is no new table.
-- ============================================================================

-- ── Who counts as staff ────────────────────────────────────────────────────
-- SECURITY DEFINER so it can read `admins` without going through `admins`'
-- own RLS — a policy on a table that queries that same table recurses forever.
-- This is the single definition of "staff" every policy below leans on.
create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon, service_role;

-- ── Private document store ─────────────────────────────────────────────────
-- NOT public, unlike 6homes-media. Everything in here is somebody's title deed,
-- bank letter or driver licence. It is reachable only through a signed URL that
-- api/portal.js mints after checking the caller is on that build.
insert into storage.buckets (id, name, public, file_size_limit)
values ('6homes-docs', '6homes-docs', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

-- Staff work with these files directly from the CRM. Customers get no policy
-- here at all — their uploads and downloads go through signed URLs, which is
-- what keeps one customer's folder invisible to every other customer.
drop policy if exists "auth manage 6homes docs" on storage.objects;
create policy "auth manage 6homes docs" on storage.objects
  for all to authenticated
  using (bucket_id = '6homes-docs' and public.is_admin())
  with check (bucket_id = '6homes-docs' and public.is_admin());

-- Belt and braces: no anon path into the document store, ever.
drop policy if exists "public read 6homes docs" on storage.objects;

-- The public media bucket stays publicly readable (the website serves from it)
-- but only staff may write to it.
drop policy if exists "auth write 6homes media" on storage.objects;
create policy "auth write 6homes media" on storage.objects
  for all to authenticated
  using (bucket_id = '6homes-media' and public.is_admin())
  with check (bucket_id = '6homes-media' and public.is_admin());

-- ── Tighten the CRM tables ─────────────────────────────────────────────────
-- Before the portal, "authenticated" and "admin" were the same set of people,
-- so `for all to authenticated using (true)` was sound. It no longer is:
-- customers are authenticated too. Same policy, now gated on is_admin().
do $$
declare t text;
begin
  foreach t in array array[
    'leads','lead_pipeline_stages','customers','designs','projects','quotes',
    'contracts','templates','settings','email_log','audit_log','esign_requests'
  ] loop
    execute format('drop policy if exists "auth full" on %I', t);
    execute format(
      'create policy "auth full" on %I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-- `admins` is its own case. Staff need to read and manage the whole list from
-- Settings; a portal customer needs to be able to ask "am I staff?" and get an
-- honest empty answer rather than an error.
drop policy if exists "auth full" on admins;
create policy "admins manage admins" on admins
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "read own admin row" on admins;
create policy "read own admin row" on admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ── Lookup by portal client ────────────────────────────────────────────────
-- api/portal.js resolves "which builds may this email see" on every request.
-- Trivial at today's volume; a GIN index keeps it trivial later.
create index if not exists projects_client_emails_idx
  on projects using gin ((data -> 'clientEmails'));
