-- ============================================================================
-- 6Homes — staff roles
-- Paste into the Supabase SQL Editor and Run. Idempotent, additive.
--
-- Until now every row in `admins` meant the same thing: full access to
-- everything. This splits that in two, so someone who only needs to run builds
-- can be given builds and nothing else.
--
--   owner     everything, and may add or remove staff
--   admin     everything
--   projects  builds and the client portal, plus the design range to refer to.
--             No leads, no quotes or contracts, no templates, no settings,
--             no email log.
--
-- Hiding nav items in the browser is courtesy. THIS is the boundary: a
-- `projects` account holds a real Supabase session, so without these policies
-- it could read every lead and every price straight out of the database with
-- the anon key, whatever the interface chose to show it.
-- ============================================================================

-- ── Who is what ────────────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read `admins` without going through `admins`'
-- own RLS, which would recurse.

create or replace function public.is_admin()
  returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- Full access. Anything not explicitly opened to `projects` needs this.
-- An unrecognised or missing role is treated as full, because that is what
-- every existing row meant before this file was written — a migration must not
-- quietly demote the people already using the system.
create or replace function public.is_full_admin()
  returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(a.role, 'admin') <> 'projects'
  )
$$;

create or replace function public.is_owner()
  returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.role = 'owner'
  )
$$;

revoke all on function public.is_admin(), public.is_full_admin(), public.is_owner() from public;
grant execute on function public.is_admin(), public.is_full_admin(), public.is_owner()
  to authenticated, anon, service_role;

-- ── Full-access-only tables ────────────────────────────────────────────────
-- The pipeline, the money, the wording and the configuration.
do $$
declare t text;
begin
  foreach t in array array[
    'leads','lead_pipeline_stages','quotes','contracts','esign_requests',
    'templates','settings','email_log','audit_log'
  ] loop
    execute format('drop policy if exists "auth full" on %I', t);
    execute format('drop policy if exists "staff read" on %I', t);
    execute format(
      'create policy "auth full" on %I for all to authenticated using (public.is_full_admin()) with check (public.is_full_admin())',
      t
    );
  end loop;
end $$;

-- ── Builds ─────────────────────────────────────────────────────────────────
-- The `projects` role's actual job: move builds through their stages and run
-- the client portal.
drop policy if exists "auth full" on projects;
create policy "auth full" on projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Designs and customers ──────────────────────────────────────────────────
-- Readable by any staff member, because a build is meaningless without the
-- design it is and the person it belongs to. Writable only by full admins:
-- the design range is what the public website, the brochures and every quote
-- read from, so it is not something to edit from a builds-only account.
drop policy if exists "auth full" on designs;
create policy "staff read" on designs for select to authenticated using (public.is_admin());
create policy "auth full" on designs
  for all to authenticated using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "auth full" on customers;
create policy "staff read" on customers for select to authenticated using (public.is_admin());
create policy "auth full" on customers
  for all to authenticated using (public.is_full_admin()) with check (public.is_full_admin());

-- ── The staff list ─────────────────────────────────────────────────────────
-- Only an owner may change who has access. Everyone reads their own row, which
-- is how the app resolves "what am I".
drop policy if exists "auth full" on admins;
drop policy if exists "admins manage admins" on admins;
create policy "owners manage staff" on admins
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "read own admin row" on admins;
create policy "read own admin row" on admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Full admins can see the whole team without being able to change it.
drop policy if exists "staff read team" on admins;
create policy "staff read team" on admins
  for select to authenticated using (public.is_full_admin());

-- ── Document storage ───────────────────────────────────────────────────────
-- Any staff member running a build needs the documents on it.
drop policy if exists "auth manage 6homes docs" on storage.objects;
create policy "auth manage 6homes docs" on storage.objects
  for all to authenticated
  using (bucket_id = '6homes-docs' and public.is_admin())
  with check (bucket_id = '6homes-docs' and public.is_admin());

-- The public media bucket backs the website, so writing to it stays with full
-- admins even though it is publicly readable.
drop policy if exists "auth write 6homes media" on storage.objects;
create policy "auth write 6homes media" on storage.objects
  for all to authenticated
  using (bucket_id = '6homes-media' and public.is_full_admin())
  with check (bucket_id = '6homes-media' and public.is_full_admin());

-- ── Constrain the column ───────────────────────────────────────────────────
-- A typo in a role is a silent privilege change, in whichever direction the
-- functions above happen to fall. Make the database refuse it.
alter table admins drop constraint if exists admins_role_check;
alter table admins add constraint admins_role_check
  check (role in ('owner', 'admin', 'projects'));
