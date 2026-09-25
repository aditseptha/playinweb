create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_path text,
  banner_path text,
  banner_position text not null default '50 50',
  follower_count integer not null default 0,
  wallet_address text,
  created_at timestamptz not null default now(),
  constraint profiles_handle_format check (
    handle ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$'
  ),
  constraint profiles_handle_reserved check (
    handle not in (
      'www', 'api', 'app', 'admin', 'static', 'assets', 'auth', 'login', 'signup',
      'register', 'library', 'profile', 'channel', 'game', 'games', 'top', 'site',
      'u', 'account', 'accounts', 'support', 'help', 'cdn'
    )
  )
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null,
  tagline text not null default '',
  classification text not null default 'game',
  kind text not null default 'html',
  release_status text not null default 'released',
  pricing_type text not null default 'donate',
  suggested_donation numeric(10, 2),
  min_price numeric(10, 2),
  cover_path text,
  trailer_url text,
  description text not null default '',
  genre text,
  custom_noun text not null default 'game',
  community text not null default 'comments',
  contains_ai boolean,
  play_url text not null default '',
  embeddable boolean not null default false,
  published boolean not null default true,
  play_count integer not null default 0,
  view_count integer not null default 0,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug),
  constraint projects_slug_format check (
    slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'
  ),
  constraint projects_classification_check check (
    classification in ('game', 'assets', 'mod', 'physical', 'soundtrack', 'tool', 'comic', 'book', 'other')
  ),
  constraint projects_kind_check check (
    kind in ('downloadable', 'html', 'flash', 'java', 'unity', 'other')
  ),
  constraint projects_release_status_check check (
    release_status in ('released', 'in_development', 'prototype', 'canceled')
  ),
  constraint projects_pricing_type_check check (
    pricing_type in ('donate', 'paid', 'no_payments')
  ),
  constraint projects_community_check check (
    community in ('disabled', 'comments', 'board')
  )
);

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_published_idx on public.projects (published, created_at desc);

create table public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag text not null,
  primary key (project_id, tag),
  constraint project_tags_tag_len check (char_length(tag) between 1 and 32)
);

create table public.project_screenshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_name text not null,
  storage_path text,
  external_url text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint project_files_source check (storage_path is not null or external_url is not null)
);

create table public.project_store_links (
  project_id uuid not null references public.projects (id) on delete cascade,
  store text not null,
  url text not null,
  primary key (project_id, store),
  constraint project_store_links_store_check check (
    store in ('steam', 'apple', 'google', 'amazon', 'windows')
  )
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h text;
  n text;
begin
  h := lower(trim(both from coalesce(new.raw_user_meta_data->>'handle', '')));
  n := trim(both from coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  ));
  if h !~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$' then
    h := 'user-' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if n = '' then
    n := h;
  end if;
  insert into public.profiles (id, handle, display_name)
  values (new.id, h, n)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_tags enable row level security;
alter table public.project_screenshots enable row level security;
alter table public.project_files enable row level security;
alter table public.project_store_links enable row level security;

create policy "profiles_select" on public.profiles
  for select to anon, authenticated using (true);

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "projects_select" on public.projects
  for select to anon, authenticated
  using (published or owner_id = (select auth.uid()));

create policy "projects_insert" on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "projects_update" on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "projects_delete" on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "project_tags_select" on public.project_tags
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.published or p.owner_id = (select auth.uid()))
    )
  );

create policy "project_tags_insert" on public.project_tags
  for insert to authenticated
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_tags_delete" on public.project_tags
  for delete to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_screenshots_select" on public.project_screenshots
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.published or p.owner_id = (select auth.uid()))
    )
  );

create policy "project_screenshots_insert" on public.project_screenshots
  for insert to authenticated
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_screenshots_delete" on public.project_screenshots
  for delete to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_files_select" on public.project_files
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.published or p.owner_id = (select auth.uid()))
    )
  );

create policy "project_files_insert" on public.project_files
  for insert to authenticated
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_files_delete" on public.project_files
  for delete to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_store_links_select" on public.project_store_links
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.published or p.owner_id = (select auth.uid()))
    )
  );

