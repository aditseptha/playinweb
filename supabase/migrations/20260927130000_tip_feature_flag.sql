insert into public.site_features (id, label, href, description, hidden, soon, sort_order)
values (
  'tip',
  'Tip the developer',
  '/tip',
  'Support link in the sidebar footer.',
  false,
  false,
  5
)
on conflict (id) do nothing;
