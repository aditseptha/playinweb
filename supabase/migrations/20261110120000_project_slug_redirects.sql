-- Old game addresses keep working. When a game's slug (or owner) changes, its previous
-- /{handle}/{slug} is recorded here and the game page answers it with a 308 to the current address.
-- Rows point at the game's id, not its new slug, so a game renamed twice never chains redirects.

create table if not exists public.project_slug_redirects (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, slug)
);

create index if not exists project_slug_redirects_project_id_idx
  on public.project_slug_redirects (project_id);

alter table public.project_slug_redirects enable row level security;

-- An old address is as public as the game it points to; the game itself is still read through RLS.
drop policy if exists project_slug_redirects_select on public.project_slug_redirects;
create policy project_slug_redirects_select on public.project_slug_redirects
  for select to anon, authenticated using (true);

grant select on public.project_slug_redirects to anon, authenticated;

-- Rows are only written by this trigger, never by clients.
create or replace function private.record_slug_redirect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (old.slug is distinct from new.slug or old.owner_id is distinct from new.owner_id) then
    insert into public.project_slug_redirects (owner_id, slug, project_id)
    values (old.owner_id, old.slug, new.id)
    on conflict (owner_id, slug) do update
      set project_id = excluded.project_id, created_at = now();
  end if;
  -- A live game always wins over an old address it now occupies.
  delete from public.project_slug_redirects
  where owner_id = new.owner_id and slug = new.slug;
  return new;
end;
$$;

drop trigger if exists projects_record_slug_redirect on public.projects;
create trigger projects_record_slug_redirect
  after insert or update of slug, owner_id on public.projects
  for each row execute function private.record_slug_redirect();

-- Backfill the one rename seen in production before this table existed (sitemap still listed it).
insert into public.project_slug_redirects (owner_id, slug, project_id)
select p.owner_id, 'ayam-kabur', p.id
from public.projects p
join public.profiles pr on pr.id = p.owner_id
where pr.handle = 'kikiew'
  and p.slug = 'ayam-kabur-tangkap-ayam-yang-kabur'
  and not exists (
    select 1 from public.projects other where other.owner_id = p.owner_id and other.slug = 'ayam-kabur'
  )
on conflict (owner_id, slug) do nothing;
