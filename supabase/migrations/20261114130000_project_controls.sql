-- How each game is controlled (#38) -----------------------------------------------------------
-- Feeds the Phone and Desktop chips on the homepage (lib/device.ts):
--   Phone   = supports touch, or only needs a mouse (a tap acts as a click)
--   Desktop = keyboard, mouse or gamepad, or not checked yet
-- An empty list means nobody has checked the game yet. Admins and creators set it in the game form.

alter table public.projects
  add column if not exists controls text[] not null default '{}';

alter table public.projects
  drop constraint if exists projects_controls_check;

alter table public.projects
  add constraint projects_controls_check check (controls <@ array['touch', 'keyboard', 'mouse', 'gamepad']::text[]);

-- Curated games, from each game's itch.io page (the "Inputs" field, or its description when the field
-- is missing). Checked on 2026-11-14. Game Jolt games and creators' own games stay unchecked.
-- Only rows still unchecked are touched, so this never overwrites a value an admin already set.

update public.projects set controls = array['keyboard', 'mouse']::text[]
where controls = '{}' and id in (
  'b10e9040-d52b-413a-a572-04d9d5d768c4', -- A Key(s) Path
  '5d6a1712-3590-4265-a39f-af24fd45f559', -- Backpack Hero
  '2730f7b8-02f3-4d7f-917e-793376238107', -- Bullet Bunny
  'd6400224-ba3f-4cf5-bf69-a8b74cd30c63', -- Cozy Coco Catcher
  '7eaf5057-40d4-444f-b451-3694d87d1815', -- Croquet Conundrum
  '6c73b101-09ff-4a52-b099-615cd5e5bc84', -- Cursed to Golf
  'd889bf0a-7858-4bfb-8bf3-dbcd069bd513', -- Deepest Sword
  'fac57665-e690-4931-a264-231b96e5517c', -- Defentures
  'b17fa190-ae6d-4c24-84c7-22e44d71a066', -- Dig Dan Dig!
  'cba670d8-7f34-449c-87f9-035deb8da160', -- Grey-Box Testing
  '2fabdb1f-5eaa-4e18-9dcb-6fa2cd91158c', -- i am still here
  'edb0a6ca-e94e-4e3b-b404-6f462fabc5cb', -- KILLOVER
  'd9f7809d-78d0-4c3b-80c2-ad1cfd4e5a27', -- Lo-Fi Room
  '8d8c9a06-f189-45e2-b96f-d2d7a719609b', -- Lost in Translation
  '216811c3-7898-4b35-90bf-8f522597a084', -- Peggy's Post
  'd0310f1d-5778-4ac5-85d6-2dfaf636dc6a', -- Penguin Farm Demo
  '1be2eb27-fddb-4632-81e8-6ce54d8e40ca', -- RADIO FARM
  'e4b6b736-29ce-43b1-9863-4aa6289ecb8c', -- Rat King
  '9b7c5e06-e4eb-435b-b454-c81e07bfb83c', -- Red Handed
  '91d08799-9f2e-4de8-a935-a4de2b0511d4', -- Rulehouse
  '251bcf79-564a-4aa5-bcab-203c159e5606', -- Self Golf
  'aa57d9a7-f6a2-4c69-99a3-a91bbb92cdbc', -- Shadeshift
  '32828471-012b-431d-9202-357bb891945d', -- Tiny Islands
  '2216d7fd-26b7-462b-8d76-41d81cb3af7b', -- Townseek
  '5b494d6e-18c4-476d-9083-9b4de5d5b077', -- Treasure Arena
  'dfbdcdc1-2825-49f4-a478-9bd772fa8d2c' -- Warlord's Penance
);

update public.projects set controls = array['mouse']::text[]
where controls = '{}' and id in (
  '9cec62c9-0d26-4c7f-9c5f-9cc9db2641b5', -- A Simple Survey
  '80559263-bd9c-466d-8732-8d60f532bd03', -- Abattlacus
  '4fc7cd39-32ac-4840-b529-9388c1ef722b', -- Boba Simulator
  '94d2a902-0361-4ab9-a565-921c74c4af79', -- Break The Tower
  '8f71f43f-27f3-498f-9a0c-fa072a489c54', -- Die in the Dungeon CLASSIC
  '3f0c34ed-6473-408a-aa8a-736db01deb8c', -- dodge&slash
  '1737af0e-14c8-43bf-a8f4-57d4d80d0c5d', -- DualForce Idle
  'a92bcaac-b01e-431b-b2f6-5eb89155cff2', -- good morning!
  'ff469725-af9d-49a3-9bbe-076fe4cdc58e', -- Idle Breakout
  '98adcfdf-d8a3-4754-b40a-19f007db4671', -- It ain't over till the fat lady sings
  '4bcb13d4-a23c-4d9b-99dd-6e3c08e0d0b5', -- Kraft & Slash
  'd796a57c-e36b-4294-a1a0-67917f98ffd5', -- Last Chess Standing
  'd362b16a-ee73-49de-80f2-ce6edf11f326', -- Little Chef: Prototype
  'd2b8d4c9-90fd-410f-9622-130ac1844438', -- Pack
  '1aca60d5-fb47-4fc5-a6da-260ff4eea94e', -- plant daddy
  '6b78c91e-cb16-4c38-908d-1befa19a6595', -- Prerolled
  'd569dfd3-96db-4e6f-aa8d-da6e8eb51098', -- Rubblar
  '99f5e194-5fb2-4d07-8fc0-2ecc929c7f61', -- Six Cats Under
  '4b9f05fd-3dfe-4956-853c-76f6228198e2', -- Stealth Crossword
  'd397a34b-60a9-4499-8173-12a02777f4e9', -- Sushi For Robots
  '25de6d92-c3f9-4bc2-9f15-86cfa518c73a', -- The Case of the Dungeon Descent
  'e489d1b7-62f4-4e79-8ad9-1bd4db57b3b9', -- The Last Spire
  '6dde0774-8815-4958-b876-f789c55fae2e', -- The Roottrees are Dead
  'd7df99f1-e57a-4f51-bb9b-40d6d716484b', -- TRACE
  'f7c8ebac-96fd-4975-adab-301ea6f0db2d', -- Unnamed Space Idle
  'c25a4ced-93f3-44de-b4f8-89b8ac18c427' -- Waterworks!
);

