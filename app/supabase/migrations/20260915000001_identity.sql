-- 20260915000001_identity.sql
create table public.profiles (
  id               uuid primary key references auth.users on delete cascade,
  display_name     text,
  target_land      text,
  exam_date        date,
  language_level   text check (language_level in ('B2','C1','C1+')),
  procedure_stage  text check (procedure_stage in
                     ('approbation_requested','gleichwertigkeit','fsp_planned','fsp_failed_once')),
  origin_specialty text,
  diploma_country  text,
  kp_intended      boolean,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function public.profile_completed(p public.profiles) returns boolean
language sql immutable as $$
  select p.target_land is not null and p.language_level is not null and p.procedure_stage is not null
$$;

-- une ligne de profil par utilisateur, créée à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
create policy "profiles: own read"   on public.profiles for select using (id = auth.uid());
create policy "profiles: own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- pas d'insert/delete client : le trigger et la cascade s'en chargent
