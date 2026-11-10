-- Homepage "Featured games" row: admins pick published creator games (not curated listings).

create table if not exists public.home_featured_games (
  project_id uuid primary key references public.projects (id) on delete cascade,
  sort_order int not null default 0
);

create index if not exists home_featured_games_sort on public.home_featured_games (sort_order);

alter table public.home_featured_games enable row level security;

drop policy if exists home_featured_games_select on public.home_featured_games;
create policy home_featured_games_select on public.home_featured_games
  for select to anon, authenticated using (true);

drop policy if exists home_featured_games_admin on public.home_featured_games;
create policy home_featured_games_admin on public.home_featured_games
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.home_featured_games to anon, authenticated;
grant insert, update, delete on public.home_featured_games to authenticated;

create or replace function public.admin_set_home_featured_games(p_project_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  ord int := 0;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  if p_project_ids is null then
    p_project_ids := '{}';
  end if;

  if coalesce(array_length(p_project_ids, 1), 0) > 12 then
    raise exception 'at most 12 featured games';
  end if;

  delete from public.home_featured_games where true;

  foreach pid in array p_project_ids loop
    if not exists (
      select 1
      from public.projects p
      where p.id = pid
        and p.published = true
        and not exists (
          select 1
          from public.project_curation c
          where c.project_id = p.id and c.status in ('listed', 'claim_pending')
        )
    ) then
      raise exception 'invalid or unpublished featured game %', pid;
    end if;
    ord := ord + 1;
    insert into public.home_featured_games (project_id, sort_order) values (pid, ord);
  end loop;
end;
$$;

revoke all on function public.admin_set_home_featured_games(uuid[]) from public;
grant execute on function public.admin_set_home_featured_games(uuid[]) to authenticated;
