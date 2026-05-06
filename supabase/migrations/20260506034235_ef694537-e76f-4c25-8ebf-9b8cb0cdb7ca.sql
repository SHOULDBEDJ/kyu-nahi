
-- =========================================================
-- ENUMS
-- =========================================================
create type public.app_role as enum ('SuperAdmin', 'Admin', 'Staff');
create type public.user_status as enum ('Active', 'Inactive', 'Suspended');
create type public.booking_status as enum ('Confirmed', 'Pending', 'Cancelled');
create type public.id_proof_type as enum ('Aadhaar', 'PAN', 'Passport', 'DL', 'VoterID');
create type public.payment_mode as enum ('UPI', 'Cash', 'Cheque', 'BankTransfer', 'Other');

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  email text,
  status user_status not null default 'Active',
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========================================================
-- USER ROLES (separate table, security definer fn)
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.has_any_admin_role(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('SuperAdmin','Admin')) $$;

create or replace function public.is_authenticated()
returns boolean language sql stable as $$ select auth.uid() is not null $$;

-- =========================================================
-- TIME SLOTS
-- =========================================================
create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  start_time time not null,
  end_time time not null,
  color text unique not null,
  is_overnight boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.time_slots enable row level security;

insert into public.time_slots(name, start_time, end_time, color, is_overnight, is_default) values
  ('Morning Slot',  '11:00', '19:00', '#4caf50', false, true),
  ('Eve-to-Eve',    '20:00', '19:00', '#ffc107', true,  false),
  ('Photoshoot',    '14:00', '18:00', '#1a237e', false, false),
  ('Eve Slot',      '20:00', '10:00', '#87ceeb', true,  false),
  ('Full Day',      '11:00', '10:00', '#ff7043', true,  false);

-- =========================================================
-- BOOKINGS
-- =========================================================
create sequence if not exists public.booking_seq start 1;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null default ('16EYE' || lpad(nextval('public.booking_seq')::text, 2, '0')),
  customer_name text not null,
  mobile text not null,
  id_proof_type id_proof_type,
  id_proof_number text,
  guests int not null default 1,
  booking_date date not null,
  slot_id uuid not null references public.time_slots(id),
  agreed_total numeric(12,2) not null default 0,
  advance_paid numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  status booking_status not null default 'Pending',
  notes text,
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create index on public.bookings(booking_date);
create index on public.bookings(status) where deleted_at is null;

-- =========================================================
-- INCOME TYPES + INCOME
-- =========================================================
create table public.income_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);
alter table public.income_types enable row level security;

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type_id uuid not null references public.income_types(id),
  amount numeric(12,2) not null,
  payment_mode payment_mode not null default 'Cash',
  reference text,
  description text,
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.incomes enable row level security;

-- =========================================================
-- EXPENSE TYPES + EXPENSES
-- =========================================================
create table public.expense_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);
alter table public.expense_types enable row level security;
insert into public.expense_types(name) values ('Maintenance'),('Utilities'),('Salary'),('Marketing'),('Other');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type_id uuid not null references public.expense_types(id),
  amount numeric(12,2) not null,
  payment_mode payment_mode not null default 'Cash',
  vendor text,
  reference text,
  description text,
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.expenses enable row level security;

-- =========================================================
-- SETTINGS (single row)
-- =========================================================
create table public.settings (
  id int primary key default 1 check (id = 1),
  farmhouse_name text not null default '16 Eyes Farm House',
  phone text,
  email text,
  address text,
  business_name text,
  business_phone text,
  business_email text,
  business_address text,
  gst_number text,
  default_slot_id uuid references public.time_slots(id),
  tax_percent numeric(5,2) default 0,
  notify_bookings boolean default true,
  notify_payments boolean default true,
  notify_daily_summary boolean default false,
  default_booking_notes text,
  logo_url text,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
insert into public.settings(id) values (1);

-- =========================================================
-- ACTIVITY LOG
-- =========================================================
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  username text,
  action text not null,
  module text not null,
  detail text,
  ip_address text,
  created_at timestamptz not null default now()
);
alter table public.activity_log enable row level security;
create index on public.activity_log(created_at desc);