create policy "project_store_links_insert" on public.project_store_links
  for insert to authenticated
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "project_store_links_delete" on public.project_store_links
  for delete to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

grant select on public.profiles, public.projects, public.project_tags, public.project_screenshots, public.project_files, public.project_store_links to anon, authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.projects to authenticated;
grant insert, delete on public.project_tags, public.project_screenshots, public.project_files, public.project_store_links to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-media', 'project-media', true, 52428800)
on conflict (id) do nothing;

create policy "project_media_select"
on storage.objects for select
to public
using (bucket_id = 'project-media');

create policy "project_media_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "project_media_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "project_media_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.project_comments (id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint project_comments_body_len check (char_length(trim(body)) between 1 and 500)
);

create index project_comments_project_id_idx on public.project_comments (project_id, created_at);
create index project_comments_parent_idx on public.project_comments (project_id, parent_id, created_at);

create table public.project_likes (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_comments enable row level security;
alter table public.project_likes enable row level security;

create policy project_comments_select on public.project_comments
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.published or p.owner_id = (select auth.uid()))
    )
  );

create policy project_comments_insert on public.project_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.published
        and p.community in ('comments', 'board')
    )
  );

create policy project_comments_update on public.project_comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy project_comments_delete on public.project_comments
  for delete to authenticated
  using (author_id = (select auth.uid()));

create or replace function private.normalize_comment_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent public.project_comments;
begin
  if new.parent_id is null then
    return new;
  end if;
  select * into parent from public.project_comments where id = new.parent_id;
  if not found then
    raise exception 'parent comment not found';
  end if;
  if parent.project_id <> new.project_id then
    raise exception 'reply must be on the same project';
  end if;
  if parent.parent_id is not null then
    new.parent_id := parent.parent_id;
  end if;
  return new;
end;
$$;

create trigger project_comments_normalize_parent
  before insert or update of parent_id on public.project_comments
  for each row execute function private.normalize_comment_parent();

