-- Smart Society – Supabase/Postgres schema (for moving from on-device demo
-- storage to a shared cloud backend). Every table carries society_id so one
-- deployment can serve many societies. Row Level Security mirrors src/lib/rbac.js.

create type user_role as enum ('super_admin','chairman','secretary','treasurer','committee','facility_manager','security','resident');

create table societies (id uuid primary key default gen_random_uuid(), name text not null, city text, address text, reg_no text, created_at timestamptz default now());
create table towers (id uuid primary key default gen_random_uuid(), society_id uuid references societies on delete cascade, code text not null, name text, floors int);
create table apartments (id uuid primary key default gen_random_uuid(), society_id uuid references societies on delete cascade, number text not null, tower text, floor int, type text, area int, occupancy text default 'owner', unique (society_id, number));

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  society_id uuid references societies, apartment_id uuid references apartments,
  name text not null, phone text unique, email text, role user_role default 'resident', status text default 'active',
  avatar_url text, bio text, family jsonb default '[]', vehicles jsonb default '[]', emergency_contact jsonb,
  privacy jsonb default '{"showApartment":true,"showInDirectory":true}', prefs jsonb default '{}',
  family_of uuid references profiles, access text, created_at timestamptz default now()
);
create table registrations (id uuid primary key default gen_random_uuid(), society_id uuid references societies, name text, phone text, email text, apartment_id uuid references apartments, occupancy text, status text default 'pending', decided_by uuid references profiles, created_at timestamptz default now());

create table announcements (id uuid primary key default gen_random_uuid(), society_id uuid references societies, author_id uuid references profiles, title text not null, body text not null, priority text check (priority in ('urgent','important','general')), pinned bool default false, requires_ack bool default false, expires_at timestamptz, attachments jsonb default '[]', created_at timestamptz default now());
create table announcement_reads (announcement_id uuid references announcements on delete cascade, user_id uuid references profiles, acknowledged bool default false, read_at timestamptz default now(), primary key (announcement_id, user_id));

create table posts (id uuid primary key default gen_random_uuid(), society_id uuid references societies, user_id uuid references profiles, category text, text text, media jsonb default '[]', show_apartment bool default true, hidden bool default false, created_at timestamptz default now());
create table post_likes (post_id uuid references posts on delete cascade, user_id uuid references profiles, primary key (post_id, user_id));
create table post_comments (id uuid primary key default gen_random_uuid(), post_id uuid references posts on delete cascade, user_id uuid references profiles, text text not null, created_at timestamptz default now());
create table post_reports (post_id uuid references posts on delete cascade, user_id uuid references profiles, reason text, created_at timestamptz default now(), primary key (post_id, user_id));

create table billing_settings (society_id uuid primary key references societies, rate_per_sqft numeric, due_day int, late_fee_type text, late_fee numeric, items jsonb default '[]');
create table apartment_charges (id uuid primary key default gen_random_uuid(), society_id uuid references societies, apartment_id uuid references apartments, label text, amount numeric);
create table bills (id uuid primary key default gen_random_uuid(), society_id uuid references societies, apartment_id uuid references apartments, month text not null, items jsonb, adjustments jsonb default '[]', late_fee numeric default 0, amount numeric not null, due_date timestamptz, status text default 'unpaid', paid_at timestamptz, payment_id uuid, unique (apartment_id, month));
-- payments are written ONLY by the payment-gateway webhook (Edge Function) after signature verification
create table payments (id uuid primary key default gen_random_uuid(), society_id uuid references societies, apartment_id uuid references apartments, user_id uuid references profiles, bill_ids uuid[], amount numeric, method text, gateway_ref text, receipt_no text unique, status text, recorded_by uuid references profiles, created_at timestamptz default now());

create table staff (id uuid primary key default gen_random_uuid(), society_id uuid references societies, name text, role text, phone text, skills text[]);
create table complaints (id uuid primary key default gen_random_uuid(), society_id uuid references societies, ticket text unique, kind text default 'complaint', user_id uuid references profiles, apartment_id uuid references apartments, title text, description text, category text, location jsonb, priority text, contact jsonb, media jsonb default '[]', status text default 'submitted', assignee_id uuid references staff, rating int, feedback text, created_at timestamptz default now(), resolved_at timestamptz);
create table complaint_events (id uuid primary key default gen_random_uuid(), complaint_id uuid references complaints on delete cascade, kind text check (kind in ('status','comment','internal_note','assignment')), status text, text text, by uuid references profiles, created_at timestamptz default now());

