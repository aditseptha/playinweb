-- Use configured minimum in balance checks and let admins record PayPal payouts.

create or replace function private.payout_within_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  earned numeric;
  cashed numeric;
  min_balance numeric;
begin
  select coalesce((select value from public.site_settings where id = 'cashout_min'), 10) into min_balance;

  if new.amount < min_balance then
    raise exception 'amount below cash out minimum';
  end if;

  select coalesce(sum(d.amount * (1 - d.commission_pct / 100)), 0) into earned
  from public.donations d
  join public.projects p on p.id = d.project_id
  where p.owner_id = new.user_id;

  select coalesce(sum(amount), 0) into cashed
  from public.payouts
  where user_id = new.user_id
    and id is distinct from new.id
    and status in ('paid', 'requested');

  if new.amount > earned - cashed + 0.001 then
    raise exception 'amount exceeds available balance';
  end if;
  return new;
end;
$$;

create or replace function public.admin_record_payout(
  p_user_id uuid,
  p_amount numeric,
  p_status text,
  p_creator_email text,
  p_creator_handle text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payout_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  if p_status not in ('requested', 'paid', 'cancelled') then
    raise exception 'invalid payout status';
  end if;

  insert into public.payouts (user_id, amount, status, creator_email, creator_handle)
  values (p_user_id, p_amount, p_status, p_creator_email, p_creator_handle)
  returning id into payout_id;

  return payout_id;
end;
$$;

revoke all on function public.admin_record_payout(uuid, numeric, text, text, text) from public;
grant execute on function public.admin_record_payout(uuid, numeric, text, text, text) to authenticated;
