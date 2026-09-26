create schema if not exists private;

create or replace function private.run_weekly_cashouts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_count integer := 0;
  rec record;
  earned numeric;
  cashed numeric;
  available numeric;
  payout_dow numeric;
  payout_hour numeric;
  payout_frequency numeric;
  min_balance numeric;
begin
  select coalesce((select value from public.site_settings where id = 'payout_weekday'), 4) into payout_dow;
  select coalesce((select value from public.site_settings where id = 'payout_hour_utc'), 17) into payout_hour;
  select coalesce((select value from public.site_settings where id = 'payout_frequency'), 0) into payout_frequency;

  if payout_frequency = 0
     and extract(dow from timezone('utc', now()))::int <> payout_dow::int then
    return 0;
  end if;

  if extract(hour from timezone('utc', now()))::int <> payout_hour::int then
    return 0;
  end if;

  select coalesce((select value from public.site_settings where id = 'cashout_min'), 10) into min_balance;

  for rec in
    select p.id, p.handle, p.wallet_address
    from public.profiles p
    where p.wallet_address is not null
      and btrim(p.wallet_address) <> ''
  loop
    select coalesce(sum(d.amount * (1 - d.commission_pct / 100)), 0) into earned
    from public.donations d
    join public.projects pr on pr.id = d.project_id
    where pr.owner_id = rec.id;

    select coalesce(sum(amount), 0) into cashed
    from public.payouts
    where user_id = rec.id
      and status <> 'cancelled';

    available := round((earned - cashed)::numeric, 2);

    if available >= min_balance then
      begin
        insert into public.payouts (user_id, amount, status, creator_email, creator_handle)
        values (rec.id, available, 'paid', rec.wallet_address, rec.handle);
        paid_count := paid_count + 1;
      exception
        when others then
          null;
      end;
    end if;
  end loop;

  return paid_count;
end;
$$;

revoke all on function private.run_weekly_cashouts() from public;
revoke all on function private.run_weekly_cashouts() from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'weekly-cashout';

select cron.schedule(
  'weekly-cashout',
  '0 * * * *',
  $$select private.run_weekly_cashouts()$$
);
