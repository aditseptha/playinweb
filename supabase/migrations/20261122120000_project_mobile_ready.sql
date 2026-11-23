-- Mobile ready and orientation (#38) ----------------------------------------------------------------
-- Phone shows only games someone has played on a real phone and passed: full touch controls, fits
-- the screen, loads fine on 4G. That check is `mobile_ready`, and only admins can set it, so the
-- Phone filter means the same thing for every game. A creator ticking it for their own game would
-- turn it back into a self-declared flag.
--
-- `orientation` is how the game wants the phone held. Creators may set it; it drives the player
-- (landscape lock on Android, the "turn your phone" prompt on iPhone, the tall stage on a computer).
-- Null means nobody has said.

alter table public.projects
  add column if not exists mobile_ready boolean not null default false;

alter table public.projects
  add column if not exists orientation text;

alter table public.projects
  drop constraint if exists projects_orientation_check;

alter table public.projects
  add constraint projects_orientation_check check (orientation is null or orientation in ('portrait', 'landscape', 'any'));

-- A signed-in player or creator who is not an admin keeps the value the row already had, on insert
-- and on update. The rest of their change still saves, so the game form never fails over this column.
-- Migrations and the SQL editor (not the anon or authenticated role) pass, so a batch of tested
-- games can be marked in a migration.
-- Not security definer: current_user has to stay the caller's role for the check to mean anything.
create or replace function private.guard_mobile_ready()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mobile_ready := false;
  else
    new.mobile_ready := old.mobile_ready;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_mobile_ready() from public;

drop trigger if exists projects_guard_mobile_ready on public.projects;
create trigger projects_guard_mobile_ready
  before insert or update of mobile_ready on public.projects
  for each row execute function private.guard_mobile_ready();
