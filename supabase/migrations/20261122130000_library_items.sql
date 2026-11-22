-- The Library on the account (#38) ---------------------------------------------------------------
-- Until now the Library lived only in the browser (localStorage), so a game saved on a phone was
-- missing on the computer. Signed-in players now keep it here, one row per saved game; the browser
-- keeps its own copy for guests and for showing the Library before the account has loaded.
-- lib/library.ts decides how the two copies merge.

create table if not exists public.library_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.library_items enable row level security;

-- A Library is private: each player reads, adds to and removes from their own, and nobody else's.
drop policy if exists "library_items_select_own" on public.library_items;
create policy "library_items_select_own" on public.library_items
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "library_items_insert_own" on public.library_items;
create policy "library_items_insert_own" on public.library_items
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "library_items_delete_own" on public.library_items;
create policy "library_items_delete_own" on public.library_items
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.library_items to authenticated;
