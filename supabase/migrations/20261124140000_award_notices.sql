-- Award popups for winners (#30, PR 3) ------------------------------------------------------------
-- The owner of a game that got an award sees a popup once, the next time they open PlayInWeb.
-- award_grants.seen_at (added in 20261124130000_awards.sql) records when that popup showed.
--
-- 1. my_awards(): the caller's standing awards they have not seen yet, newest first.
-- 2. mark_awards_seen(): sets seen_at on the caller's own awards.
--
-- A curated game belongs to the `listed` account until its creator claims it. That account never
-- gets popups, so seen_at stays empty and the creator sees the popup after the claim moves the game.
--
-- Needs 20261124130000_awards.sql. Safe to run twice.

create or replace function public.my_awards()
returns table (
  id uuid,
  award_slug text,
  award_name text,
  project_id uuid,
  title text,
  slug text,
  owner_handle text,
  citation text,
  awarded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.award_slug, t.name, p.id, p.title, p.slug, pr.handle, g.citation, g.awarded_at
  from public.award_grants g
  join public.award_types t on t.slug = g.award_slug
  join public.projects p on p.id = g.project_id
  join public.profiles pr on pr.id = p.owner_id
  where p.owner_id = (select auth.uid())
    and p.owner_id is distinct from public.curated_owner_id()
    and g.revoked_at is null
    and g.seen_at is null
  order by g.awarded_at desc
  limit 10
$$;

revoke all on function public.my_awards() from public;
grant execute on function public.my_awards() to authenticated;

create or replace function public.mark_awards_seen(p_grants uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.award_grants g
  set seen_at = now()
  from public.projects p
  where p.id = g.project_id
    and p.owner_id = (select auth.uid())
    and g.id = any (coalesce(p_grants, '{}'))
    and g.seen_at is null
$$;

revoke all on function public.mark_awards_seen(uuid[]) from public;
grant execute on function public.mark_awards_seen(uuid[]) to authenticated;
