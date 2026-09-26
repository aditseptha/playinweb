create schema if not exists private;

create table if not exists private.admins (
  email text primary key
);

insert into private.admins (email) values ('aditseptha@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select exists (
    select 1
    from private.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = (select auth.uid())
  );
$$;

grant execute on function public.is_admin() to authenticated;

create table if not exists public.site_settings (
  id text primary key,
  value numeric not null
);

insert into public.site_settings (id, value) values
  ('donation_commission_pct', 10),
  ('payout_frequency', 0),
  ('payout_weekday', 4),
  ('payout_hour_utc', 17),
  ('cashout_min', 10)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

do $$
begin
  create policy site_settings_select on public.site_settings
    for select to anon, authenticated
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy site_settings_update_admin on public.site_settings
    for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy site_settings_insert_admin on public.site_settings
    for insert to authenticated
    with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

create or replace function public.admin_upsert_site_settings(settings jsonb)
returns void
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  entry record;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  for entry in select key, value from jsonb_each(settings)
  loop
    insert into public.site_settings (id, value)
    values (entry.key, (entry.value #>> '{}')::numeric)
    on conflict (id) do update set value = excluded.value;
  end loop;
end;
$$;

revoke all on function public.admin_upsert_site_settings(jsonb) from public;
grant execute on function public.admin_upsert_site_settings(jsonb) to authenticated;
