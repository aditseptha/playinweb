-- Phone games (#38): 13 curated games made for phones, marked Mobile ready, so the Phone filter and the
-- "Plays on your phone" row have something to show.
--
-- Picks come from itch.io's "Phone browser" lists (top rated, popular and touch-friendly), free and
-- original (no fan games of other studios' characters). Every game plays through itch.io's official embed
-- player (itch.io/embed-upload/<upload id>). We host nothing, so the license stays "Link only". Taglines and
-- descriptions are our own words; titles, covers and credit come from each itch.io page.
--
-- Mobile ready check, 22 Nov 2026, in a phone-sized touch-only browser (Pixel 7 size, 4G throttled to
-- 9 Mbps with 150 ms latency): reaches gameplay with touch only, fills the screen (thin bars are fine),
-- stays stable for 3 minutes, and nothing blocks play (no iframe refusal, no outside login, no ads over
-- the game). Load time is the time until the network went quiet:
--
--   portrait:  Streamline 7.8 s · Moida Mansion 3.4 s · Dungeon Puzzle Sweeper 6.5 s · Falling Lightblocks 9.5 s
--   landscape: Borb the Birb 7.4 s · A Frog's Guide To Eating Flies 7.6 s · Short Trip 14.2 s
--              PELAGIUM origins 10.5 s · Overlord's New Mansion 11.2 s · Sleigh the Spire 3.4 s
--
-- Three games play well but load slower than the ~15 s target: Packed to the Gills 19.2 s, Zoo-ika 21.3 s
-- and Brush Jjaemu 18.5 s (portrait). They are in because the batch is small; drop them here if the phone
-- check before merge finds them too slow.
--
-- No frame size: these games fit any frame, so they fill the phone screen. On a computer, portrait games
-- play in the tall phone-shaped stage.
--
-- Run after 20261122120000_project_mobile_ready.sql (mobile_ready, orientation) and
-- 20261114130000_project_controls.sql (controls). Safe to run twice: games that already exist are left
-- alone. To take a game out later, an admin unticks Mobile ready in the game form.

do $$
begin
  if to_regclass('public.project_curation') is null or to_regprocedure('public.curated_owner_id()') is null then
    raise exception 'Run 20261110130000_curated_games.sql first: it creates the listed account and project_curation.';
  end if;
  if public.curated_owner_id() is null then
    raise exception 'The listed account is missing. Run 20261110130000_curated_games.sql first.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'mobile_ready'
  ) then
    raise exception 'Run 20261122120000_project_mobile_ready.sql first: it adds mobile_ready and orientation.';
  end if;
end;
$$;

with seed (slug, title, tagline, description, genre, release_status, play_url, cover_path, creator_name, creator_url, source_url, orientation, controls) as (
  values
    ('streamline', 'Streamline', 'Grow your line all the way to the goal.', 'A small, clean puzzle game. Steer a growing line around each board and reach the goal without boxing yourself in.', 'Puzzle', 'prototype', 'https://itch.io/embed-upload/539618?color=000000', 'https://img.itch.zone/aW1hZ2UvNDcwMTEvMjU3NjMzLmdpZg==/original/h1C%2BJg.gif', 'Francois van Niekerk', 'https://francoisvn.itch.io', 'https://francoisvn.itch.io/streamline', 'portrait', array['touch', 'keyboard']),
    ('moida-mansion', 'Moida Mansion', 'Rescue your friends from a haunted mansion.', 'An adventure on a pocket LCD game. Sneak room by room through Moida Mansion with the on-screen buttons and find your friends.', 'Adventure', 'released', 'https://itch.io/embed-upload/11926521?color=000000', 'https://img.itch.zone/aW1nLzE4NDA0MTU3LnBuZw==/original/3AaHBi.png', 'dukope', 'https://dukope.itch.io', 'https://dukope.itch.io/moida-mansion', 'portrait', array['touch']),
    ('dungeon-puzzle-sweeper', 'Dungeon Puzzle Sweeper', 'Sweep the dungeon, level up, beat the dragon.', 'A mine-sweeping puzzle with RPG rules. Each number is the strength of the monsters around it: fight the ones you can win, gain experience and level up until you can take on the dragon. Hold a tile to mark it.', 'Puzzle', 'released', 'https://itch.io/embed-upload/16066817?color=000000', 'https://img.itch.zone/aW1nLzI1NzkwMzQ3LnBuZw==/original/jF00MV.png', 'Brianna Townsend', 'https://britown.itch.io', 'https://britown.itch.io/sweeper', 'portrait', array['touch', 'mouse']),
    ('falling-lightblocks', 'Falling Lightblocks', 'Clean, modern falling blocks.', 'Turn and slide the falling pieces to clear full lines. Play with swipes or on-screen buttons; a short tutorial shows you how.', 'Puzzle', 'released', 'https://itch.io/embed-upload/2917030?color=000000', 'https://img.itch.zone/aW1hZ2UvMTQ3NDA1LzY3NTA1OC5wbmc=/original/krYC0m.png', 'MrStahlfelge', 'https://mrstahlfelge.itch.io', 'https://mrstahlfelge.itch.io/lightblocks', 'portrait', array['touch', 'keyboard', 'gamepad']),
    ('brush-jjaemu', 'Brush Jjaemu', 'Brush a very patient cat.', 'A tiny, calming toy. Brush Jjaemu the cat and watch the count go up.', 'Simulation', 'released', 'https://itch.io/embed-upload/17172725?color=000000', 'https://img.itch.zone/aW1nLzI2NzY5MDg5LmpwZw==/original/kVI17%2B.jpg', 'artbyeori', 'https://byeorisim.itch.io', 'https://byeorisim.itch.io/brush-jjaemu', 'portrait', array['touch', 'mouse']),
    ('borb-the-birb', 'Borb the Birb', 'A round little bird with kind words for you.', 'A tiny self-care toy. Tap borb for a compliment or a bit of life advice. Made as a birthday present, and for anyone who needs a kind word.', 'Simulation', 'released', 'https://itch.io/embed-upload/1796885?color=000000', 'https://img.itch.zone/aW1hZ2UvNDQ5MDUvMjEwMTAyLmdpZg==/original/Y6w6%2BO.gif', 'Ludonaut', 'https://ludonaut.itch.io', 'https://ludonaut.itch.io/borb-the-birb', 'landscape', array['touch', 'keyboard', 'mouse', 'gamepad']),
    ('a-frogs-guide-to-eating-flies', 'A Frog''s Guide To Eating Flies', 'A short, sweet puzzle game about a hungry frog.', 'Hop around each small level and work out how to reach every fly. On a phone it plays with on-screen arrows.', 'Puzzle', 'released', 'https://itch.io/embed-upload/2388708?color=000000', 'https://img.itch.zone/aW1nLzM2OTE2MzMucG5n/original/B9LH4D.png', 'birdboy', 'https://birdboygames.itch.io', 'https://birdboygames.itch.io/frogguide', 'landscape', array['touch', 'keyboard', 'gamepad']),
    ('short-trip', 'Short Trip', 'Ride a tram through windswept mountains.', 'A hand-drawn interactive illustration. Hold to drive a little tram along a scenic line and pick up cats with places to be.', 'Simulation', 'released', 'https://itch.io/embed-upload/603930?color=000000', 'https://img.itch.zone/aW1hZ2UvMTc4NDg4LzgzMzY4MC5wbmc=/original/t2jwhl.png', 'Alexander Perrin', 'https://alexanderperrin.itch.io', 'https://alexanderperrin.itch.io/short-trip', 'landscape', array['touch', 'keyboard']),
    ('pelagium-origins', 'PELAGIUM origins', 'Simple turn-based war on a hex map.', 'Move your units across a hex map, take ground and push the enemy back. Short turns that play well with a tap.', 'Strategy', 'released', 'https://itch.io/embed-upload/5700895?color=000000', 'https://img.itch.zone/aW1nLzI4ODUxODQucG5n/original/g%2FhSVh.png', 'eludi', 'https://eludi.itch.io', 'https://eludi.itch.io/pelagium-origins', 'landscape', array['touch', 'keyboard', 'mouse']),
    ('overlords-new-mansion', 'Overlord''s New Mansion', 'A quick little platformer in a castle.', 'A light, smooth platformer running on its own engine. Run and jump through the overlord''s new home; on a phone it shows on-screen buttons.', 'Platformer', 'released', 'https://itch.io/embed-upload/1498185?color=000000', 'https://img.itch.zone/aW1nLzIxNDEyOTcucG5n/original/4FrHH1.png', 'saantonandre', 'https://saantonandre.itch.io', 'https://saantonandre.itch.io/overlord', 'landscape', array['touch', 'keyboard', 'mouse', 'gamepad']),
    ('sleigh-the-spire', 'Sleigh the Spire', 'A Christmas deckbuilder.', 'Each turn, pull gifts from Santa''s sack and throw them at the monsters in your way. Build a better sack as you climb.', 'Card Game', 'released', 'https://itch.io/embed-upload/20473636?color=000000', 'https://img.itch.zone/aW1nLzMxNjY4NTMxLnBuZw==/original/lf9HZN.png', 'FeatureKreep', 'https://featurekreep.itch.io', 'https://featurekreep.itch.io/sleigh-the-spire', 'landscape', array['touch', 'keyboard', 'mouse', 'gamepad']),
    ('packed-to-the-gills', 'Packed to the Gills', 'Hurry, little fish, the train is leaving.', 'A short arcade game about catching a packed train under the sea. Watch who gets on and find your moment before the doors close.', 'Action', 'released', 'https://itch.io/embed-upload/8812150?color=000000', 'https://img.itch.zone/aW1nLzEzNTkxODM5LmdpZg==/original/fR7Itv.gif', 'moonlightjammers, npckc, chunderfins, NomnomNami, HVB, DonutShoes', 'https://moonlightjammers.itch.io', 'https://moonlightjammers.itch.io/packed-to-the-gills', 'landscape', array['touch', 'keyboard', 'gamepad']),
    ('zoo-ika', 'Zoo-ika', 'Merge cute animals and see how high you go.', 'Drop animals into the pen. Two of the same merge into a bigger one, so plan each drop to keep the pile from spilling over.', 'Puzzle', 'released', 'https://itch.io/embed-upload/14762771?color=000000', 'https://img.itch.zone/aW1nLzE3Mjk1NTQyLmpwZw==/original/XplsUk.jpg', 'funwalker', 'https://funwalker.itch.io', 'https://funwalker.itch.io/zoo-ika', 'landscape', array['touch', 'keyboard', 'mouse'])
),
new_projects as (
  insert into public.projects (
    owner_id, title, slug, tagline, description, genre, classification, kind, release_status,
    pricing_type, community, contains_ai, play_url, embeddable, cover_path, published,
    controls, orientation, mobile_ready
  )
  select
    public.curated_owner_id(), s.title, s.slug, s.tagline, s.description, s.genre, 'game', 'external', s.release_status,
    'no_payments', 'disabled', null, s.play_url, true, s.cover_path, true,
    s.controls::text[], s.orientation, true
  from seed s
  on conflict (owner_id, slug) do nothing
  returning id, slug
)
insert into public.project_curation (project_id, status, play_mode, creator_name, creator_url, source_url, license)
select p.id, 'listed', 'embed', s.creator_name, s.creator_url, s.source_url, 'Link only'
from new_projects p
join seed s on s.slug = p.slug
on conflict (project_id) do nothing;
