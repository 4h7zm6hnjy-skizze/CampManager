-- Die Hentschel's CampManager – Datenbankeinrichtung
-- In Supabase: SQL Editor -> New query -> komplett ausführen.

create extension if not exists pgcrypto;

create table if not exists public.camp_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists camp_records_user_type_idx
  on public.camp_records(user_id, type);

alter table public.camp_records enable row level security;

drop policy if exists "camp_records_select_own" on public.camp_records;
create policy "camp_records_select_own"
  on public.camp_records for select
  using (auth.uid() = user_id);

drop policy if exists "camp_records_insert_own" on public.camp_records;
create policy "camp_records_insert_own"
  on public.camp_records for insert
  with check (auth.uid() = user_id);

drop policy if exists "camp_records_update_own" on public.camp_records;
create policy "camp_records_update_own"
  on public.camp_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "camp_records_delete_own" on public.camp_records;
create policy "camp_records_delete_own"
  on public.camp_records for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists camp_records_set_updated_at on public.camp_records;
create trigger camp_records_set_updated_at
before update on public.camp_records
for each row execute procedure public.set_updated_at();

-- Privater Dokumentenspeicher für Verträge und Gasprüfungen.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_select_own" on storage.objects;
create policy "documents_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_update_own" on storage.objects;
create policy "documents_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
