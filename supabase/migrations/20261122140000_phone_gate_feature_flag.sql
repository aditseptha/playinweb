-- Desktop games on phones (#38) ------------------------------------------------------------------
-- When on, a phone that taps Play on a game nobody has passed on a real phone (projects.mobile_ready)
-- gets "Best played on a computer", with Save to Library and a small "Play here anyway".
--
-- Off until enough games are mobile ready: switched on with only a handful marked, nearly every game
-- on a phone would send the player away. "Hidden" is off for this flag means the gate is on; turn it
-- on from the admin panel's feature list. The href is not a menu link, so no menu item follows it.

insert into public.site_features (id, label, href, description, hidden, soon, sort_order)
values (
  'phone-gate',
  'Desktop games on phones',
  '/admin#phone-gate',
  'Phones see "Best played on a computer" for games not marked Mobile ready. Visible = on.',
  true,
  false,
  6
)
on conflict (id) do nothing;