-- =========================================================
-- TRIGGERS: updated_at
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
create trigger t_incomes_touch before update on public.incomes for each row execute function public.touch_updated_at();
create trigger t_expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();
create trigger t_settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- =========================================================
-- AUTO-CREATE PROFILE + ROLE ON SIGNUP
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role app_role;
  v_username text;
  v_full_name text;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', v_username);
  v_role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'Staff');

  insert into public.profiles(id, username, full_name, email)
  values (new.id, v_username, v_full_name, new.email)
  on conflict (id) do nothing;

  insert into public.user_roles(user_id, role)
  values (new.id, v_role)
  on conflict do nothing;

  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================
-- profiles: readable to all auth, self-update; admins manage all
create policy "profiles_read_auth"   on public.profiles for select to authenticated using (true);
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles_admin_all"   on public.profiles for all    to authenticated using (public.has_any_admin_role(auth.uid())) with check (public.has_any_admin_role(auth.uid()));

-- user_roles: readable by self + admins, only superadmin can write
create policy "roles_read_self_or_admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_any_admin_role(auth.uid()));
create policy "roles_superadmin_write"   on public.user_roles for all    to authenticated using (public.has_role(auth.uid(),'SuperAdmin')) with check (public.has_role(auth.uid(),'SuperAdmin'));

-- time_slots: read all auth, write admin
create policy "ts_read"  on public.time_slots for select to authenticated using (true);
create policy "ts_write" on public.time_slots for all    to authenticated using (public.has_any_admin_role(auth.uid())) with check (public.has_any_admin_role(auth.uid()));

-- bookings: all auth read+write
create policy "bk_read"  on public.bookings for select to authenticated using (true);
create policy "bk_write" on public.bookings for all    to authenticated using (true) with check (true);

-- income types/incomes: all auth read+write
create policy "it_read"  on public.income_types for select to authenticated using (true);
create policy "it_write" on public.income_types for all    to authenticated using (true) with check (true);
create policy "in_read"  on public.incomes for select to authenticated using (true);
create policy "in_write" on public.incomes for all    to authenticated using (true) with check (true);

-- expense types/expenses
create policy "et_read"  on public.expense_types for select to authenticated using (true);
create policy "et_write" on public.expense_types for all    to authenticated using (true) with check (true);
create policy "ex_read"  on public.expenses for select to authenticated using (true);
create policy "ex_write" on public.expenses for all    to authenticated using (true) with check (true);

-- settings: read all auth, write superadmin
create policy "st_read"  on public.settings for select to authenticated using (true);
create policy "st_write" on public.settings for all    to authenticated using (public.has_role(auth.uid(),'SuperAdmin')) with check (public.has_role(auth.uid(),'SuperAdmin'));

-- activity: read admin/superadmin, insert all auth
create policy "al_read_admin" on public.activity_log for select to authenticated using (public.has_any_admin_role(auth.uid()));
create policy "al_insert"     on public.activity_log for insert to authenticated with check (true);

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
insert into storage.buckets(id, name, public) values ('avatars','avatars', true) on conflict do nothing;
insert into storage.buckets(id, name, public) values ('logos','logos', true) on conflict do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_auth_write"  on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars_auth_update" on storage.objects for update to authenticated using (bucket_id = 'avatars');
create policy "avatars_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');

create policy "logos_public_read"   on storage.objects for select using (bucket_id = 'logos');
create policy "logos_admin_write"   on storage.objects for insert to authenticated with check (bucket_id = 'logos' and public.has_role(auth.uid(),'SuperAdmin'));
create policy "logos_admin_update"  on storage.objects for update to authenticated using (bucket_id = 'logos' and public.has_role(auth.uid(),'SuperAdmin'));
create policy "logos_admin_delete"  on storage.objects for delete to authenticated using (bucket_id = 'logos' and public.has_role(auth.uid(),'SuperAdmin'));