create table public.project_comment_likes (
  comment_id uuid not null references public.project_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.project_comment_likes enable row level security;

create policy project_comment_likes_select on public.project_comment_likes
  for select to anon, authenticated
  using (true);

create policy project_comment_likes_insert on public.project_comment_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy project_comment_likes_delete on public.project_comment_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.touch_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.project_comments set like_count = like_count + 1 where id = new.comment_id;
    return new;
  end if;
  update public.project_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  return old;
end;
$$;

create trigger project_comment_likes_touch_count
  after insert or delete on public.project_comment_likes
  for each row execute function private.touch_comment_like_count();

create policy project_likes_select on public.project_likes
  for select to anon, authenticated
  using (true);

create policy project_likes_insert on public.project_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy project_likes_delete on public.project_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.touch_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.projects set like_count = like_count + 1 where id = new.project_id;
    return new;
  end if;
  update public.projects set like_count = greatest(like_count - 1, 0) where id = old.project_id;
  return old;
end;
$$;

create trigger project_likes_touch_count
  after insert or delete on public.project_likes
  for each row execute function private.touch_like_count();

create table public.project_stat_days (
  project_id uuid not null references public.projects (id) on delete cascade,
  day date not null,
  views integer not null default 0,
  plays integer not null default 0,
  primary key (project_id, day)
);

create index project_stat_days_day_idx on public.project_stat_days (day);

alter table public.project_stat_days enable row level security;

create policy project_stat_days_owner_select on public.project_stat_days
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

grant select on public.project_stat_days to authenticated;

create or replace function public.bump_play_count(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set play_count = play_count + 1
  where id = pid and published = true and play_count < view_count;
  if found then
    insert into public.project_stat_days (project_id, day, plays)
    values (pid, (timezone('utc', now()))::date, 1)
    on conflict (project_id, day)
    do update set plays = public.project_stat_days.plays + 1;
  end if;
end;
$$;

revoke all on function public.bump_play_count(uuid) from public;
grant execute on function public.bump_play_count(uuid) to anon, authenticated;

create or replace function public.bump_view_count(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set view_count = view_count + 1
  where id = pid and published = true;
  if found then
    insert into public.project_stat_days (project_id, day, views)
    values (pid, (timezone('utc', now()))::date, 1)
    on conflict (project_id, day)
    do update set views = public.project_stat_days.views + 1;
  end if;
end;
$$;

revoke all on function public.bump_view_count(uuid) from public;
grant execute on function public.bump_view_count(uuid) to anon, authenticated;

grant select on public.project_comments, public.project_likes, public.project_comment_likes to anon, authenticated;
grant insert, update, delete on public.project_comments to authenticated;
grant insert, delete on public.project_likes, public.project_comment_likes to authenticated;

create table public.profile_follows (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  follower_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (creator_id, follower_id),
  constraint profile_follows_no_self check (creator_id <> follower_id)
);

create index profile_follows_follower_id_idx on public.profile_follows (follower_id);

alter table public.profile_follows enable row level security;

create policy profile_follows_select on public.profile_follows
  for select to anon, authenticated
  using (true);

create policy profile_follows_insert on public.profile_follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and creator_id <> (select auth.uid())
  );

create policy profile_follows_delete on public.profile_follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

create or replace function private.touch_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.creator_id;
    return new;
  end if;
  update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.creator_id;
  return old;
end;
$$;

create trigger profile_follows_touch_count
  after insert or delete on public.profile_follows
  for each row execute function private.touch_follower_count();

grant select on public.profile_follows to anon, authenticated;
grant insert, delete on public.profile_follows to authenticated;

create table private.admins (
  email text primary key
);

insert into private.admins (email) values ('aditseptha@gmail.com');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select exists (
    select 1
    from private.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = (select auth.uid())
  );
$$;

create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  return json_build_object(
    'users', (select count(*)::int from auth.users),
    'users_today', (
      select count(*)::int from auth.users
      where created_at >= date_trunc('day', timezone('utc', now()))
    ),
    'users_week', (
      select count(*)::int from auth.users
      where created_at >= timezone('utc', now()) - interval '7 days'
    ),
    'games', (select count(*)::int from public.projects),
    'published', (select count(*)::int from public.projects where published),
    'views', (select coalesce(sum(view_count), 0)::int from public.projects),
    'plays', (select coalesce(sum(least(play_count, view_count)), 0)::int from public.projects)
  );
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  handle text,
  display_name text,
  country text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  return query
  select
    u.id,
    u.email::text,
    p.handle,
    p.display_name,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'country', '')), ''),
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc
  limit 200;
end;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.admin_overview() from public;
revoke all on function public.admin_list_users() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users() to authenticated;

create table public.site_features (
  id text primary key,
  label text not null,
  href text not null,
  description text not null default '',
  hidden boolean not null default false,
  soon boolean not null default false,
  sort_order integer not null default 0
);

insert into public.site_features (id, label, href, description, hidden, soon, sort_order) values
  ('showcase', 'Game showcase', '/showcase', 'Paid ranking page in the public menu.', false, true, 1),
  ('top', 'Top Played', '/top', 'Play ranking in the public menu.', false, false, 2),
  ('downloads', 'Downloads', '/downloads', 'Downloadable files in the public menu.', false, false, 3);

alter table public.site_features enable row level security;

create policy site_features_select on public.site_features
  for select to anon, authenticated
  using (true);

create or replace function public.admin_set_feature(fid text, hide boolean, is_soon boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  update public.site_features
  set hidden = hide, soon = is_soon
  where id = fid;
end;
$$;

revoke all on function public.admin_set_feature(text, boolean, boolean) from public;
grant execute on function public.admin_set_feature(text, boolean, boolean) to authenticated;
grant select on public.site_features to anon, authenticated;

create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  subject text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create index issue_reports_created_at_idx on public.issue_reports (created_at desc);

alter table public.issue_reports enable row level security;

create policy issue_reports_insert on public.issue_reports
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and email = coalesce((select auth.jwt() ->> 'email'), '')
  );

