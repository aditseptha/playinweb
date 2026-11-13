-- Let homepage hero and featured picks include curated (listed) games, not only creator uploads.

create or replace function public.admin_set_home_hero_spotlights(p_project_ids uuid[])
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
    raise exception 'at most 12 hero slides';
  end if;

  delete from public.home_hero_spotlights where true;

  foreach pid in array p_project_ids loop
    if not exists (
      select 1
      from public.projects p
      where p.id = pid
        and p.published = true
    ) then
      raise exception 'invalid or unpublished hero game %', pid;
    end if;
    ord := ord + 1;
    insert into public.home_hero_spotlights (project_id, sort_order) values (pid, ord);
  end loop;
end;
$$;

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
    ) then
      raise exception 'invalid or unpublished featured game %', pid;
    end if;
    ord := ord + 1;
    insert into public.home_featured_games (project_id, sort_order) values (pid, ord);
  end loop;
end;
$$;
