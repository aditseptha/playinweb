-- Curated games, embed (#9 F2): 37 link-out games now play inside PlayInWeb.
-- itch.io offers an official embed player (itch.io/embed-upload/<upload id>) for HTML5 games, the same
-- one its own "Embed game" code uses. The build still loads from itch.io, keeps the itch.io badge, and
-- counts plays for the creator. We host nothing, so the license stays "Link only".
--
-- 29 are the itch.io games from 20261110140000. 8 are Game Jolt games from 20261110190000
-- that the same creator also publishes on itch.io; their credit links move to that itch.io page,
-- because that is where the build now loads from. Game Jolt blocks embedding, so the other Game Jolt
-- games stay link-out. Idle Breakout also stays link-out: its build refuses to run on other sites.
--
-- Run after 20261110190000_curated_gamejolt_games.sql, and after the deploy that ships the embed mode.
-- Safe to run twice. Only unclaimed link-out games owned by the `listed` account are changed.
-- Each embed was opened in a headless browser inside PlayInWeb's sandboxed play frame on 10 Nov 2026.

do $$
begin
  if to_regclass('public.project_curation') is null or to_regprocedure('public.curated_owner_id()') is null then
    raise exception 'Run 20261110130000_curated_games.sql first: it creates the listed account and project_curation.';
  end if;
end;
$$;

alter table public.project_curation drop constraint if exists project_curation_play_mode_check;
alter table public.project_curation
  add constraint project_curation_play_mode_check check (play_mode in ('hosted', 'link_out', 'embed'));

with seed (slug, play_url, creator_url, source_url) as (
  values
  ('dragonsweeper', 'https://itch.io/embed-upload/12786123?color=000000', null, null),
  ('the-roottrees-are-dead', 'https://itch.io/embed-upload/9473605?color=000000', null, null),
  ('trace', 'https://itch.io/embed-upload/15470653?color=000000', null, null),
  ('six-cats-under', 'https://itch.io/embed-upload/2267583?color=000000', null, null),
  ('pack', 'https://itch.io/embed-upload/18418802?color=000000', null, null),
  ('stealth-crossword', 'https://itch.io/embed-upload/13546801?color=000000', null, null),
  ('the-archives-of-trevosa', 'https://itch.io/embed-upload/17244314?color=000000', null, null),
  ('space-frog', 'https://itch.io/embed-upload/2766663?color=000000', null, null),
  ('sort-the-court', 'https://itch.io/embed-upload/347310?color=000000', null, null),
  ('an-average-day-at-the-cat-cafe', 'https://itch.io/embed-upload/6691622?color=000000', null, null),
  ('peggys-post', 'https://itch.io/embed-upload/16457052?color=000000', null, null),
  ('good-morning', 'https://itch.io/embed-upload/1525934?color=000000', null, null),
  ('plant-daddy', 'https://itch.io/embed-upload/3226201?color=000000', null, null),
  ('tamaweb', 'https://itch.io/embed-upload/17623133?color=000000', null, null),
  ('little-chef-prototype', 'https://itch.io/embed-upload/15194587?color=000000', null, null),
  ('vampire-survivors', 'https://itch.io/embed-upload/5185382?color=000000', null, null),
  ('tanuki-sunset-classic', 'https://itch.io/embed-upload/1756009?color=000000', null, null),
  ('generic-fighter-maybe', 'https://itch.io/embed-upload/14797852?color=000000', null, null),
  ('moss-moss', 'https://itch.io/embed-upload/18234416?color=000000', null, null),
  ('self', 'https://itch.io/embed-upload/3548785?color=000000', null, null),
  ('platformer-toolkit', 'https://itch.io/embed-upload/6005870?color=000000', null, null),
  ('die-in-the-dungeon-classic', 'https://itch.io/embed-upload/7330268?color=000000', null, null),
  ('shogun-showdown-alpha', 'https://itch.io/embed-upload/6187898?color=000000', null, null),
  ('folder-dungeon-classic', 'https://itch.io/embed-upload/8580978?color=000000', null, null),
  ('waterworks', 'https://itch.io/embed-upload/7631042?color=000000', null, null),
  ('friday-night-funkin', 'https://itch.io/embed-upload/16944508?color=000000', null, null),
  ('lo-fi-room', 'https://itch.io/embed-upload/4582668?color=000000', null, null),
  ('adventures-with-anxiety', 'https://itch.io/embed-upload/1830885?color=000000', null, null),
  ('serenitrove', 'https://itch.io/embed-upload/19817933?color=000000', null, null),
  ('cuckoo-castle', 'https://itch.io/embed-upload/2315059?color=000000', 'https://rilem.itch.io', 'https://rilem.itch.io/cuckoo-castle'),
  ('knightin-plus-demo', 'https://itch.io/embed-upload/1854796?color=000000', 'https://wolod.itch.io', 'https://wolod.itch.io/knightin-plus-demo'),
  ('aground', 'https://itch.io/embed-upload/2357483?color=000000', 'https://fancyfishgames.itch.io', 'https://fancyfishgames.itch.io/aground'),
  ('catty-shack', 'https://itch.io/embed-upload/691044?color=000000', 'https://ianburnette.itch.io', 'https://ianburnette.itch.io/catty-shack'),
  ('treasure-arena', 'https://itch.io/embed-upload/8361303?color=000000', 'https://vennril.itch.io', 'https://vennril.itch.io/treasure-arena'),
  ('defentures', 'https://itch.io/embed-upload/5409300?color=000000', 'https://defentures.itch.io', 'https://defentures.itch.io/defentures'),
  ('mars-underground', 'https://itch.io/embed-upload/11234136?color=000000', 'https://marsunderground.itch.io', 'https://marsunderground.itch.io/mars-underground'),
  ('townseek', 'https://itch.io/embed-upload/3671368?color=000000', 'https://whalesandgames.itch.io', 'https://whalesandgames.itch.io/townseek')
),
moved as (
  update public.projects p
  set play_url = s.play_url, embeddable = true
  from seed s, public.project_curation c
  where p.owner_id = public.curated_owner_id()
    and p.slug = s.slug
    and p.kind = 'external'
    and c.project_id = p.id
    and c.play_mode = 'link_out'
    and c.status in ('listed', 'claim_pending')
  returning p.id, s.creator_url, s.source_url
)
update public.project_curation c
set play_mode = 'embed',
  creator_url = coalesce(m.creator_url, c.creator_url),
  source_url = coalesce(m.source_url, c.source_url)
from moved m
where c.project_id = m.id;
