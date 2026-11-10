-- Curated games, link-out (#9 F2): 20 free browser games from Game Jolt.
-- PlayInWeb hosts nothing for these. The game page credits the creator, and Play opens the
-- game's own Game Jolt page in a new tab. Covers stay on m.gjcdn.net (allowed in next.config.ts).
--
-- Run after 20261110130000_curated_games.sql (#24), and after the deploy that allows m.gjcdn.net.
-- Safe to run twice: games that already exist under the `listed` account are skipped.
-- Each web build was opened in a headless browser on 10 Nov 2026 and reached its title screen.
-- Taglines and descriptions are our own words; titles, covers and credit come from each Game Jolt page.

do $$
begin
  if to_regclass('public.project_curation') is null or to_regprocedure('public.curated_owner_id()') is null then
    raise exception 'Run 20261110130000_curated_games.sql first: it creates the listed account and project_curation.';
  end if;
  if public.curated_owner_id() is null then
    raise exception 'The listed account is missing. Run 20261110130000_curated_games.sql first.';
  end if;
end;
$$;

with seed (slug, title, tagline, description, genre, release_status, play_url, cover_path, contains_ai, creator_name, creator_url, source_url) as (
  values
    ('the-very-organized-thief', 'The Very Organized Thief', 'Steal everything, but leave the house spotless.', 'Sneak through a home and take what''s on your list, without leaving a mess that gives you away.', 'Puzzle', 'in_development', 'https://gamejolt.com/games/the-very-organized-thief/18991', 'https://m.gjcdn.net/game-thumbnail/1000/18991-8y7sx3rm-v4.webp', null, 'Redefinition Games', 'https://gamejolt.com/@RedefinitionGames', 'https://gamejolt.com/games/the-very-organized-thief/18991'),
    ('iin', 'IIN', 'A calm physics puzzle about guiding cubes home.', 'Play as a wandering soul that moves cubes through a minimalist world, steering the right one into the portal.', 'Puzzle', 'released', 'https://gamejolt.com/games/iin/273570', 'https://m.gjcdn.net/game-thumbnail/1000/273570-utrzavfr-v4.webp', null, 'Epopeia Games', 'https://gamejolt.com/@epopeiagames', 'https://gamejolt.com/games/iin/273570'),
    ('madcap-castle', 'Madcap Castle', 'A Game Boy-style puzzler with 150 rooms.', 'Guide a mage through a castle of tricky single-screen puzzles to win back his memory and powers.', 'Puzzle', 'released', 'https://gamejolt.com/games/madcapcastle/277506', 'https://m.gjcdn.net/game-thumbnail/1000/277506-crop0_49_950_583-3wb2fcr5-v4.png', null, 'dielmormac', 'https://gamejolt.com/@dielmormac', 'https://gamejolt.com/games/madcapcastle/277506'),
    ('down-ward', 'Down Ward', 'Flap through haunted halls to fetch your feathers.', 'A Game Boy-style platformer, born at GameBoy Jam, about a little bird named Gable exploring spooky ruins.', 'Platformer', 'in_development', 'https://gamejolt.com/games/Down-Ward/86985', 'https://m.gjcdn.net/game-thumbnail/1000/86985-bhh8ersi-v4.png', null, 'fisholith', 'https://gamejolt.com/@fisholith', 'https://gamejolt.com/games/Down-Ward/86985'),
    ('try-die-repeat', 'TRY. DIE. REPEAT.', 'Use your fallen clones to escape the lab.', 'A comic puzzle platformer made in seven days. Every time you die, your body stays behind and helps you get further on the next try.', 'Platformer', 'released', 'https://gamejolt.com/games/try-die-repeat/86584', 'https://m.gjcdn.net/game-thumbnail/1000/86584-crop0_0_1919_1080-bjk4tehg-v4.webp', null, 'rodolfodth', 'https://gamejolt.com/@dth', 'https://gamejolt.com/games/try-die-repeat/86584'),
    ('cuckoo-castle', 'Cuckoo Castle', 'A tiny metroidvania inside a castle that came from nowhere.', 'Made for GBJam. Explore a strange castle as a lone knight, find new abilities and defeat the force inside.', 'Platformer', 'in_development', 'https://gamejolt.com/games/cuckoo-castle/87063', 'https://m.gjcdn.net/game-thumbnail/1000/87063-2jmmeyzp-v4.png', null, 'Rilem', 'https://gamejolt.com/@Rilem', 'https://gamejolt.com/games/cuckoo-castle/87063'),
    ('tim', 'Tim_', 'A tough little platformer about stopping time.', 'Second place at GBJam 3. Unlock jumping, shooting and a time-stop power as you push through tricky rooms.', 'Platformer', 'released', 'https://gamejolt.com/games/tim/31441', 'https://m.gjcdn.net/game-thumbnail/1000/31441-jsmw7wgx-v4.png', null, 'kilianolopes', 'https://gamejolt.com/@kilianolopes', 'https://gamejolt.com/games/tim/31441'),
    ('sushido', 'Sushido', 'Catch fish, then slice them into sushi.', 'An arcade game in two parts: reel in fish from the sea, then turn your catch into sushi. Second place in its game jam.', 'Action', 'in_development', 'https://gamejolt.com/games/sushido/79747', 'https://m.gjcdn.net/game-thumbnail/1000/79747-bty9rhpm-v4.webp', null, 'Diptoman', 'https://gamejolt.com/@Diptoman', 'https://gamejolt.com/games/sushido/79747'),
    ('bullet-waltz', 'Bullet Waltz', 'Dodge and catch bullets to the beat.', 'A short arcade game where bullets move with the music. Watch the pattern, dodge, and catch to survive.', 'Action', 'released', 'https://gamejolt.com/games/bullet-waltz/22372', 'https://m.gjcdn.net/game-thumbnail/1000/22372-7tiwraa6-v4.webp', null, 'RockHong', 'https://gamejolt.com/@RockyHong', 'https://gamejolt.com/games/bullet-waltz/22372'),
    ('iron-snout', 'Iron Snout', 'A piglet fights off endless wolves.', 'A fast, cartoony brawler. Pull off flashy combos to keep a brave piglet alive against waves of wolves.', 'Fighting', 'released', 'https://gamejolt.com/games/iron-snout/193696', 'https://m.gjcdn.net/game-thumbnail/1000/193696-ie7s4cnb-v4.webp', null, 'SnoutUp', 'https://gamejolt.com/@SnoutUp', 'https://gamejolt.com/games/iron-snout/193696'),
    ('crosscode-demo', 'CrossCode Demo', 'A 16-bit style action RPG with puzzles.', 'The free demo of CrossCode: fast real-time combat, bouncing-ball puzzles and a sci-fi story set inside an online game.', 'Role Playing', 'released', 'https://gamejolt.com/games/crosscode/47920', 'https://m.gjcdn.net/game-thumbnail/1000/47920-crop0_2_1136_640-ki49zvnw-v4.png', null, 'Radical Fish Games', 'https://gamejolt.com/@radicalfishgames', 'https://gamejolt.com/games/crosscode/47920'),
    ('knightin-plus-demo', 'Knightin''+ Demo', 'A small Zelda-like dungeon adventure.', 'Explore the first dungeon of Knightin''+ with Sir Lootalot. Fight, dodge traps and solve puzzles on the way.', 'Role Playing', 'released', 'https://gamejolt.com/games/knightin-plus-demo/424089', 'https://m.gjcdn.net/game-thumbnail/1000/424089-fdmpukxv-v4.png', null, 'Wolod', 'https://gamejolt.com/@Wolod', 'https://gamejolt.com/games/knightin-plus-demo/424089'),
    ('aground', 'Aground', 'Mine, craft and build after a shipwreck.', 'Stranded on an island with a few other survivors, start with almost nothing and grow into a thriving settlement.', 'Adventure', 'in_development', 'https://gamejolt.com/games/aground/292428', 'https://m.gjcdn.net/game-thumbnail/1000/292428-8b7mksmy-v4.webp', null, 'David Maletz', 'https://gamejolt.com/@davidmaletz', 'https://gamejolt.com/games/aground/292428'),
    ('catty-shack', 'Catty Shack', 'You''re a ghost, and the shelter cats ran away.', 'A short 3D adventure, about 45 minutes long. Meet each runaway cat''s ridiculous demands to bring them home.', 'Adventure', 'released', 'https://gamejolt.com/games/catty-shack/249613', 'https://m.gjcdn.net/game-thumbnail/1000/249613-crop0_8_711_408-zrp74vwc-v4.webp', null, 'Ian Burnette', 'https://gamejolt.com/@ianburnette', 'https://gamejolt.com/games/catty-shack/249613'),
    ('treasure-arena', 'Treasure Arena', 'An online battle arena for up to four players.', 'Grab bows, rockets and bombs, dodge and block attacks, and collect the most coins to win the round.', 'Action', 'in_development', 'https://gamejolt.com/games/treasure-arena/17598', 'https://m.gjcdn.net/game-thumbnail/1000/17598-eyzmfhxw-v4.webp', null, 'Vennril', 'https://gamejolt.com/@Vennril', 'https://gamejolt.com/games/treasure-arena/17598'),
    ('defentures', 'Defentures', 'Side-scrolling defense with a band of dwarves.', 'A nostalgic side-scrolling defense strategy game. Lead a band of dwarves against hordes of enemies.', 'Strategy', 'in_development', 'https://gamejolt.com/games/defentures/311913', 'https://m.gjcdn.net/game-thumbnail/1000/311913-crop0_32_944_563-rwammfgu-v4.webp', null, 'hromoyDron', 'https://gamejolt.com/@Defentures', 'https://gamejolt.com/games/defentures/311913'),
    ('mars-underground', 'Mars Underground', 'Relive the same school day until the world stops ending.', 'A comic adventure in a time loop. Each cycle unlocks new items and topics as you work out what is going on.', 'Adventure', 'released', 'https://gamejolt.com/games/marsunderground/139412', 'https://m.gjcdn.net/game-thumbnail/1000/139412-crop0_34_1440_844-57msrupv-v4.webp', null, 'KilgoreTrout', 'https://gamejolt.com/@KilgoreTrout', 'https://gamejolt.com/games/marsunderground/139412'),
    ('townseek', 'Townseek', 'Explore the world by airship and trade between towns.', 'A cozy adventure: fly to distant towns, trade goods, fish and mine, and discover new landmarks.', 'Adventure', 'released', 'https://gamejolt.com/games/townseek/607904', 'https://m.gjcdn.net/game-thumbnail/1000/607904-eebbwu3h-v4.png', null, 'Whales And Games 🐳', 'https://gamejolt.com/@WhalesAndGames', 'https://gamejolt.com/games/townseek/607904'),
    ('a-pretty-odd-bunny', 'A Pretty Odd Bunny', 'A cute bunny with a plan to eat a pig.', 'A stealth platformer with 24 levels. Push, jump and sneak past your veggie friends to reach the pig.', 'Platformer', 'released', 'https://gamejolt.com/games/oddbunnyclassic/51903', 'https://m.gjcdn.net/game-thumbnail/1000/51903-ggfzjutm-v4.webp', null, 'AJ Ordaz', 'https://gamejolt.com/@_ajordaz', 'https://gamejolt.com/games/oddbunnyclassic/51903'),
    ('no-one-has-to-die', 'no-one has to die.', 'Choose who lives in a building on fire.', 'A short puzzle game about decisions. Who you save changes the story, and finding the way to save everyone is the real puzzle.', 'Puzzle', 'released', 'https://gamejolt.com/games/no-one-has-to-die/14133', 'https://m.gjcdn.net/game-thumbnail/1000/14133-uc4jmupj-v4.png', null, 'SammyBloo', 'https://gamejolt.com/@SammyBloo', 'https://gamejolt.com/games/no-one-has-to-die/14133')
),
new_projects as (
  insert into public.projects (
    owner_id, title, slug, tagline, description, genre, classification, kind, release_status,
    pricing_type, community, contains_ai, play_url, embeddable, cover_path, published
  )
  select
    public.curated_owner_id(), s.title, s.slug, s.tagline, s.description, s.genre, 'game', 'external', s.release_status,
    'no_payments', 'disabled', s.contains_ai::boolean, s.play_url, false, s.cover_path, true
  from seed s
  on conflict (owner_id, slug) do nothing
  returning id, slug
)
insert into public.project_curation (project_id, status, play_mode, creator_name, creator_url, source_url, license)
select p.id, 'listed', 'link_out', s.creator_name, s.creator_url, s.source_url, 'Link only'
from new_projects p
join seed s on s.slug = p.slug
on conflict (project_id) do nothing;
