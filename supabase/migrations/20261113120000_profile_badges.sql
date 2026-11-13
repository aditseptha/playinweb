-- Profile badges (#30) ------------------------------------------------------------------------
-- Steam-style badges on every profile. Players and creators share one profile, so both earn them.
--
-- 1. profile_plays records which games an account played inside PlayInWeb. It feeds Explorer
--    (games played) and Crowd Pleaser (unique players), and the "Recently played" list on a
--    profile without games. It is separate from projects.play_count, which stays as it is.
-- 2. profile_badges stores the level each profile has earned. A level never goes down on its
--    own: unliking or deleting a comment lowers the live progress, not the badge. Only an admin
--    can take a badge away, by setting revoked_at.
-- 3. Triggers on the source tables call private.sync_badges(), so badges arrive without a cron.
-- 4. profile_badge_board() returns each badge with its level and live progress for the profile page.
--
-- The thresholds in private.badge_thresholds() must match lib/badges.ts. lib/badges.test.mjs
-- reads this file and fails when they drift apart.

-- 1. Plays per account ------------------------------------------------------------------------

create table if not exists public.profile_plays (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  first_played_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  primary key (profile_id, project_id)
);

create index if not exists profile_plays_project_id_idx on public.profile_plays (project_id);
create index if not exists profile_plays_recent_idx on public.profile_plays (profile_id, last_played_at desc);

alter table public.profile_plays enable row level security;

-- Public on purpose: a profile shows what its owner played recently.
drop policy if exists profile_plays_select on public.profile_plays;
create policy profile_plays_select on public.profile_plays
  for select to anon, authenticated using (true);

grant select on public.profile_plays to anon, authenticated;
-- No insert grant. Accounts record plays through record_play(), which checks the game.

-- The game page calls this after a signed-in player has played for about a minute.
create or replace function public.record_play(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in to record a play';
  end if;
  if not exists (select 1 from public.profiles where id = uid) then
    return;
  end if;
  if not exists (select 1 from public.projects where id = pid and published) then
    return;
  end if;
  insert into public.profile_plays (profile_id, project_id)
  values (uid, pid)
  on conflict (profile_id, project_id) do update set last_played_at = now();
end;
$$;

revoke all on function public.record_play(uuid) from public;
grant execute on function public.record_play(uuid) to authenticated;

-- 2. Earned badges ----------------------------------------------------------------------------

create table if not exists public.profile_badges (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null,
  level smallint not null,
  earned_at timestamptz not null default now(),
  leveled_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (profile_id, badge),
  constraint profile_badges_badge_check check (badge in (
    'explorer', 'talk', 'fan', 'supporter',
    'firstgame', 'following', 'wellliked', 'crowd', 'complete',
    'earlybird', 'claimed'
  )),
  constraint profile_badges_level_check check (level between 1 and 3)
);

alter table public.profile_badges enable row level security;

drop policy if exists profile_badges_select on public.profile_badges;
create policy profile_badges_select on public.profile_badges
  for select to anon, authenticated using (revoked_at is null);

grant select on public.profile_badges to anon, authenticated;
-- No insert, update or delete grants: only private.sync_badges() writes here.

-- Indexes for the per-account counts below.
create index if not exists project_comments_author_project_idx on public.project_comments (author_id, project_id);
create index if not exists project_likes_user_id_idx on public.project_likes (user_id);

-- 3. Thresholds, metrics and syncing -----------------------------------------------------------

-- Level n needs a value of at least levels[n]. Single-level badges have one threshold.
create or replace function private.badge_thresholds()
returns table (badge text, levels integer[])
language sql
immutable
as $$
  values
    ('explorer', array[3, 25, 100]),
    ('talk', array[5, 50, 250]),
    ('fan', array[10, 100, 500]),
    ('supporter', array[1, 5, 20]),
    ('firstgame', array[1, 3, 10]),
    ('following', array[10, 100, 1000]),
    ('wellliked', array[10, 100, 1000]),
    ('crowd', array[100, 1000, 10000]),
    ('complete', array[1]),
    ('earlybird', array[1]),
    ('claimed', array[1])
$$;

-- The live value behind each badge. `p_only` limits the work to the badges a trigger can change.
-- Playing, liking or commenting on your own game never counts.
create or replace function private.badge_metrics(pid uuid, p_only text[] default null)
returns table (badge text, value integer)
language sql
stable
security definer
set search_path = public
as $$
  select 'explorer', count(*)::int
    from public.profile_plays pp join public.projects p on p.id = pp.project_id
    where (p_only is null or 'explorer' = any(p_only)) and pp.profile_id = pid and p.owner_id <> pid
  union all
  select 'talk', count(distinct c.project_id)::int
    from public.project_comments c join public.projects p on p.id = c.project_id
    where (p_only is null or 'talk' = any(p_only)) and c.author_id = pid and p.owner_id <> pid
  union all
  select 'fan', count(*)::int
    from public.project_likes l join public.projects p on p.id = l.project_id
    where (p_only is null or 'fan' = any(p_only)) and l.user_id = pid and p.owner_id <> pid
  union all
  select 'supporter',
    ((select count(*) from public.donations d where d.user_id = pid)
      + (select count(*) from public.tips t where t.user_id = pid))::int
    where p_only is null or 'supporter' = any(p_only)
  union all
  select 'firstgame', count(*)::int
    from public.projects p
    where (p_only is null or 'firstgame' = any(p_only)) and p.owner_id = pid and p.published and p.classification = 'game'
  union all
  select 'following', count(*)::int
    from public.profile_follows f
    where (p_only is null or 'following' = any(p_only)) and f.creator_id = pid
  union all
  select 'wellliked', count(*)::int
    from public.project_likes l join public.projects p on p.id = l.project_id
    where (p_only is null or 'wellliked' = any(p_only)) and p.owner_id = pid and p.published and l.user_id <> pid
  union all
  select 'crowd', count(distinct pp.profile_id)::int
    from public.profile_plays pp join public.projects p on p.id = pp.project_id
    where (p_only is null or 'crowd' = any(p_only)) and p.owner_id = pid and pp.profile_id <> pid
  union all
  select 'complete',
    (pr.avatar_path is not null and pr.banner_path is not null and char_length(trim(pr.bio)) > 0)::int
    from public.profiles pr
    where (p_only is null or 'complete' = any(p_only)) and pr.id = pid
  union all
  -- The first 100 accounts, not counting the `listed` system account that owns curated games.
  select 'earlybird',
    ((select count(*) from public.profiles o
        where o.id <> coalesce(public.curated_owner_id(), '00000000-0000-0000-0000-000000000000'::uuid)
          and (o.created_at, o.id) < (pr.created_at, pr.id)) < 100)::int
    from public.profiles pr
    where (p_only is null or 'earlybird' = any(p_only)) and pr.id = pid
  union all
  select 'claimed', count(*)::int
    from public.projects p join public.project_curation c on c.project_id = p.id
    where (p_only is null or 'claimed' = any(p_only)) and p.owner_id = pid and c.status = 'claimed'
$$;

-- Raise each badge to the level its value has reached. Never lowers a level and never touches a
-- revoked badge. The `listed` account never earns badges.
create or replace function private.sync_badges(pid uuid, p_only text[] default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if pid is null or pid = public.curated_owner_id() then
    return;
  end if;
  if not exists (select 1 from public.profiles where id = pid) then
    return;
  end if;

  insert into public.profile_badges (profile_id, badge, level)
  select pid, m.badge, lv.level
  from private.badge_metrics(pid, p_only) m
  join private.badge_thresholds() t on t.badge = m.badge
  cross join lateral (
    select count(*)::smallint as level from unnest(t.levels) as need where m.value >= need
  ) lv
  where lv.level > 0
  on conflict (profile_id, badge) do update
    set level = excluded.level, leveled_at = now()
    where public.profile_badges.level < excluded.level
      and public.profile_badges.revoked_at is null;
end;
$$;

revoke all on function private.badge_thresholds() from public;
revoke all on function private.badge_metrics(uuid, text[]) from public;
revoke all on function private.sync_badges(uuid, text[]) from public;

-- Triggers. Each one syncs only the badges its table can move. Deletes never sync, because a
-- level never goes down on its own.

create or replace function private.badges_after_play()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges(new.profile_id, array['explorer']);
  perform private.sync_badges((select owner_id from public.projects where id = new.project_id), array['crowd']);
  return null;
end;
$$;

drop trigger if exists profile_plays_sync_badges on public.profile_plays;
create trigger profile_plays_sync_badges
  after insert on public.profile_plays
  for each row execute function private.badges_after_play();

create or replace function private.badges_after_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges(new.author_id, array['talk']);
  return null;
end;
$$;

drop trigger if exists project_comments_sync_badges on public.project_comments;
create trigger project_comments_sync_badges
  after insert on public.project_comments
  for each row execute function private.badges_after_comment();

create or replace function private.badges_after_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges(new.user_id, array['fan']);
  perform private.sync_badges((select owner_id from public.projects where id = new.project_id), array['wellliked']);
  return null;
end;
$$;

drop trigger if exists project_likes_sync_badges on public.project_likes;
create trigger project_likes_sync_badges
  after insert on public.project_likes
  for each row execute function private.badges_after_like();

create or replace function private.badges_after_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges(new.creator_id, array['following']);
  return null;
end;
$$;

drop trigger if exists profile_follows_sync_badges on public.profile_follows;
create trigger profile_follows_sync_badges
  after insert on public.profile_follows
  for each row execute function private.badges_after_follow();

create or replace function private.badges_after_support()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges(new.user_id, array['supporter']);
  return null;
end;
$$;

drop trigger if exists donations_sync_badges on public.donations;
create trigger donations_sync_badges
  after insert on public.donations
  for each row execute function private.badges_after_support();

drop trigger if exists tips_sync_badges on public.tips;
create trigger tips_sync_badges
  after insert on public.tips
  for each row execute function private.badges_after_support();

create or replace function private.badges_after_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges(new.owner_id, array['firstgame', 'wellliked', 'crowd', 'claimed']);
  return null;
end;
$$;

drop trigger if exists projects_sync_badges on public.projects;
create trigger projects_sync_badges
  after insert or update of published, owner_id, classification on public.projects
  for each row execute function private.badges_after_project();

create or replace function private.badges_after_curation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_badges((select owner_id from public.projects where id = new.project_id), array['claimed']);
  return null;
end;
$$;

drop trigger if exists project_curation_sync_badges on public.project_curation;
create trigger project_curation_sync_badges
  after insert or update of status on public.project_curation
  for each row execute function private.badges_after_curation();

create or replace function private.badges_after_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform private.sync_badges(new.id, array['earlybird', 'complete']);
  else
    perform private.sync_badges(new.id, array['complete']);
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_sync_badges on public.profiles;
create trigger profiles_sync_badges
  after insert or update of avatar_path, banner_path, bio on public.profiles
  for each row execute function private.badges_after_profile();

-- 4. The profile page ------------------------------------------------------------------------

-- Every badge with its earned level (0 when not earned yet) and live progress. Supporter
-- progress counts payments, so only the profile's owner sees that number.
create or replace function public.profile_badge_board(p_profile uuid)
returns table (badge text, level smallint, earned_at timestamptz, progress integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.badge,
    coalesce(b.level, 0)::smallint,
    b.earned_at,
    case when m.badge = 'supporter' and p_profile is distinct from (select auth.uid()) then null else m.value end
  from private.badge_metrics(p_profile) m
  left join public.profile_badges b
    on b.profile_id = p_profile and b.badge = m.badge and b.revoked_at is null
  where p_profile is distinct from public.curated_owner_id()
$$;

revoke all on function public.profile_badge_board(uuid) from public;
grant execute on function public.profile_badge_board(uuid) to anon, authenticated;

-- 5. Backfill ---------------------------------------------------------------------------------
-- Award what existing likes, comments, follows, games and payments already earn.
-- Plays start from zero: profile_plays is new.

select private.sync_badges(id) from public.profiles;
