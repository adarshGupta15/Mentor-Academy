-- Phase 3: Admin management and fee-management foundation
-- Run after 202609090001_phase2_identity.sql.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('7','8','9','10','11','12')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.class_subjects (
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (class_id, subject_id)
);
create table public.batches (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id),
  name text not null, timing text, days text, room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (class_id, name)
);
alter table public.students add constraint students_class_id_fkey foreign key (class_id) references public.classes(id) on delete set null;
alter table public.students add constraint students_batch_id_fkey foreign key (batch_id) references public.batches(id) on delete set null;
alter table public.profiles add column is_active boolean not null default true;

create type public.fee_frequency as enum ('MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY','CUSTOM');
create type public.fee_assignment_status as enum ('PENDING','PARTIAL','PAID','OVERDUE','CANCELLED');
create type public.fee_payment_method as enum ('CASH','UPI','CARD','BANK_TRANSFER','ONLINE');
create type public.fee_payment_status as enum ('PENDING','SUCCESS','FAILED','REFUNDED');
create table public.fee_structures (
  id uuid primary key default gen_random_uuid(), name text not null,
  class_id uuid references public.classes(id) on delete set null,
  amount bigint not null check (amount >= 0), frequency public.fee_frequency not null,
  description text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.student_fee_assignments (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete restrict,
  fee_structure_id uuid references public.fee_structures(id) on delete set null,
  amount bigint not null check (amount >= 0), due_date date, status public.fee_assignment_status not null default 'PENDING',
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.fee_payments (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete restrict,
  fee_assignment_id uuid not null references public.student_fee_assignments(id) on delete restrict,
  amount bigint not null check (amount > 0), payment_method public.fee_payment_method not null,
  payment_status public.fee_payment_status not null default 'PENDING', transaction_reference text,
  payment_gateway text, paid_at timestamptz, receipt_number text unique, notes text,
  created_at timestamptz not null default now(),
  check (payment_gateway is null or char_length(payment_gateway) <= 80)
);
create index batches_class_idx on public.batches(class_id);
create index students_class_batch_idx on public.students(class_id, batch_id);
create index fee_assignments_student_idx on public.student_fee_assignments(student_id);
create index fee_assignments_status_idx on public.student_fee_assignments(status);
create index fee_payments_assignment_idx on public.fee_payments(fee_assignment_id);
create index fee_payments_student_idx on public.fee_payments(student_id);

create type public.notice_audience as enum ('ALL','STUDENTS','TEACHERS','PARENTS');
create table public.notices (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null,
  audience public.notice_audience not null default 'ALL', is_published boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.academy_settings (
  id boolean primary key default true check (id), academy_name text not null default 'Mentor Academy',
  address text, phone text, email text, website text, logo_url text,
  updated_at timestamptz not null default now()
);

-- Security-definer helpers avoid RLS recursion and derive all privileges from auth.uid().
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'ADMIN' and is_active = true);
$$;
create or replace function public.current_student_id() returns uuid language sql stable security definer set search_path = public as $$
  select s.id from public.students s join public.profiles p on p.id = s.profile_id where p.user_id = auth.uid() and p.is_active = true;
$$;

alter table public.classes enable row level security; alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security; alter table public.batches enable row level security;
alter table public.fee_structures enable row level security; alter table public.student_fee_assignments enable row level security;
alter table public.fee_payments enable row level security; alter table public.notices enable row level security;
alter table public.academy_settings enable row level security;

-- Admin-only management policies.
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage students" on public.students for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage teachers" on public.teachers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage classes" on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage subjects" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage class subjects" on public.class_subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage batches" on public.batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage fee structures" on public.fee_structures for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage fee assignments" on public.student_fee_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage fee payments" on public.fee_payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage notices" on public.notices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage settings" on public.academy_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Students can only view financial records tied to their authenticated identity.
create policy "students view own fee assignments" on public.student_fee_assignments for select to authenticated using (student_id = public.current_student_id());
create policy "students view own payments" on public.fee_payments for select to authenticated using (student_id = public.current_student_id());
