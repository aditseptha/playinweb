begin;

delete from public.donations
where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  )
  or project_id in (
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  )
  or donor_email like '%-dummy@example.com'
  or donor_handle in ('pixelbarn', 'mayaok', 'riocode')
  or creator_handle in ('pixelbarn', 'mayaok', 'riocode')
returning 'donation' as kind, id, amount, created_at;

delete from public.payouts
where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  )
  or (
    amount in (12, 8.5)
    and created_at < '2026-09-18T00:00:00+07:00'
  )
returning 'payout' as kind, id, amount, created_at;

commit;
