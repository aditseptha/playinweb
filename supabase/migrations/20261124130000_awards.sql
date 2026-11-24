-- Awards (#30, PR 1) ------------------------------------------------------------------------------
-- Best of PlayInWeb: the PlayInWeb team's mark for the games we love most. Editorial, given any time,
-- once per game. Curated games can get it too; their creator sees it once they claim the game.
--
-- 1. award_types: what an award is (name, the "What it is" and "How it is chosen" text, its medal).
--    Seeded with best-of-playinweb. Room for more kinds later; nothing else reads a fixed slug.
-- 2. award_grants: one row per game that got an award. Revoking keeps the row, with who and why.
-- 3. admin_grant_award() and admin_revoke_award(): the only way to write either table.
--
-- Safe to run twice.

-- 1. Kinds of award -------------------------------------------------------------------------------

create table if not exists public.award_types (
  slug text primary key,
  name text not null,
  description text not null,
  how_chosen text not null,
  -- How the medal looks, for the 3D engine: shape, metal, enamel, ribbon, and the lettering.
  medal jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint award_types_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'),
  constraint award_types_name_len check (char_length(name) between 1 and 60)
);

alter table public.award_types enable row level security;

drop policy if exists award_types_select on public.award_types;
create policy award_types_select on public.award_types
  for select to anon, authenticated using (true);

grant select on public.award_types to anon, authenticated;

insert into public.award_types (slug, name, description, how_chosen, medal)
values (
  'best-of-playinweb',
  'Best of PlayInWeb',
  'The PlayInWeb team’s mark for the games we love most. A game can only get it once.',
  'The PlayInWeb team plays what is published here and picks the standouts. There is nothing to enter: every published game is considered.',
  '{"shape": "sun", "metal": "gold", "enamel": "#0a84ff", "ribbon": "brand", "top": "Best of", "bottom": "PlayInWeb"}'::jsonb
)
on conflict (slug) do nothing;

-- 2. Awards given ---------------------------------------------------------------------------------

create table if not exists public.award_grants (
  id uuid primary key default gen_random_uuid(),
  award_slug text not null references public.award_types (slug) on update cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  -- "Why this game", shown with the medal on the game page.
  citation text not null,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  revoke_reason text,
  -- When the game's owner saw the award popup (#30, PR 3). Null until then.
  seen_at timestamptz,
  constraint award_grants_citation_len check (char_length(citation) between 10 and 400),
  constraint award_grants_reason_len check (revoke_reason is null or char_length(revoke_reason) between 3 and 400),
  constraint award_grants_revoked_together check ((revoked_at is null) = (revoke_reason is null))
);

create index if not exists award_grants_project_idx on public.award_grants (project_id);
create index if not exists award_grants_awarded_idx on public.award_grants (awarded_at desc) where revoked_at is null;
-- A game holds each kind of award once. A revoked award can be given again later.
create unique index if not exists award_grants_one_per_game
  on public.award_grants (award_slug, project_id) where revoked_at is null;

alter table public.award_grants enable row level security;

-- Everyone sees awards that stand; admins also see revoked ones.
drop policy if exists award_grants_select on public.award_grants;
create policy award_grants_select on public.award_grants
  for select to anon, authenticated
  using (revoked_at is null or public.is_admin());

grant select on public.award_grants to anon, authenticated;
-- No insert, update or delete grants: every write goes through the functions below.

-- 3. Giving and revoking --------------------------------------------------------------------------

create or replace function public.admin_grant_award(p_project uuid, p_award text, p_citation text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  why text := trim(coalesce(p_citation, ''));
  grant_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.award_types where slug = p_award and active) then
    raise exception 'unknown award';
  end if;
  if not exists (select 1 from public.projects where id = p_project and published) then
    raise exception 'only published games can get an award';
  end if;
  if char_length(why) < 10 or char_length(why) > 400 then
    raise exception 'write why this game, in 10 to 400 characters';
  end if;
  if exists (
    select 1 from public.award_grants where award_slug = p_award and project_id = p_project and revoked_at is null
  ) then
    raise exception 'this game already has this award';
  end if;

  insert into public.award_grants (award_slug, project_id, citation, awarded_by)
  values (p_award, p_project, why, (select auth.uid()))
  returning id into grant_id;
  return grant_id;
end;
$$;

revoke all on function public.admin_grant_award(uuid, text, text) from public;
grant execute on function public.admin_grant_award(uuid, text, text) to authenticated;

create or replace function public.admin_revoke_award(p_grant uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  why text := trim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  if char_length(why) < 3 or char_length(why) > 400 then
    raise exception 'say why the award is taken back';
  end if;
  update public.award_grants
  set revoked_at = now(), revoked_by = (select auth.uid()), revoke_reason = why
  where id = p_grant and revoked_at is null;
  if not found then
    raise exception 'award not found or already revoked';
  end if;
end;
$$;

revoke all on function public.admin_revoke_award(uuid, text) from public;
grant execute on function public.admin_revoke_award(uuid, text) to authenticated;
