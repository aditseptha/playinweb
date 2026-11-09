-- Curated games (#9): games by other creators that PlayInWeb lists with credit, under an open
-- license or with the creator's permission, until the creator claims them.
--
-- 1. A system account with the handle `listed` owns every unclaimed curated game, so the game keeps
--    a normal /{handle}/{slug} address. It cannot sign in: no password, an unreachable email, and a
--    permanent ban.
-- 2. project_curation holds the credit: original creator, license, source, and claim status.
-- 3. Admins may create and edit games owned by `listed` (and their media), through the same tables
--    and storage folders creators use. They get no extra rights over anyone else's games.

-- 1. System account ---------------------------------------------------------------------------

do $$
declare
  listed_id constant uuid := '00000000-0000-4000-8000-00000000c0de';
begin
  if exists (select 1 from public.profiles where handle = 'listed' and id <> listed_id) then
    raise exception 'The handle "listed" already belongs to a real account. Pick another system handle before running this migration.';
  end if;

  if not exists (select 1 from auth.users where id = listed_id) then
    -- private.handle_new_user() creates the profile from raw_user_meta_data.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, banned_until,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      coalesce((select instance_id from auth.users limit 1), '00000000-0000-0000-0000-000000000000'),
      listed_id, 'authenticated', 'authenticated', 'listed@playinweb.invalid', '',
      '{"provider": "email", "providers": ["email"]}',
      '{"handle": "listed", "display_name": "Curated by PlayInWeb"}',
      now(), now(), 'infinity',
      '', '', '', ''
    );
  end if;

  update public.profiles
  set display_name = 'Curated by PlayInWeb',
      bio = 'Games by other creators, listed with credit until they claim them.'
  where id = listed_id;
end;
$$;

-- The owner of unclaimed curated games. Public on purpose: it is a profile id like any other.
create or replace function public.curated_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where handle = 'listed';
$$;

-- True when the signed-in user is an admin and the row belongs to the `listed` account.
create or replace function public.can_manage_curated(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select owner is not null and owner = public.curated_owner_id() and public.is_admin();
$$;

revoke all on function public.curated_owner_id() from public;
revoke all on function public.can_manage_curated(uuid) from public;
grant execute on function public.curated_owner_id() to anon, authenticated;
grant execute on function public.can_manage_curated(uuid) to anon, authenticated;

-- 2. Credit and status -------------------------------------------------------------------------

create table if not exists public.project_curation (
  project_id uuid primary key references public.projects (id) on delete cascade,
  status text not null default 'listed',
  play_mode text not null default 'hosted',
  creator_name text not null,
  creator_url text,
  source_url text,
  source_code_url text,
  license text not null,
  license_url text,
  modified boolean not null default false,
  listed_by uuid references public.profiles (id) on delete set null,
  listed_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint project_curation_status_check check (status in ('listed', 'claim_pending', 'claimed')),
  constraint project_curation_play_mode_check check (play_mode in ('hosted', 'link_out')),
  constraint project_curation_creator_name_len check (char_length(creator_name) between 1 and 120),
  constraint project_curation_license_len check (char_length(license) between 1 and 40),
  constraint project_curation_urls check (
    (creator_url is null or creator_url ~ '^https?://')
    and (source_url is null or source_url ~ '^https?://')
    and (source_code_url is null or source_code_url ~ '^https?://')
    and (license_url is null or license_url ~ '^https?://')
  )
);

alter table public.project_curation enable row level security;

drop policy if exists project_curation_select on public.project_curation;
create policy project_curation_select on public.project_curation
  for select to anon, authenticated using (true);

drop policy if exists project_curation_insert on public.project_curation;
create policy project_curation_insert on public.project_curation
  for insert to authenticated
  with check (
    exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id))
  );

drop policy if exists project_curation_update on public.project_curation;
create policy project_curation_update on public.project_curation
  for update to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id))
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id))
  );

drop policy if exists project_curation_delete on public.project_curation;
create policy project_curation_delete on public.project_curation
  for delete to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id))
  );

grant select on public.project_curation to anon, authenticated;
grant insert, update, delete on public.project_curation to authenticated;

-- 3. Admins manage games owned by `listed` -----------------------------------------------------
-- These sit next to the owner policies; Postgres allows a row when any policy allows it.

drop policy if exists projects_select_curated on public.projects;
create policy projects_select_curated on public.projects
  for select to authenticated using (public.can_manage_curated(owner_id));

drop policy if exists projects_insert_curated on public.projects;
create policy projects_insert_curated on public.projects
  for insert to authenticated with check (public.can_manage_curated(owner_id));

drop policy if exists projects_update_curated on public.projects;
create policy projects_update_curated on public.projects
  for update to authenticated
  using (public.can_manage_curated(owner_id))
  with check (public.can_manage_curated(owner_id));

drop policy if exists projects_delete_curated on public.projects;
create policy projects_delete_curated on public.projects
  for delete to authenticated using (public.can_manage_curated(owner_id));

do $$
declare
  t text;
begin
  foreach t in array array['project_tags', 'project_screenshots', 'project_files', 'project_store_links'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_curated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id)))',
      t || '_select_curated', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_insert_curated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id)))',
      t || '_insert_curated', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_delete_curated', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.projects p where p.id = project_id and public.can_manage_curated(p.owner_id)))',
      t || '_delete_curated', t
    );
  end loop;
end;
$$;

-- Media for curated games lives in the `listed` account's folder, like any creator's media.
drop policy if exists project_media_curated_insert on storage.objects;
create policy project_media_curated_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and public.is_admin()
    and (storage.foldername(name))[1] = public.curated_owner_id()::text
  );

drop policy if exists project_media_curated_update on storage.objects;
create policy project_media_curated_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-media'
    and public.is_admin()
    and (storage.foldername(name))[1] = public.curated_owner_id()::text
  )
  with check (
    bucket_id = 'project-media'
    and public.is_admin()
    and (storage.foldername(name))[1] = public.curated_owner_id()::text
  );

drop policy if exists project_media_curated_delete on storage.objects;
create policy project_media_curated_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-media'
    and public.is_admin()
    and (storage.foldername(name))[1] = public.curated_owner_id()::text
  );
