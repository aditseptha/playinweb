-- Reserve the handles of the devlog page (#40) --------------------------------------------------
-- Creator pages live at playinweb.com/{handle}, so a creator called "devlog" would take over
-- playinweb.com/devlog. lib/host.ts reserves the same names for routing.
--
-- A separate constraint, so the existing profiles_handle_reserved list is left untouched.
-- If an account already uses one of these handles, this stops with a clear message instead.

do $$
begin
  if exists (select 1 from public.profiles where handle in ('devlog', 'devlogs')) then
    raise exception 'An account already uses the handle devlog or devlogs. Rename it before reserving the devlog page.';
  end if;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_handle_reserved_pages;

alter table public.profiles
  add constraint profiles_handle_reserved_pages check (handle not in ('devlog', 'devlogs'));