create table visitors (id uuid primary key default gen_random_uuid(), society_id uuid references societies, apartment_id uuid references apartments, host_id uuid references profiles, name text, phone text, type text, company text, vehicle text, purpose text, guests int default 1, otp text, expected_at timestamptz, valid_till timestamptz, status text, guard_id uuid references profiles, entry_at timestamptz, exit_at timestamptz, photo_url text, created_at timestamptz default now());

create table facilities (id uuid primary key default gen_random_uuid(), society_id uuid references societies, name text, emoji text, capacity int, charge numeric, charge_unit text, open_hour int, close_hour int, slot_hours int, requires_approval bool, rules text[], active bool default true);
create extension if not exists btree_gist;
create table bookings (
  id uuid primary key default gen_random_uuid(), society_id uuid references societies, facility_id uuid references facilities, user_id uuid references profiles, apartment_id uuid references apartments,
  period tstzrange not null, status text default 'pending', note text, amount numeric, reason text, created_at timestamptz default now(),
  -- database-level guarantee against double bookings
  exclude using gist (facility_id with =, period with &&) where (status in ('pending','confirmed'))
);

create table listings (id uuid primary key default gen_random_uuid(), society_id uuid references societies, user_id uuid references profiles, type text, title text, description text, price numeric, price_unit text, media jsonb default '[]', status text default 'active', expires_at timestamptz, created_at timestamptz default now());
create table events (id uuid primary key default gen_random_uuid(), society_id uuid references societies, organizer_id uuid references profiles, title text, category text, emoji text, description text, starts_at timestamptz, ends_at timestamptz, venue text, capacity int, cover_url text, created_at timestamptz default now());
create table event_rsvps (event_id uuid references events on delete cascade, user_id uuid references profiles, status text, guests int default 0, reminder bool default false, primary key (event_id, user_id));
create table event_photos (id uuid primary key default gen_random_uuid(), event_id uuid references events on delete cascade, user_id uuid references profiles, url text);
create table polls (id uuid primary key default gen_random_uuid(), society_id uuid references societies, created_by uuid references profiles, question text, description text, options jsonb, multi bool, anonymous bool, eligibility text, closes_at timestamptz, created_at timestamptz default now());
create table poll_votes (poll_id uuid references polls on delete cascade, voter_key text not null, user_id uuid references profiles, option_ids text[], created_at timestamptz default now(), primary key (poll_id, voter_key));

create table notifications (id uuid primary key default gen_random_uuid(), society_id uuid references societies, user_id uuid references profiles, type text, title text, body text, link text, read bool default false, created_at timestamptz default now());
create table emergency_alerts (id uuid primary key default gen_random_uuid(), society_id uuid references societies, by uuid references profiles, title text, message text, severity text, active bool default true, created_at timestamptz default now(), resolved_at timestamptz);

-- ---------- Row Level Security (examples – extend per table) ----------
create or replace function my_role() returns user_role language sql stable as $$ select role from profiles where id = auth.uid() $$;
create or replace function my_society() returns uuid language sql stable as $$ select society_id from profiles where id = auth.uid() $$;

alter table announcements enable row level security;
create policy "members read" on announcements for select using (society_id = my_society());
create policy "committee publish" on announcements for insert with check (society_id = my_society() and my_role() in ('super_admin','chairman','secretary','committee'));

alter table bills enable row level security;
create policy "own flat or finance" on bills for select using (society_id = my_society() and (apartment_id = (select apartment_id from profiles where id = auth.uid()) or my_role() in ('super_admin','chairman','secretary','treasurer')));
create policy "finance manage" on bills for all using (society_id = my_society() and my_role() in ('super_admin','chairman','treasurer'));

alter table emergency_alerts enable row level security;
create policy "members read alerts" on emergency_alerts for select using (society_id = my_society());
create policy "admins alert" on emergency_alerts for insert with check (society_id = my_society() and my_role() in ('super_admin','chairman','secretary'));

alter table notifications enable row level security;
create policy "own notifications" on notifications for all using (user_id = auth.uid());