create policy issue_reports_select_admin on public.issue_reports
  for select to authenticated
  using (public.is_admin());

grant insert, select on public.issue_reports to authenticated;

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  donor_email text,
  donor_handle text,
  creator_name text,
  creator_handle text,
  game_title text,
  game_slug text,
  commission_pct numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index donations_user_id_created_at_idx on public.donations (user_id, created_at desc);
create index donations_project_id_created_at_idx on public.donations (project_id, created_at desc);

alter table public.donations enable row level security;

create policy donations_insert on public.donations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy donations_select on public.donations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy donations_select_creator on public.donations
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = donations.project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy donations_select_admin on public.donations
  for select to authenticated
  using (public.is_admin());

grant insert, select on public.donations to authenticated;

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  donor_email text,
  donor_handle text,
  created_at timestamptz not null default now()
);

create index tips_user_id_created_at_idx on public.tips (user_id, created_at desc);
create index tips_created_at_idx on public.tips (created_at desc);

alter table public.tips enable row level security;

create policy tips_insert on public.tips
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy tips_select on public.tips
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy tips_select_admin on public.tips
  for select to authenticated
  using (public.is_admin());

grant insert, select on public.tips to authenticated;

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested', 'paid', 'cancelled')),
  creator_email text,
  creator_handle text,
  created_at timestamptz not null default now()
);

create index payouts_user_id_created_at_idx on public.payouts (user_id, created_at desc);

alter table public.payouts enable row level security;

create policy payouts_select on public.payouts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy payouts_select_admin on public.payouts
  for select to authenticated
  using (public.is_admin());

grant select on public.payouts to authenticated;

create or replace function private.payout_within_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  earned numeric;
  cashed numeric;
begin
  if new.amount < 10 then
    raise exception 'amount below cash out minimum';
  end if;

  select coalesce(sum(d.amount * (1 - d.commission_pct / 100)), 0) into earned
  from public.donations d
  join public.projects p on p.id = d.project_id
  where p.owner_id = new.user_id;

  select coalesce(sum(amount), 0) into cashed
  from public.payouts
  where user_id = new.user_id
    and id is distinct from new.id
    and status <> 'cancelled';

  if new.amount > earned - cashed + 0.001 then
    raise exception 'amount exceeds available balance';
  end if;
  return new;
end;
$$;

create trigger payouts_within_balance
  before insert on public.payouts
  for each row execute function private.payout_within_balance();

create or replace function private.run_weekly_cashouts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_count integer := 0;
  rec record;
  earned numeric;
  cashed numeric;
  available numeric;
begin
  for rec in
    select p.id, p.handle, p.wallet_address
    from public.profiles p
    where p.wallet_address is not null
      and btrim(p.wallet_address) <> ''
  loop
    select coalesce(sum(d.amount * (1 - d.commission_pct / 100)), 0) into earned
    from public.donations d
    join public.projects pr on pr.id = d.project_id
    where pr.owner_id = rec.id;

    select coalesce(sum(amount), 0) into cashed
    from public.payouts
    where user_id = rec.id
      and status <> 'cancelled';

    available := round((earned - cashed)::numeric, 2);

    if available >= 10 then
      begin
        insert into public.payouts (user_id, amount, status, creator_email, creator_handle)
        values (rec.id, available, 'paid', rec.wallet_address, rec.handle);
        paid_count := paid_count + 1;
      exception
        when others then
          null;
      end;
    end if;
  end loop;

  return paid_count;
end;
$$;

revoke all on function private.run_weekly_cashouts() from public;
revoke all on function private.run_weekly_cashouts() from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'weekly-cashout',
  '0 17 * * 4',
  $$select private.run_weekly_cashouts()$$
);

create table public.site_settings (
  id text primary key,
  value numeric not null
);

insert into public.site_settings (id, value) values ('donation_commission_pct', 10);

alter table public.site_settings enable row level security;

create policy site_settings_select on public.site_settings
  for select to anon, authenticated
  using (true);

create policy site_settings_update_admin on public.site_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
