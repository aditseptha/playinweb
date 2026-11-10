-- Homepage "hottest this week" rolls up public play counts from the last 7 days.
create policy project_stat_days_published_select on public.project_stat_days
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.published = true
    )
  );

grant select on public.project_stat_days to anon;
