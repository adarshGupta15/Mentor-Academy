-- Mentor Academy Phase 2: identity and role foundation
create type public.user_role as enum ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.user_role not null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null unique,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  student_id text not null unique check (student_id ~ '^[A-Za-z0-9-]{3,40}$'),
  class_id uuid,
  batch_id uuid,
  roll_number text,
  parent_id uuid references public.parents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, batch_id, roll_number)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  teacher_id text not null unique check (teacher_id ~ '^[A-Za-z0-9-]{3,40}$'),
  qualification text,
  experience integer check (experience >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.parents enable row level security;

-- Users can read only their own identity data. Admin policies will be added with the admin schema in Phase 3.
create policy "users read own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "students read own record" on public.students for select to authenticated using (profile_id in (select id from public.profiles where user_id = auth.uid()));
create policy "teachers read own record" on public.teachers for select to authenticated using (profile_id in (select id from public.profiles where user_id = auth.uid()));
create policy "parents read own record" on public.parents for select to authenticated using (profile_id in (select id from public.profiles where user_id = auth.uid()));

-- Do not add client-side insert/update policies. Create accounts and records through a controlled admin workflow.
