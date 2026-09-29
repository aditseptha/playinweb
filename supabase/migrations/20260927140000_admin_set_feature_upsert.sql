create or replace function public.admin_set_feature(
  fid text,
  hide boolean,
  is_soon boolean,
  flabel text default null,
  fhref text default null,
  fdescription text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  insert into public.site_features (id, label, href, description, hidden, soon, sort_order)
  values (
    fid,
    coalesce(flabel, fid),
    coalesce(fhref, '/'),
    coalesce(fdescription, ''),
    hide,
    is_soon,
    99
  )
  on conflict (id) do update
  set
    hidden = excluded.hidden,
    soon = excluded.soon,
    label = excluded.label,
    href = excluded.href,
    description = excluded.description;
end;
$$;
