insert into public.site_features (id, label, href, description, hidden, soon, sort_order)
values (
  'donations',
  'Donations',
  '/donations',
  'Creator wallet, game donations, and Polar checkout.',
  true,
  false,
  4
)
on conflict (id) do nothing;
