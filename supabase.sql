-- CampManager v21 – Supabase Einrichtung
-- Einmal vollständig im Supabase SQL Editor ausführen.

create table if not exists public.camp_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.camp_states enable row level security;

drop policy if exists "camp_select_own" on public.camp_states;
create policy "camp_select_own" on public.camp_states for select
using (auth.uid() = user_id);

drop policy if exists "camp_insert_own" on public.camp_states;
create policy "camp_insert_own" on public.camp_states for insert
with check (auth.uid() = user_id);

drop policy if exists "camp_update_own" on public.camp_states;
create policy "camp_update_own" on public.camp_states for update
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "camp_delete_own" on public.camp_states;
create policy "camp_delete_own" on public.camp_states for delete
using (auth.uid() = user_id);

-- Tägliche Sicherungsstände
create table if not exists public.camp_backups (
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_date date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, backup_date)
);

alter table public.camp_backups enable row level security;

drop policy if exists "backup_select_own" on public.camp_backups;
create policy "backup_select_own" on public.camp_backups for select
using (auth.uid() = user_id);

drop policy if exists "backup_insert_own" on public.camp_backups;
create policy "backup_insert_own" on public.camp_backups for insert
with check (auth.uid() = user_id);

drop policy if exists "backup_update_own" on public.camp_backups;
create policy "backup_update_own" on public.camp_backups for update
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "backup_delete_own" on public.camp_backups;
create policy "backup_delete_own" on public.camp_backups for delete
using (auth.uid() = user_id);

-- Privater Dokumentenspeicher
insert into storage.buckets (id, name, public)
values ('campmanager-documents', 'campmanager-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "camp_docs_select_own" on storage.objects;
create policy "camp_docs_select_own" on storage.objects for select
using (
  bucket_id = 'campmanager-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "camp_docs_insert_own" on storage.objects;
create policy "camp_docs_insert_own" on storage.objects for insert
with check (
  bucket_id = 'campmanager-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "camp_docs_update_own" on storage.objects;
create policy "camp_docs_update_own" on storage.objects for update
using (
  bucket_id = 'campmanager-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'campmanager-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "camp_docs_delete_own" on storage.objects;
create policy "camp_docs_delete_own" on storage.objects for delete
using (
  bucket_id = 'campmanager-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
