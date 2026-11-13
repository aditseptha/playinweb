-- Badge celebrations (#30) --------------------------------------------------------------------
-- The app shows a popup when a badge is unlocked or levels up. seen_level is the highest level
-- the owner has already been shown, so each level is celebrated once, on whichever device the
-- owner opens next.
--
-- Badges that existed before this migration start at seen_level 0. Their owners get one summary
-- popup ("You already have 4 badges") the next time they open PlayInWeb.

alter table public.profile_badges
  add column if not exists seen_level smallint not null default 0;

-- The signed-in account's badges, with what it has already seen. Revoked badges are left out.
create or replace function public.my_badges()
returns table (badge text, level smallint, seen_level smallint, leveled_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.badge, b.level, b.seen_level, b.leveled_at
  from public.profile_badges b
  where b.profile_id = (select auth.uid()) and b.revoked_at is null
  order by b.leveled_at, b.badge
$$;

revoke all on function public.my_badges() from public;
grant execute on function public.my_badges() to authenticated;

-- Marks the given badges as seen at their current level, for the signed-in account only.
create or replace function public.mark_badges_seen(p_badges text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in to mark badges seen';
  end if;
  update public.profile_badges
  set seen_level = level
  where profile_id = uid and badge = any(p_badges) and seen_level < level;
end;
$$;

revoke all on function public.mark_badges_seen(text[]) from public;
grant execute on function public.mark_badges_seen(text[]) to authenticated;