update public.projects set controls = array['keyboard']::text[]
where controls = '{}' and id in (
  '8772ecba-6410-4d78-bef5-85f108a1065e', -- APOLLO
  'c0bbc15f-e78d-4d0a-a6f5-ff5e9b1e9c0d', -- Butler! Summon the Imps!
  '1c488abe-340b-4dd4-a527-2b7bc06f02bb', -- Cairn
  '9002892a-ed39-4965-9082-0594b72ce176', -- Genre Hopper
  'cae17b84-77bf-473d-9e7c-37771cdfa809', -- Interdimensional Spike
  '986921ed-a900-42ab-ac53-cc6e96dd03b5', -- Kaaarot
  'dac4adaf-1a1a-47af-8433-b232d44eb2da', -- rolldown
  'b69ed325-4216-4f45-9565-b0b43a2a29c5', -- Sisão
  '69bf23d4-9a64-4785-9a8d-8aa1f307e32c', -- The Last Guardian
  'e229b67e-b48a-4ced-b3db-ab1d239c3c5b', -- Tres Undos
  '4fc8bbdf-f941-4dca-8e04-728092706062' -- You are now Possessed
);

update public.projects set controls = array['keyboard', 'gamepad']::text[]
where controls = '{}' and id in (
  '05a8c3c3-dc0b-4879-94f0-9a7ad8682395', -- Aground
  '02243844-102b-4dda-a6e3-8f35cefcac40', -- Death Alley
  '162b0807-6605-44d0-8f77-16f14f9c68e1', -- Friday Night Funkin'
  '53e21e49-d482-4333-807a-8c57365fdb2d', -- Generic Fighter Maybe
  'c6d97860-b7b6-4401-8c09-b2cac72ef7c3' -- Tanuki Sunset Classic
);

update public.projects set controls = array['touch', 'keyboard', 'mouse']::text[]
where controls = '{}' and id in (
  '7f61d7e1-3e4f-40ac-848c-ce15911d099b', -- Keylimba
  '79f1c708-8f65-45cb-9807-cf92dc6698be', -- Loud Heist Tiny Ghost
  '83bed57a-6a0e-4e27-bc81-8111aa73d3eb', -- Night Flyer: A Bat's Journey
  'ad682184-849b-4fc7-9c51-bbb2b6c008b0' -- The Legend of Lumina
);

update public.projects set controls = array['touch', 'mouse']::text[]
where controls = '{}' and id in (
  'b60262a0-c7fc-4d05-aef8-96717aa5c607', -- A very small seed
  'eda2056a-5f4d-48cd-af12-e01df54aa534', -- Cardinal Chains
  'd94b87cd-44a4-478c-9ab7-931c8ba66855', -- Cat Cheese
  '4219f44b-9b0e-41a1-8494-813efbfc9387' -- The Final Earth 2
);

update public.projects set controls = array['keyboard', 'mouse', 'gamepad']::text[]
where controls = '{}' and id in (
  '9d6b94f1-289b-4f42-8eb3-bf520575e592', -- Furcifer's Fungeon
  '1c09ecfb-9d47-4163-b4b6-04b718ecb4c8', -- Platformer Toolkit
  'a257ff64-a1eb-4179-aab8-1316e87a851a' -- Sort the Court!
);

update public.projects set controls = array['gamepad']::text[]
where controls = '{}' and id in (
  'ab6455df-8754-4613-9182-617e2053a10d', -- Catty Shack
  '15ba2dfc-7e8e-4ac0-95aa-08efd25501a6' -- Knightin'+ Demo
);

update public.projects set controls = array['touch', 'keyboard', 'mouse', 'gamepad']::text[]
where controls = '{}' and id in (
  '81e2ffd6-550e-44c1-8f4c-418e516512ff', -- Mars Underground
  '23941d0d-7075-42ff-a0c6-bab92f803903' -- Vampire Survivors
);

