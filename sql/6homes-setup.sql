-- ============================================================================
-- 6Homes — one-shot database setup
-- Paste this ENTIRE file into the Supabase SQL Editor and click Run.
-- Idempotent: safe to re-run at any time.
--
-- Storage pattern (same as Hexa Space RND): every table is
--   id text primary key, data jsonb not null, updated_at timestamptz
-- so the app keeps one shape in memory and the schema never blocks a field.
--
-- Access model — tighter than the Hexa original:
--   authenticated  → full read/write (the admin SPA, signed in against `admins`)
--   anon           → read-only, and ONLY published designs/projects (the website)
--   service role   → bypasses RLS entirely; used by every /api function
-- Public token-addressed pages (quote accept, e-sign) never touch the DB
-- directly — they go through /api, which resolves the token server-side.
-- ============================================================================

-- ── Core tables ─────────────────────────────────────────────────────────────
create table if not exists leads                ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists lead_pipeline_stages ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists customers            ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists designs              ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists projects             ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists quotes               ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists contracts            ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists templates            ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists settings             ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists email_log            ( id text primary key, data jsonb not null, updated_at timestamptz default now() );
create table if not exists audit_log            ( id text primary key, data jsonb not null, updated_at timestamptz default now() );

-- Admin allow-list. A Supabase auth user only counts as an admin if their
-- email appears here (api/_auth.js isAdminEmail).
create table if not exists admins (
  email text primary key,
  name text,
  role text default 'admin',
  created_at timestamptz default now()
);

-- E-sign requests are relational (not jsonb) — they're queried by token from a
-- public page and the columns are stable. Mirrors Hexa's esign-schema.sql.
create table if not exists esign_requests (
  token text primary key,
  contract_id text not null,
  customer_id text,
  status text default 'pending',
  customer_signature_data text,
  customer_signer_name text,
  customer_signed_at timestamptz,
  customer_title text,
  company_signature_data text,
  company_signer_name text,
  company_signed_at timestamptz,
  created_at timestamptz default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
-- Leads are filtered by stage and swept daily by the nurture cron; designs and
-- projects are read by slug from the website on every build.
create index if not exists leads_stage_idx    on leads    ((data->>'stageId'));
create index if not exists leads_created_idx  on leads    ((data->>'createdAt'));
create index if not exists designs_slug_idx   on designs  ((data->>'slug'));
create index if not exists projects_slug_idx  on projects ((data->>'slug'));
create index if not exists quotes_token_idx   on quotes   ((data->>'token'));
create index if not exists email_log_sent_idx on email_log ((data->>'sentAt'));

-- ── Row level security ─────────────────────────────────────────────────────
alter table leads                enable row level security;
alter table lead_pipeline_stages enable row level security;
alter table customers            enable row level security;
alter table designs              enable row level security;
alter table projects             enable row level security;
alter table quotes               enable row level security;
alter table contracts            enable row level security;
alter table templates            enable row level security;
alter table settings             enable row level security;
alter table email_log            enable row level security;
alter table audit_log            enable row level security;
alter table admins               enable row level security;
alter table esign_requests       enable row level security;

-- Signed-in admins get full access to everything.
do $$
declare t text;
begin
  foreach t in array array[
    'leads','lead_pipeline_stages','customers','designs','projects','quotes',
    'contracts','templates','settings','email_log','audit_log','admins','esign_requests'
  ] loop
    execute format('drop policy if exists "auth full" on %I', t);
    execute format('create policy "auth full" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- The public website reads published designs and projects with the anon key.
-- Read-only, and only rows explicitly marked published.
drop policy if exists "anon read published designs" on designs;
create policy "anon read published designs" on designs
  for select to anon using ((data->>'published')::boolean is true);

drop policy if exists "anon read published projects" on projects;
create policy "anon read published projects" on projects
  for select to anon using ((data->>'published')::boolean is true);

-- Deliberately NO anon policy on leads. Website enquiries are written by
-- /api/form-submit with the service role, which bypasses RLS.

-- ── Seed: lead pipeline stages ─────────────────────────────────────────────
-- `category` drives automation: 'new' stages are what the nurture cron chases,
-- 'lost' is where it parks cold leads.
insert into lead_pipeline_stages (id, data) values
  ('stage_new',       '{"id":"stage_new","name":"New enquiry","category":"new","order":0,"color":"#3b82f6"}'),
  ('stage_contacted', '{"id":"stage_contacted","name":"Contacted","category":"in-progress","order":1,"color":"#8b5cf6"}'),
  ('stage_consult',   '{"id":"stage_consult","name":"Consult booked","category":"in-progress","order":2,"color":"#f59e0b"}'),
  ('stage_quoted',    '{"id":"stage_quoted","name":"Quoted","category":"in-progress","order":3,"color":"#14b8a6"}'),
  ('stage_won',       '{"id":"stage_won","name":"Won","category":"closed","order":4,"color":"#16a34a"}'),
  ('stage_lost',      '{"id":"stage_lost","name":"Lost","category":"lost","order":5,"color":"#94a3b8"}')
on conflict (id) do nothing;

-- ── Seed: global settings ──────────────────────────────────────────────────
-- NOTE emails.safeMode is true. While it stays true every outbound email is
-- redirected to emails.safeRecipient. Flip it to false only at launch.
insert into settings (id, data) values ('global', jsonb_build_object(
  'company', jsonb_build_object(
    'name', '6Homes',
    'legalName', '6Homes Pty Ltd',
    'website', '6homes.com',
    'phone', '1800 646 637',
    'phoneDisplay', '1800 6HOMES',
    'headOffice', '4/830 Whitehorse Road, Box Hill VIC 3128',
    'showroom', '878 Whitehorse Road, Box Hill VIC 3128'
  ),
  'emails', jsonb_build_object(
    'safeMode', true,
    'safeRecipient', 'melissa@6homes.com',
    'fromName', '6Homes',
    'fromEmail', 'noreply@6homes.com',
    'replyTo', 'melissa@6homes.com',
    'notify', jsonb_build_array('melissa@6homes.com'),
    'suppressed', jsonb_build_array()
  ),
  'leads', jsonb_build_object(
    'consultUrl', 'https://6homes.com/contact',
    'nurtureEnabled', true
  )
)) on conflict (id) do nothing;

-- ── Seed: first admin ──────────────────────────────────────────────────────
-- Add the rest of the team here (or from Settings once you can sign in).
insert into admins (email, name, role) values
  ('eric@6homes.com', 'Eric', 'owner'),
  ('melissa@6homes.com', 'Melissa', 'admin')
on conflict (email) do nothing;

-- ── Storage bucket for design galleries / floorplans / brochures ───────────
insert into storage.buckets (id, name, public)
values ('6homes-media', '6homes-media', true)
on conflict (id) do nothing;

drop policy if exists "public read 6homes media" on storage.objects;
create policy "public read 6homes media" on storage.objects
  for select to anon using (bucket_id = '6homes-media');

drop policy if exists "auth write 6homes media" on storage.objects;
create policy "auth write 6homes media" on storage.objects
  for all to authenticated using (bucket_id = '6homes-media') with check (bucket_id = '6homes-media');
