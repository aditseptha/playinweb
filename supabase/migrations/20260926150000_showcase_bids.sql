create table public.showcase_bids (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  bidder_email text,
  bidder_handle text,
  game_title text,
  game_slug text,
  created_at timestamptz not null default now()
);

create index showcase_bids_project_created_at_idx on public.showcase_bids (project_id, created_at desc);
create index showcase_bids_project_amount_idx on public.showcase_bids (project_id, amount desc);

alter table public.showcase_bids enable row level security;

create policy showcase_bids_select on public.showcase_bids
  for select to anon, authenticated
  using (true);

create policy showcase_bids_insert on public.showcase_bids
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy showcase_bids_select_admin on public.showcase_bids
  for select to authenticated
  using (public.is_admin());

grant insert, select on public.showcase_bids to authenticated;
grant select on public.showcase_bids to anon;
