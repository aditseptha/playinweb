-- Curated games, playable here: every curated game that plays inside PlayInWeb now fills the stage.
-- Rizky and Adit play-tested the catalogue on 11 Nov 2026. The PICO-8 cart player only lays out as a
-- small square box, and ten itch.io games were built square, portrait or very small, so none of them
-- could fill the stage. Those 40 games are removed and 74 new itch.io games take their place.
--
-- Every game here plays through itch.io's official embed player (itch.io/embed-upload/<upload id>). We host
-- nothing, so the license stays "Link only". The new columns frame_width/frame_height hold the size each
-- game was built for (from its itch.io page). The play frame renders the game at exactly that size and
-- scales it to fit, so fixed-size games are never cropped or left tiny.
--
-- Picks: free, keyboard or mouse, close to 16:9, rated 3.9+ on itch.io, original games only (no fan games
-- of other studios' characters). Each one was loaded in PlayInWeb's sandboxed play frame at its native size
-- on 11–12 Nov 2026 and reached its title screen or gameplay. Taglines and descriptions are our own words;
-- titles, covers and credit come from each itch.io page.
--
-- Run after 20261110210000_curated_pico8_games.sql, and BEFORE merging the PR that ships frame sizes:
-- that deploy deletes the PICO-8 cover images, so the PICO-8 games should be gone first. Until the deploy,
-- the new games already play; they just are not scaled yet. The site keeps working with or without the
-- new columns. Safe to run twice. Only unclaimed games owned by the `listed` account are removed or changed.

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

-- 1. The size each embedded game was built for ------------------------------------------------------

alter table public.project_curation add column if not exists frame_width integer;
alter table public.project_curation add column if not exists frame_height integer;
alter table public.project_curation drop constraint if exists project_curation_frame_size_check;
alter table public.project_curation
  add constraint project_curation_frame_size_check check (
    (frame_width is null and frame_height is null)
    or (frame_width between 200 and 4000 and frame_height between 200 and 4000)
  );

-- 2. Remove the games that cannot fill the stage -----------------------------------------------------
-- Likes, comments, daily stats and homepage picks for these games go with them (on delete cascade).

delete from public.projects p
using public.project_curation c
where c.project_id = p.id
  and p.owner_id = public.curated_owner_id()
  and c.status = 'listed'
  and p.slug in (
    'pico-ball',
    'oblivion-eve',
    'bas-birds-and-saws',
    'woodworm',
    'build-a-jetpack',
    'air-delivery',
    'motion-rec',
    'whiplash-taxi-co',
    'puzzles-of-the-paladin',
    'subsurface',
    'dungeon',
    'hot-wax',
    'lab-cat',
    'the-heavens',
    'balloon',
    'terra-nova-pinball',
    'hit8ox',
    'nemo-picross',
    'super-hat-girl',
    'top-speed',
    'mole-mole',
    'petal-quest',
    'ruby-eyes',
    'beam',
    'bubblegum-spin',
    'dino-sort',
    'province',
    'little-eidolons',
    'time-for-lunch',
    'sokoblox',
    'dragonsweeper',
    'the-archives-of-trevosa',
    'shogun-showdown-alpha',
    'tamaweb',
    'adventures-with-anxiety',
    'self',
    'cuckoo-castle',
    'space-frog',
    'moss-moss',
    'serenitrove'
  );

-- 3. Native sizes for the itch.io games we keep ------------------------------------------------------

update public.project_curation c
set frame_width = s.w, frame_height = s.h
from (values
  ('the-roottrees-are-dead', 1200, 760),
  ('trace', 1280, 780),
  ('six-cats-under', 960, 540),
  ('pack', 1280, 720),
  ('stealth-crossword', 1300, 740),
  ('sort-the-court', 980, 620),
  ('an-average-day-at-the-cat-cafe', 1280, 720),
  ('peggys-post', 1300, 800),
  ('good-morning', 920, 740),
  ('plant-daddy', 960, 540),
  ('little-chef-prototype', 960, 585),
  ('vampire-survivors', 1024, 640),
  ('tanuki-sunset-classic', 980, 668),
  ('generic-fighter-maybe', 960, 540),
  ('platformer-toolkit', 1280, 720),
  ('die-in-the-dungeon-classic', 960, 540),
  ('folder-dungeon-classic', 960, 650),
  ('waterworks', 1280, 720),
  ('friday-night-funkin', 960, 540),
  ('lo-fi-room', 973, 608),
  ('knightin-plus-demo', 1280, 720),
  ('aground', 1024, 576),
  ('catty-shack', 976, 616),
  ('treasure-arena', 1280, 720),
  ('defentures', 916, 656),
  ('mars-underground', 1024, 576),
  ('townseek', 1024, 576)
) as s (slug, w, h), public.projects p
where p.id = c.project_id
  and p.slug = s.slug
  and p.owner_id = public.curated_owner_id()
  and c.play_mode = 'embed'
  and c.status in ('listed', 'claim_pending');

-- 4. New games ---------------------------------------------------------------------------------------

with seed (slug, title, tagline, description, genre, release_status, play_url, cover_path, creator_name, creator_url, source_url, w, h) as (
  values
    ('deepest-sword', 'Deepest Sword', 'Grow your sword until it reaches the dragon''s heart.', 'A short physics platformer where your weapon keeps getting longer. Swing, balance and climb with an unwieldy blade until it is long enough to strike the dragon.', 'Platformer', 'released', 'https://itch.io/embed-upload/4017918?color=000000', 'https://img.itch.zone/aW1nLzU3OTM0OTYuZ2lm/original/tRnag0.gif', 'Cosmic Adventure Squad', 'https://cosmicadventuresquad.itch.io', 'https://cosmicadventuresquad.itch.io/deepest-sword', 960, 540),
    ('red-handed', 'Red Handed', 'A stealth game where getting caught is the goal.', 'Each room hides a guard and a plan. Work out how to be seen at exactly the right moment, then try again when it goes wrong.', 'Action', 'released', 'https://itch.io/embed-upload/3872485?color=000000', 'https://img.itch.zone/aW1nLzU0MjU2NzEuZ2lm/original/I6VtOo.gif', 'Bad Piggy', 'https://badpiggy.itch.io', 'https://badpiggy.itch.io/red-handed', 960, 600),
    ('cozy-coco-catcher', 'Cozy Coco Catcher', 'Catch falling coconuts and upgrade your beach.', 'A relaxed incremental game. Run under the palm trees, catch coconuts before they land and spend them on upgrades that make every round faster.', 'Platformer', 'released', 'https://itch.io/embed-upload/18013330?color=000000', 'https://img.itch.zone/aW1nLzI4MDgwMTMwLnBuZw==/original/MCkw%2Fg.png', 'FeatureKreep', 'https://featurekreep.itch.io', 'https://featurekreep.itch.io/cozy-coco-catcher', 960, 540),
    ('the-last-guardian', 'The Last Guardian', 'Hold the line against waves of space invaders.', 'A space survival shooter. Fight off wave after wave, spend what you earn in the shop and see how long you can last.', 'Shooter', 'in_development', 'https://itch.io/embed-upload/6199497?color=000000', 'https://img.itch.zone/aW1nLzk1NzA3MDcuanBn/original/gUP0rD.jpg', 'RichieMilos', 'https://richiemilos.itch.io', 'https://richiemilos.itch.io/thelastguardian', 1080, 680),
    ('wreckbox', 'Wreckbox', 'A demolition sandbox with real structural physics.', 'Pick a tool and bring down buildings piece by piece. Every beam and wall reacts to the weight it carries.', 'Simulation', 'in_development', 'https://itch.io/embed-upload/20082221?color=000000', 'https://img.itch.zone/aW1nLzMxMzk4MTk1LmpwZw==/original/sMuMjP.jpg', 'ItsLamba', 'https://itslamba.itch.io', 'https://itslamba.itch.io/wreckbox', 960, 540),
    ('the-case-of-the-dungeon-descent', 'The Case of the Dungeon Descent', 'Scry into the past to learn what happened to the princess.', 'A deduction puzzle. Watch scenes from a doomed dungeon party, match names to faces and fates, and record what really happened.', 'Puzzle', 'released', 'https://itch.io/embed-upload/16285724?color=000000', 'https://img.itch.zone/aW1nLzIxODk5ODM4LnBuZw==/original/KH2PCk.png', 'jamwitch, Celia, Rose', 'https://jamwitch.itch.io', 'https://jamwitch.itch.io/the-case-of-the-dungeon-descent', 920, 600),
    ('cat-cheese', 'Cat Cheese', 'Two cats, one cheese, and a lot of mouse clicks.', 'A quick, silly arcade shooter starring two cats, played with the mouse. Keep your aim steady as things speed up.', 'Shooter', 'released', 'https://itch.io/embed-upload/6105007?color=000000', 'https://img.itch.zone/aW1nLzg3ODM5NDcucG5n/original/3LevsZ.png', 'TheSleepyKoala', 'https://chizaruu.itch.io', 'https://chizaruu.itch.io/cat-cheese', 960, 600),
    ('warlords-penance', 'Warlord''s Penance', 'A fast dungeon crawl to rescue your scattered allies.', 'Run through short dungeon floors, free your allies and combine their abilities into a party that hits harder the more of them you save.', 'Action', 'released', 'https://itch.io/embed-upload/16278049?color=000000', 'https://img.itch.zone/aW1nLzI0MjQ5NDE0LnBuZw==/original/gIHeJe.png', 'Zizaco, ognomo', 'https://zizaco.itch.io', 'https://zizaco.itch.io/wl-penance', 960, 540),
    ('death-alley', 'Death Alley', 'Bowl for your life down a deadly lane.', 'Bowling, but your life is on the line. Aim, spin and survive each lane to keep your run going.', 'Sports', 'released', 'https://itch.io/embed-upload/1404506?color=000000', 'https://img.itch.zone/aW1nLzIwNjM1MjkuZ2lm/original/dhD3jj.gif', 'SeaDads, Powerhoof, Kyle Olson', 'https://seadads.itch.io', 'https://seadads.itch.io/death-alley', 980, 620),
    ('self-golf', 'Self Golf', 'A platformer where you are the golf ball.', 'Launch yourself across each course and land in the hole in as few shots as you can. Short levels, tricky bounces.', 'Platformer', 'released', 'https://itch.io/embed-upload/879410?color=000000', 'https://img.itch.zone/aW1hZ2UvMjU1NDMzLzEyMjQyNzAucG5n/original/gRemgX.png', 'Second Dimension Games', 'https://seconddimension.itch.io', 'https://seconddimension.itch.io/self-golf', 856, 482),
    ('roulette-knight', 'Roulette Knight', 'Spin the roulette wheel to decide how your knight fights.', 'Made for Ludum Dare 41, which asked for two genres that do not belong together. Every turn the wheel picks your move, and you plan around the odds.', 'Puzzle', 'released', 'https://itch.io/embed-upload/890491?color=000000', 'https://img.itch.zone/aW1hZ2UvMjUwODk1LzExOTkyNzcuanBn/original/dwZ8%2FZ.jpg', 'Four Quarters team', 'https://fourquarters.itch.io', 'https://fourquarters.itch.io/roulette-knight-ludum-dare-41', 1216, 684),
    ('cell-machine', 'Cell Machine', 'Place cells and watch a tiny machine come to life.', 'A puzzle game about simple rules. Arrange movers, pushers and generators, press play, and get the enemy cells destroyed.', 'Puzzle', 'released', 'https://itch.io/embed-upload/2472216?color=000000', 'https://img.itch.zone/aW1nLzM4NDMyMjkucG5n/original/te9nDu.png', 'Sam Hogan', 'https://samhogan.itch.io', 'https://samhogan.itch.io/cell-machine', 960, 590),
    ('push-the-square', 'Push the square', 'A tiny idle game about pushing one square.', 'Push the square, earn points, buy upgrades so the square pushes itself. A short idle game that reveals more the longer you play.', 'Simulation', 'released', 'https://itch.io/embed-upload/3239511?color=000000', 'https://img.itch.zone/aW1nLzQ4NjU0MzgucG5n/original/rB0iR8.png', 'Raul Moreno Tamayo', 'https://asdehielo.itch.io', 'https://asdehielo.itch.io/push-the-square', 852, 521),
    ('a-simple-survey', 'A Simple Survey', 'Just a simple survey. Definitely nothing to see here.', 'Answer a few harmless questions and see where the survey takes you. Short, funny and full of surprises.', 'Interactive Fiction', 'released', 'https://itch.io/embed-upload/3440642?color=000000', 'https://img.itch.zone/aW1nLzUzMjQ4OTIucG5n/original/ZWjpfP.png', 'BenBonk, Deynum', 'https://benbonk.itch.io', 'https://benbonk.itch.io/a-simple-survey', 1280, 800),
    ('you-are-now-possessed', 'You are now Possessed', 'A puzzle game where you are not always in control.', 'Guide your character through each room while a mischievous spirit keeps taking over. Plan for both of you to reach the exit.', 'Puzzle', 'released', 'https://itch.io/embed-upload/2484693?color=000000', 'https://img.itch.zone/aW1nLzM4ODQ5NzcucG5n/original/9HQnsv.png', 'Lonebot, manfish, Placeholders', 'https://lonebot.itch.io', 'https://lonebot.itch.io/possessed', 960, 640),
    ('welcome-googoo', 'Welcome Googoo', 'Write cute letters to welcome a new friend to town.', 'A wholesome little game made for the Wholesome Games Jam. Visit the villagers, collect words and write invitations to a welcome party.', 'Simulation', 'released', 'https://itch.io/embed-upload/5486220?color=000000', 'https://img.itch.zone/aW1nLzg0NjQxMDYucG5n/original/atBQ2O.png', 'Doot, Blibloop, FishMasterino', 'https://dodoot.itch.io', 'https://dodoot.itch.io/welcome-googoo', 1280, 770),
    ('the-final-earth-2', 'The Final Earth 2', 'Build a futuristic city on a tiny floating world.', 'A city builder in space. Gather resources, house your citizens and research new buildings as your small colony grows into a skyline.', 'Simulation', 'released', 'https://itch.io/embed-upload/1995721?color=000000', 'https://img.itch.zone/aW1nLzIyMTU1NDAucG5n/original/6vGlZe.png', 'Florian van Strien', 'https://flori9.itch.io', 'https://flori9.itch.io/the-final-earth-2', 1024, 600),
    ('wordward-draw', 'WORDWARD DRAW', 'Explore a world made of four-letter words.', 'Change one letter at a time to move between words and reveal the map. A clever, quiet word puzzle by Daniel Linssen.', 'Puzzle', 'released', 'https://itch.io/embed-upload/8411334?color=000000', 'https://img.itch.zone/aW1nLzEyNTY2MDQyLmdpZg==/original/p5j8E4.gif', 'Daniel Linssen', 'https://managore.itch.io', 'https://managore.itch.io/wordward-draw', 960, 540),
    ('last-chess-standing', 'Last Chess Standing', 'Bite-sized chess puzzles for beginners.', 'Capture every other piece until only one is left. Short puzzles that teach how each chess piece moves.', 'Puzzle', 'released', 'https://itch.io/embed-upload/13842985?color=000000', 'https://img.itch.zone/aW1nLzIxMzc2NzE1LnBuZw==/original/61giDu.png', 'FeatureKreep', 'https://featurekreep.itch.io', 'https://featurekreep.itch.io/last-chess-standing', 960, 540),
    ('bag-game', 'bag game', 'Draw from your bag and build the strongest run.', 'A small strategy prototype about luck and planning. Fill your bag, draw from it each turn and make the most of what comes out.', 'Strategy', 'prototype', 'https://itch.io/embed-upload/17395394?color=000000', 'https://img.itch.zone/aW1nLzI3MDM5ODk0LnBuZw==/original/tGrNyo.png', 'foolsroom', 'https://foolsroom.itch.io', 'https://foolsroom.itch.io/bag-game', 1440, 810),
    ('backpack-battles', 'Backpack Battles Demo', 'Pack your bag, craft gear and battle other players.', 'An inventory autobattler. Buy items, fit them into your backpack, combine them into stronger gear and send your hero into fights against other players'' builds.', 'Strategy', 'in_development', 'https://itch.io/embed-upload/9904172?color=000000', 'https://img.itch.zone/aW1nLzE1MTIyNTQwLnBuZw==/original/OC23mx.png', 'PlayWithFurcifer', 'https://playwithfurcifer.itch.io', 'https://playwithfurcifer.itch.io/backpack-battles', 1280, 720),
    ('keylimba', 'Keylimba', 'Turn your keyboard into a kalimba.', 'A tiny music toy. Each key plays a note of the thumb piano, so you can play along with songs or just make something calm.', 'Rhythm', 'released', 'https://itch.io/embed-upload/2487732?color=000000', 'https://img.itch.zone/aW1nLzM4MTk0NjMucG5n/original/yx9omx.png', 'dvdfu', 'https://dvdfu.itch.io', 'https://dvdfu.itch.io/keylimba', 800, 480),
    ('a-keys-path', 'A Key(s) Path', 'Your movement keys are the platforms.', 'A puzzle platformer where the keys you press appear in the level. Use them to climb, block and find a path to the exit.', 'Platformer', 'released', 'https://itch.io/embed-upload/5296582?color=000000', 'https://img.itch.zone/aW1nLzgyMTE2NDUucG5n/original/YNW8rw.png', 'Geegaz', 'https://geegaz.itch.io', 'https://geegaz.itch.io/out-of-controls', 1024, 576),
    ('10-second-mixtape', '10 Second Mixtape', 'Make a ten-second song and share it with other players.', 'Pick instruments, lay down a short loop and add it to a mixtape made by players around the world.', 'Rhythm', 'released', 'https://itch.io/embed-upload/12892095?color=000000', 'https://img.itch.zone/aW1nLzEwMTg4OTA3LnBuZw==/original/4BagjB.png', 'ScotttS, midblue, Rincs', 'https://scottts.itch.io', 'https://scottts.itch.io/10-second-mixtape', 1066, 650),
    ('dualforce-idle', 'DualForce Idle', 'Tower defense where you play both sides.', 'Build towers to defend, then send waves to attack. An idle game that keeps going while you upgrade both armies.', 'Strategy', 'in_development', 'https://itch.io/embed-upload/3116705?color=000000', 'https://img.itch.zone/aW1nLzQ3MzA3NzMuZ2lm/original/UxP7PC.gif', 'nerdError', 'https://nerderror.itch.io', 'https://nerderror.itch.io/dualforce-idle', 960, 640),
    ('dig-dan-dig', 'Dig Dan Dig!', 'Dig deeper, upgrade Dan, escape the underground.', 'An incremental mining game. Break blocks, collect loot and push Dan beyond human limits to reach the surface.', 'Simulation', 'prototype', 'https://itch.io/embed-upload/19087241?color=000000', 'https://img.itch.zone/aW1nLzI5NDY0MTU5LnBuZw==/original/Q%2FVnMK.png', 'Dofu Games', 'https://dofugames.itch.io', 'https://dofugames.itch.io/dig-dan-dig', 1280, 720),
    ('rolldown', 'rolldown', 'A roguelike puzzler about smacking monsters with dice.', 'Roll your dice down the board and line up the numbers to hit the monsters below. Every run brings new dice and new enemies.', 'Puzzle', 'released', 'https://itch.io/embed-upload/6315828?color=000000', 'https://img.itch.zone/aW1nLzk0NzYyMTMucG5n/original/KsoKTA.png', 'kindanice', 'https://kindanice.itch.io', 'https://kindanice.itch.io/rolldown', 960, 640),
    ('smash-n-dab', 'Smash ''n Dab', 'Dad has to impress the teens with his dance moves.', 'A rhythm game with a very determined dad. Hit the beats, pull off the moves and win over a room of rowdy teenagers.', 'Rhythm', 'released', 'https://itch.io/embed-upload/908675?color=000000', 'https://img.itch.zone/aW1nLzE3MTczNzEuZ2lm/original/eXymdf.gif', 'Will Herring', 'https://grey2scale.itch.io', 'https://grey2scale.itch.io/smash-n-dab', 960, 540),
    ('sisao', 'Sisão', 'Is the oasis real, or just a mirage?', 'A small puzzle platformer about a desert traveller and an oasis that might not be real.', 'Platformer', 'prototype', 'https://itch.io/embed-upload/3709742?color=000000', 'https://img.itch.zone/aW1nLzU3NjgwOTIuZ2lm/original/iAdjhI.gif', 'havana24', 'https://havana24.itch.io', 'https://havana24.itch.io/sisao', 800, 480),
    ('lost-in-translation', 'Lost in Translation', 'Learn an alien language one word at a time.', 'Aliens have landed and you are the translator. Work out what their words mean from context and help them get what they need.', 'Puzzle', 'released', 'https://itch.io/embed-upload/6127652?color=000000', 'https://img.itch.zone/aW1nLzkyMzQ0MzcucG5n/original/i4%2BKQ9.png', 'FeatureKreep', 'https://featurekreep.itch.io', 'https://featurekreep.itch.io/lost-in-translation', 960, 540),
    ('backpack-hero', 'Backpack Hero', 'An inventory roguelike: how you pack decides how you fight.', 'Collect rare items, arrange them in your backpack so they boost each other, and fight your way through the dungeon. The browser version is the free demo.', 'Strategy', 'released', 'https://itch.io/embed-upload/6022827?color=000000', 'https://img.itch.zone/aW1nLzE0MDIxNjU2LnBuZw==/original/dRC66W.png', 'Thejaspel, BinaryCounter, GangsRobin', 'https://thejaspel.itch.io', 'https://thejaspel.itch.io/backpack-hero', 1280, 760),
    ('horse-magnifier', 'Horse Magnifier: Jam Edition', 'A game where you magnify horses.', 'Use your magnifying glass to find tiny horses hidden in each scene. Silly, short and surprisingly tricky.', 'Puzzle', 'released', 'https://itch.io/embed-upload/17708498?color=000000', 'https://img.itch.zone/aW1nLzI2MzQ2MTUzLnBuZw==/original/7NLohW.png', 'sketbordcat', 'https://sketbordcat.itch.io', 'https://sketbordcat.itch.io/horse-magnifier', 1280, 720),
    ('prerolled', 'Prerolled', 'Sell silly dice in your cozy shop.', 'Craft and sell dice to quirky customers, upgrade your shop and make a fortune. The browser version is a demo of the full game.', 'Strategy', 'released', 'https://itch.io/embed-upload/20378631?color=000000', 'https://img.itch.zone/aW1nLzMxOTkzNjkwLnBuZw==/original/%2FTszK6.png', 'Jack | Red Sauce Games, Christophe', 'https://red-sauce.itch.io', 'https://red-sauce.itch.io/prerolled', 1152, 648),
    ('boba-simulator', 'Boba Simulator', 'Run a tiny boba tea shop.', 'Set your recipes, buy stock and keep customers happy. A small, cozy shop sim about getting the tea just right.', 'Simulation', 'released', 'https://itch.io/embed-upload/6819770?color=000000', 'https://img.itch.zone/aW1nLzEyMjg5ODY2LnBuZw==/original/1eOBiW.png', 'Cuddle Code', 'https://jetamp.itch.io', 'https://jetamp.itch.io/boba-simulator', 1280, 720),
    ('milki-delivery', 'Milki Delivery Demo', 'Deliver milk around a cozy town by bike.', 'Ride your bike around town and get every bottle of milk delivered. A gentle demo of the full cozy adventure.', 'Adventure', 'released', 'https://itch.io/embed-upload/20253542?color=000000', 'https://img.itch.zone/aW1nLzI3NzA4OTk3LnBuZw==/original/61et7S.png', 'Doot', 'https://dodoot.itch.io', 'https://dodoot.itch.io/milki-delivery-demo', 1280, 760),
    ('unnamed-space-idle', 'Unnamed Space Idle', 'A long idle game that unfolds across space.', 'Humanity is on the run and the fleet needs to grow. Build ships, research upgrades and discover new systems as the game slowly opens up.', 'Simulation', 'in_development', 'https://itch.io/embed-upload/20426604?color=000000', 'https://img.itch.zone/aW1nLzEyODkzMjA5LnBuZw==/original/TY8Enh.png', 'Sylv', 'https://rankith.itch.io', 'https://rankith.itch.io/unnamed-space-idle-prototype', 1600, 900),
    ('killover', 'KILLOVER', 'Shoot your past selves.', 'Every round, your previous attempts come back to fight you. A fast arcade shooter where you are your own toughest enemy.', 'Action', 'released', 'https://itch.io/embed-upload/15331047?color=000000', 'https://img.itch.zone/aW1nLzIyNDgxOTc2LmdpZg==/original/FEA%2FYE.gif', 'Quentin Delvallet', 'https://quentindelvallet.itch.io', 'https://quentindelvallet.itch.io/killover', 1280, 720),
    ('rulehouse', 'Rulehouse', 'Pawn chess where every stage rewrites the rules.', 'Think you know chess? Each room changes how the pieces move. Adapt quickly and outplay the board.', 'Puzzle', 'in_development', 'https://itch.io/embed-upload/19867562?color=000000', 'https://img.itch.zone/aW1nLzMwNjExOTk1LmdpZg==/original/HABfUZ.gif', 'Dalichrome', 'https://dalichrome.itch.io', 'https://dalichrome.itch.io/house-rules', 960, 540),
    ('croquet-conundrum', 'Croquet Conundrum', 'Hit balls through pipes to solve each level.', 'A puzzle game with a croquet mallet. Line up your shots, bounce through pipes and get every ball to its goal.', 'Puzzle', 'in_development', 'https://itch.io/embed-upload/11688854?color=000000', 'https://img.itch.zone/aW1nLzE3NTY0NzAzLnBuZw==/original/%2BgGXVf.png', 'Lummie Thief', 'https://lummie-thief.itch.io', 'https://lummie-thief.itch.io/croquet-conundrum', 1280, 720),
    ('grey-box-testing', 'Grey-Box Testing', 'Exploit the bugs to pass the levels.', 'The game is unfinished on purpose. Find the glitches in each test level and use them to reach the end.', 'Puzzle', 'released', 'https://itch.io/embed-upload/2259008?color=000000', 'https://img.itch.zone/aW1nLzI4OTE4NzMucG5n/original/li0qRU.png', 'Sam Hogan', 'https://samhogan.itch.io', 'https://samhogan.itch.io/grey-box-testing', 960, 640),
    ('cairn', 'Cairn', 'Climb, and leave a path for the players after you.', 'A climbing platformer where every player''s path stays behind. Use the marks left by others to reach the top, then leave your own.', 'Platformer', 'released', 'https://itch.io/embed-upload/7010516?color=000000', 'https://img.itch.zone/aW1nLzk5MDk2MjIucG5n/original/DvS67A.png', 'rubic, torcado, Camelot, Kavol', 'https://rubic.itch.io', 'https://rubic.itch.io/cairn', 960, 640),
    ('cursed-to-golf', 'Cursed to Golf', 'Golf your way out of purgatory.', 'A golf adventure with cards that bend the rules. Reach the hole within your shot limit or start the course again.', 'Sports', 'in_development', 'https://itch.io/embed-upload/2551753?color=000000', 'https://img.itch.zone/aW1nLzM5MDM2NTEucG5n/original/VfZgXs.png', 'LiamBME', 'https://liamedwards.itch.io', 'https://liamedwards.itch.io/cursed-to-golf', 1600, 900),
    ('tiny-islands', 'Tiny Islands', 'Draw cards and draw your map.', 'Each card you draw tells you what to add to your island map. Place everything carefully to score as many points as you can.', 'Puzzle', 'released', 'https://itch.io/embed-upload/3140171?color=000000', 'https://img.itch.zone/aW1nLzI2NzY1ODguZ2lm/original/bfQnv2.gif', 'David King Made Some Games', 'https://dr-d-king.itch.io', 'https://dr-d-king.itch.io/tiny-islands', 975, 555),
    ('gacha', 'Gacha', 'Spin the capsule machine and see where life takes you.', 'Every capsule holds a small moment of life. Spin, collect and piece together a story one prize at a time.', 'Simulation', 'released', 'https://itch.io/embed-upload/1412917?color=000000', 'https://img.itch.zone/aW1nLzIwNjQzNTkucG5n/original/GBzcHo.png', 'zmcn, Jewell', 'https://zmcn.itch.io', 'https://zmcn.itch.io/gacha', 980, 560),
    ('kraft-slash', 'Kraft & Slash', 'Craft your weapon, then fight with it.', 'Craft a weapon, then take it into battle. What you build decides how you fight.', 'Adventure', 'released', 'https://itch.io/embed-upload/14904819?color=000000', 'https://img.itch.zone/aW1nLzIzNTk5MzkuZ2lm/original/FI4QUq.gif', 'Pure Jam Games, Kotocca, A Good Wobble', 'https://purejamgames.itch.io', 'https://purejamgames.itch.io/kraft-slash', 960, 586),
    ('cardinal-chains', 'Cardinal Chains', 'Draw chains where every number goes up or stays the same.', 'An original logic puzzle. Fill the grid with chains whose numbers never go down. Simple rules that get surprisingly deep.', 'Puzzle', 'released', 'https://itch.io/embed-upload/15250508?color=000000', 'https://img.itch.zone/aW1nLzY3MDMyMDIucG5n/original/B%2FQoJW.png', 'Daniel Nora', 'https://danijmn.itch.io', 'https://danijmn.itch.io/cardinalchains', 816, 466),
    ('the-legend-of-lumina', 'The Legend of Lumina', 'Explore a small world and solve its puzzles.', 'A top-down puzzle adventure. Explore a quiet green world, solve its puzzles and uncover its secrets.', 'Adventure', 'released', 'https://itch.io/embed-upload/10877122?color=000000', 'https://img.itch.zone/aW1nLzg0NDAzOTEucG5n/original/DGBzC5.png', 'Wizbane', 'https://wizbane.itch.io', 'https://wizbane.itch.io/the-legend-of-lumina', 1024, 576),
    ('shrines-of-wrath', 'Shrines of Wrath', 'Spread the corruption from shrine to shrine.', 'A small strategy prototype. Spread your corruption across the land, one shrine at a time.', 'Strategy', 'prototype', 'https://itch.io/embed-upload/15519262?color=000000', 'https://img.itch.zone/aW1nLzIzODQxNDk2LnBuZw==/original/slo5%2FZ.png', 'Barribob', 'https://barribob.itch.io', 'https://barribob.itch.io/shrines-of-wrath', 1280, 720),
    ('the-last-spire', 'The Last Spire', 'Protect the last spire in an incremental tower defense.', 'Defend your tower against endless waves, spend what you earn on upgrades and push further with every run.', 'Strategy', 'released', 'https://itch.io/embed-upload/15210531?color=000000', 'https://img.itch.zone/aW1nLzIyMTAxMjc2LnBuZw==/original/6hOccj.png', 'ome6a1717', 'https://ome6a1717.itch.io', 'https://ome6a1717.itch.io/the-last-spire', 1366, 768),
    ('rubblar', 'Rubblar', 'A frantic robbing game you can rewind.', 'Grab the loot and escape. When it goes wrong, rewind time and try a smarter route.', 'Action', 'released', 'https://itch.io/embed-upload/6952255?color=000000', 'https://img.itch.zone/aW1nLzEwNjkwODEzLnBuZw==/original/mG163Z.png', 'Sander Vanhove, Heytibo', 'https://sandervanhove.itch.io', 'https://sandervanhove.itch.io/rubblar', 1024, 600),
    ('apollo', 'APOLLO', 'A short, cute platformer.', 'Run, jump and explore a small, colourful world. A quick platformer you can finish in one sitting.', 'Platformer', 'released', 'https://itch.io/embed-upload/10071061?color=000000', 'https://img.itch.zone/aW1nLzE1NTk2ODAyLnBuZw==/original/Xxyobx.png', 'Daniel Moreno, Paltian', 'https://daz.itch.io', 'https://daz.itch.io/apollo', 768, 432),
    ('one-day-better', 'One Day Better', 'Lift your friend out of the dark, one day at a time.', 'A short platformer that won the GMTK Game Jam 2023. Two friends take turns helping each other through cold, lonely days.', 'Platformer', 'released', 'https://itch.io/embed-upload/8272416?color=000000', 'https://img.itch.zone/aW1nLzEyNzMyODkwLnBuZw==/original/%2BQmimZ.png', 'Aquanoctis', 'https://aquanoctis.itch.io', 'https://aquanoctis.itch.io/onedaybetter', 1280, 720),
    ('penguin-farm', 'Penguin Farm Demo', 'Catch fish and raise a colony of penguins.', 'Fish through the ice, feed your penguins and expand your snowy farm. A cozy demo of the full game.', 'Simulation', 'in_development', 'https://itch.io/embed-upload/18846474?color=000000', 'https://img.itch.zone/aW1nLzI3MzE3MzYwLnBuZw==/original/nDcxk%2F.png', 'FunB4nan', 'https://funbanan.itch.io', 'https://funbanan.itch.io/penguin-farm', 960, 540),
    ('bullet-bunny', 'Bullet Bunny', 'A roguelike twin-stick shooter starring a bunny.', 'Move with the keyboard, aim with the mouse and blast through rooms of enemies. Each run brings new upgrades.', 'Shooter', 'released', 'https://itch.io/embed-upload/8618172?color=000000', 'https://img.itch.zone/aW1nLzExNzcwNzA1LnBuZw==/original/X6x03Z.png', 'Penusbmic', 'https://penusbmic.itch.io', 'https://penusbmic.itch.io/bullet-bunny', 960, 540),
    ('dodge-and-slash', 'dodge&slash', 'A bullet hell where your mouse is the sword.', 'Weave through bullets and slash enemies with quick mouse moves. Easy to start, hard to survive for long.', 'Action', 'released', 'https://itch.io/embed-upload/7120741?color=000000', 'https://img.itch.zone/aW1nLzEwOTcwMzgxLnBuZw==/original/hgvudo.png', 'kindanice', 'https://kindanice.itch.io', 'https://kindanice.itch.io/dodge-and-slash', 960, 540),
    ('ducklings', 'Ducklings', 'Quack. You are a duck. Go rescue the ducklings.', 'Swim around a big pond, find lost ducklings and bring them home. Spend what you earn on upgrades for your next swim.', 'Adventure', 'released', 'https://itch.io/embed-upload/1662039?color=000000', 'https://img.itch.zone/aW1nLzI1MDc0MzUuZ2lm/original/vGIg40.gif', 'Pelican Party', 'https://pelicanparty.itch.io', 'https://pelicanparty.itch.io/ducklings', 920, 600),
    ('it-aint-over-till-the-fat-lady-sings', 'It ain''t over till the fat lady sings', 'A tiny interactive short about a song that is not over yet.', 'A short, playful piece by timgarbos. Click around and see where it goes.', 'Interactive Fiction', 'released', 'https://itch.io/embed-upload/241259?color=000000', 'https://img.itch.zone/aW1hZ2UvNzUzMjQvMzU0NDI2LmdpZg==/original/Y2k%2FUG.gif', 'timgarbos', 'https://timgarbos.itch.io', 'https://timgarbos.itch.io/it-aint-over-till-the-fat-lady-sings', 960, 540),
    ('break-the-tower', 'Break The Tower', 'Break the tower. Or fall trying.', 'A brick-breaking platformer. Bounce the ball up the tower, smash every block and keep yourself from falling.', 'Platformer', 'released', 'https://itch.io/embed-upload/13325223?color=000000', 'https://img.itch.zone/aW1nLzIwNjM0NzcwLnBuZw==/original/R6Vgmn.png', 'torcado', 'https://torcado.itch.io', 'https://torcado.itch.io/break-the-tower', 1152, 768),
    ('rat-king', 'Rat King', 'A turn-based puzzle about a rat and another rat.', 'Two rats, two boards, one set of moves. Plan every step so both of them stay alive and reach the goal.', 'Puzzle', 'in_development', 'https://itch.io/embed-upload/14948709?color=000000', 'https://img.itch.zone/aW1nLzIyMTExNzI4LnBuZw==/original/1Tzz9y.png', 'torcado', 'https://torcado.itch.io', 'https://torcado.itch.io/rat-king', 1620, 900),
    ('furcifers-fungeon', 'Furcifer''s Fungeon', 'A loot-hungry dungeon crawler roguelite.', 'Dive into the dungeon, grab loot and build your character with every run. Fast action from the makers of Backpack Battles.', 'Action', 'in_development', 'https://itch.io/embed-upload/8189862?color=000000', 'https://img.itch.zone/aW1nLzEwNjk4NTQzLnBuZw==/original/fghYwT.png', 'PlayWithFurcifer', 'https://playwithfurcifer.itch.io', 'https://playwithfurcifer.itch.io/furcifers-fungeon', 1280, 720),
    ('butler-summon-the-imps', 'Butler! Summon the Imps!', 'Match imps fast in an arcade puzzle.', 'An arcade puzzle about summoning imps. Match them in groups before the board fills up.', 'Puzzle', 'released', 'https://itch.io/embed-upload/10210664?color=000000', 'https://img.itch.zone/aW1nLzE1NzgxOTg5LnBuZw==/original/mwfggX.png', 'moonlightjammers, npckc, DonutShoes, HVB, chunderfins, NomnomNami, Miragey', 'https://moonlightjammers.itch.io', 'https://moonlightjammers.itch.io/butler-summon-the-imps', 960, 540),
    ('rogue-fable-iv', 'Rogue Fable IV', 'A classic turn-based roguelike in your browser.', 'Descend through randomly generated dungeons and fight monsters one careful turn at a time.', 'Role Playing', 'in_development', 'https://itch.io/embed-upload/9512760?color=000000', 'https://img.itch.zone/aW1nLzE0MjMyMDgwLnBuZw==/original/CF5oQE.png', 'Justin Wang', 'https://justin-wang123.itch.io', 'https://justin-wang123.itch.io/rogue-fable-iv', 1280, 720),
    ('a-very-small-seed', 'A very small seed', 'Two tiny creatures and the seed they found.', 'Help a pair of little creatures carry their seed past the obstacles in their way. Comes in a jam version and an improved version.', 'Adventure', 'released', 'https://itch.io/embed-upload/11790464?color=000000', 'https://img.itch.zone/aW1nLzE4MDcwNzYxLnBuZw==/original/Fow3u6.png', 'vidarn', 'https://vidarn.itch.io', 'https://vidarn.itch.io/a-very-small-seed', 1067, 600),
    ('abattlacus', 'Abattlacus', 'An abacus autobattler roguelike.', 'Set up your beads on an abacus, then watch them battle. A small, strange roguelike prototype.', 'Strategy', 'prototype', 'https://itch.io/embed-upload/19910716?color=000000', 'https://img.itch.zone/aW1nLzMxMTE1MjMzLnBuZw==/original/d3Kkz%2B.png', 'FunB4nan', 'https://funbanan.itch.io', 'https://funbanan.itch.io/abattlacus', 1280, 720),
    ('loud-heist-tiny-ghost', 'Loud Heist Tiny Ghost', 'Pull off the loudest heist a tiny ghost has ever tried.', 'Short puzzle levels about a very small ghost pulling off a very loud heist. Plan your route and grab the loot.', 'Puzzle', 'released', 'https://itch.io/embed-upload/13359420?color=000000', 'https://img.itch.zone/aW1nLzIwNjk1NTM0LnBuZw==/original/4KZVn1.png', 'Christophe', 'https://qaqelol.itch.io', 'https://qaqelol.itch.io/loud-heist-tiny-ghost', 1152, 648),
    ('kaaarot', 'Kaaarot', 'Eat the carrot, then eat your friends.', 'A quick online party game with rabbits. Grab carrots to grow, then chase down other players before they get you.', 'Action', 'released', 'https://itch.io/embed-upload/6597391?color=000000', 'https://img.itch.zone/aW1nLzEwNDIyNjQ1LnBuZw==/original/VCi7TF.png', 'Lambda Humans', 'https://lambdahumans.itch.io', 'https://lambdahumans.itch.io/kaaarot', 1240, 740),
    ('i-am-still-here', 'i am still here', 'A small story about ghosts, places and people.', 'A quiet, short story game made with Bitsy. Walk around, read and remember.', 'Interactive Fiction', 'released', 'https://itch.io/embed-upload/8547320?color=000000', 'https://img.itch.zone/aW1nLzg3NjA2NTcucG5n/original/5cPxTQ.png', 'haraiva', 'https://haraiva.itch.io', 'https://haraiva.itch.io/i-am-still-here', 1080, 640),
    ('sushi-for-robots', 'Sushi For Robots', 'Run the first conveyor-belt sushi bar for robots.', 'A chill puzzle game. Route each dish around the belt so every robot customer gets a plate that matches its colour.', 'Puzzle', 'released', 'https://itch.io/embed-upload/2797508?color=000000', 'https://img.itch.zone/aW1nLzQzNTEzMjMuZ2lm/original/uDNp5l.gif', 'Ludipe', 'https://ludipe.itch.io', 'https://ludipe.itch.io/sushi-for-robots-prototype', 1280, 720),
    ('tres-undos', 'Tres Undos', 'A box-pushing puzzle where your undos travel in time.', 'A Sokoban puzzle with a twist: undoing a move sends a copy of you back in time. Use your past selves to solve each room.', 'Puzzle', 'released', 'https://itch.io/embed-upload/4702733?color=000000', 'https://img.itch.zone/aW1nLzgwODg2NjMuZ2lm/original/lI2lRU.gif', 'knexator', 'https://knexator.itch.io', 'https://knexator.itch.io/tres-undos', 1152, 648),
    ('night-flyer', 'Night Flyer: A Bat''s Journey', 'Grow up as a young bat while your world disappears.', 'Fly through the forest, find food and survive as a young bat in a changing world. Plays with the keyboard.', 'Adventure', 'in_development', 'https://itch.io/embed-upload/8140236?color=000000', 'https://img.itch.zone/aW1nLzMzMjI1MTcuZ2lm/original/twxLat.gif', 'Mike Ren', 'https://mikeyren.itch.io', 'https://mikeyren.itch.io/nightflyer', 1024, 576),
    ('genre-hopper', 'Genre Hopper', 'The genre keeps changing, and so do the rules.', 'One moment it is a platformer, the next it is something else entirely. Adapt fast and keep up as the game swaps genres on you.', 'Action', 'released', 'https://itch.io/embed-upload/2471235?color=000000', 'https://img.itch.zone/aW1nLzM4OTIwOTMuZ2lm/original/fyp90w.gif', 'Fish Mug Games, tomcheshire, seanrugg', 'https://fishmug.itch.io', 'https://fishmug.itch.io/genre-hopper', 1000, 562),
    ('shadeshift', 'Shadeshift', 'Shift between light and shadow to find the way.', 'A puzzle platformer where light and shadow change what is solid. Switch between them to climb through each level.', 'Puzzle', 'released', 'https://itch.io/embed-upload/5939292?color=000000', 'https://img.itch.zone/aW1nLzgyNTY5MDMuZ2lm/original/xFbzLY.gif', 'Lunasii, Berriis', 'https://lunasii.itch.io', 'https://lunasii.itch.io/shadeshift', 1280, 720),
    ('interdimensional-spike', 'Interdimensional Spike', 'A tiny platformer made for the Nokia 3310 Jam.', 'Two-colour graphics, a small screen and a lot of spikes. A short retro platformer in the style of an old Nokia phone.', 'Platformer', 'released', 'https://itch.io/embed-upload/1942881?color=000000', 'https://img.itch.zone/aW1nLzI5NjU2MDUucG5n/original/GpPIan.png', 'yaotu', 'https://yaotu.itch.io', 'https://yaotu.itch.io/interdimensional-spike', 840, 480),
    ('radio-farm', 'RADIO FARM', 'Make a little magic on a farm in Gravel County.', 'A small, strange farming game. Take a stroll, tend your patch and tune in to what the radio has to say.', 'Simulation', 'released', 'https://itch.io/embed-upload/16031460?color=000000', 'https://img.itch.zone/aW1nLzI0NzkxMjE1LnBuZw==/original/81fVTx.png', 'SAMANTHA TOEMAN', 'https://burrowbling.itch.io', 'https://burrowbling.itch.io/radio-farm', 816, 432)
),
new_projects as (
  insert into public.projects (
    owner_id, title, slug, tagline, description, genre, classification, kind, release_status,
    pricing_type, community, contains_ai, play_url, embeddable, cover_path, published
  )
  select
    public.curated_owner_id(), s.title, s.slug, s.tagline, s.description, s.genre, 'game', 'external', s.release_status,
    'no_payments', 'disabled', null, s.play_url, true, s.cover_path, true
  from seed s
  on conflict (owner_id, slug) do nothing
  returning id, slug
)
insert into public.project_curation (project_id, status, play_mode, creator_name, creator_url, source_url, license, frame_width, frame_height)
select p.id, 'listed', 'embed', s.creator_name, s.creator_url, s.source_url, 'Link only', s.w, s.h
from new_projects p
join seed s on s.slug = p.slug
on conflict (project_id) do nothing;
