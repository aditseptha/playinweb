-- Daily signups, plays, and views for the admin overview trend chart (UTC, last 7 days).

create or replace function public.admin_trends_7d()
returns json
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result json;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select coalesce(json_agg(row order by row.day), '[]'::json)
  into result
  from (
    select
      d.day::date as day,
      (
        select count(*)::int
        from auth.users u
        where (u.created_at at time zone 'UTC')::date = d.day::date
      ) as new_users,
      (
        select count(*)::int
        from public.projects p
        where (p.created_at at time zone 'UTC')::date = d.day::date
      ) as new_games,
      (
        select count(*)::int
        from auth.users u
        where (u.created_at at time zone 'UTC')::date <= d.day::date
      ) as total_users,
      (
        select count(*)::int
        from public.projects p
        where (p.created_at at time zone 'UTC')::date <= d.day::date
      ) as total_games,
      (
        select coalesce(sum(psd.plays), 0)::int
        from public.project_stat_days psd
        where psd.day = d.day::date
      ) as plays,
      (
        select coalesce(sum(psd.views), 0)::int
        from public.project_stat_days psd
        where psd.day = d.day::date
      ) as views
    from generate_series(
      (timezone('utc', now())::date - interval '6 days')::date,
      timezone('utc', now())::date,
      interval '1 day'
    ) as d(day)
  ) row;

  return result;
end;
$$;

revoke all on function public.admin_trends_7d() from public;
grant execute on function public.admin_trends_7d() to authenticated;
