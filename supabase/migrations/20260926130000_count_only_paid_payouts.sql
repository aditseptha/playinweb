-- Paid out totals should only include completed transfers, not pending requests.

create or replace function public.admin_list_wallets()
returns table (
  user_id uuid,
  email text,
  handle text,
  display_name text,
  wallet_address text,
  donation_count integer,
  gross_total numeric,
  commission_total numeric,
  earned_total numeric,
  paid_out numeric,
  outstanding numeric
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  return query
  with earned as (
    select
      p.owner_id as creator_id,
      count(d.id)::integer as donation_count,
      coalesce(sum(d.amount), 0)::numeric as gross_total,
      coalesce(sum(d.amount * d.commission_pct / 100), 0)::numeric as commission_total,
      coalesce(sum(d.amount * (1 - d.commission_pct / 100)), 0)::numeric as earned_total
    from public.donations d
    join public.projects p on p.id = d.project_id
    group by p.owner_id
  ),
  paid as (
    select po.user_id as creator_id, coalesce(sum(po.amount), 0)::numeric as paid_out
    from public.payouts po
    where po.status = 'paid'
    group by po.user_id
  ),
  reserved as (
    select po.user_id as creator_id, coalesce(sum(po.amount), 0)::numeric as reserved_total
    from public.payouts po
    where po.status in ('paid', 'requested')
    group by po.user_id
  )
  select
    pr.id,
    u.email::text,
    pr.handle,
    pr.display_name,
    pr.wallet_address,
    e.donation_count,
    round(e.gross_total, 2),
    round(e.commission_total, 2),
    round(e.earned_total, 2),
    round(coalesce(pa.paid_out, 0), 2),
    round(e.earned_total - coalesce(re.reserved_total, 0), 2)
  from earned e
  join public.profiles pr on pr.id = e.creator_id
  left join auth.users u on u.id = pr.id
  left join paid pa on pa.creator_id = pr.id
  left join reserved re on re.creator_id = pr.id
  order by e.earned_total desc, e.donation_count desc;
end;
$$;

revoke all on function public.admin_list_wallets() from public;
grant execute on function public.admin_list_wallets() to authenticated;
