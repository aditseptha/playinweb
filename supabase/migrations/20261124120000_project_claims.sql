-- Claim requests (#30, PR 0) ----------------------------------------------------------------------
-- A creator who finds their own game among the curated ones asks for it here, instead of sending a
-- free-text report. An admin approves the claim (the game moves to the claimant's account with its
-- plays, likes and address) or rejects it with a reason.
--
-- 1. project_claims holds one row per request. It stays pending until an admin decides.
-- 2. submit_claim(pid, evidence) is the claimant's only way to add a request. It marks the game
--    claim_pending.
-- 3. admin_decide_claim(claim, approve, note) moves the game on approval, or puts it back to listed
--    when nobody else is waiting. The slug redirect trigger keeps the old /listed/{slug} address
--    working, and the badge triggers give the claimant their Claimed badge.
--
-- Safe to run twice.

-- 1. Requests -------------------------------------------------------------------------------------

create table if not exists public.project_claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  claimant_id uuid not null references public.profiles (id) on delete cascade,
  -- The claimant's sign-in email when they sent it, so an admin can reply.
  email text not null default '',
  evidence text not null,
  status text not null default 'pending',
  decision_note text,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint project_claims_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint project_claims_evidence_len check (char_length(evidence) between 10 and 2000),
  constraint project_claims_note_len check (decision_note is null or char_length(decision_note) <= 1000)
);

create index if not exists project_claims_project_idx on public.project_claims (project_id);
create index if not exists project_claims_claimant_idx on public.project_claims (claimant_id);
-- One open request per person per game.
create unique index if not exists project_claims_one_pending
  on public.project_claims (project_id, claimant_id) where status = 'pending';

alter table public.project_claims enable row level security;

-- Claimants see their own requests (the game page shows "claim sent"); admins see all of them.
drop policy if exists project_claims_select on public.project_claims;
create policy project_claims_select on public.project_claims
  for select to authenticated
  using (claimant_id = (select auth.uid()) or public.is_admin());

grant select on public.project_claims to authenticated;
-- No insert, update or delete grants: every write goes through the functions below.

-- 2. Sending a claim ------------------------------------------------------------------------------

create or replace function public.submit_claim(pid uuid, p_evidence text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  ev text := trim(coalesce(p_evidence, ''));
  claim_id uuid;
begin
  if uid is null then
    raise exception 'sign in to claim a game';
  end if;
  if uid = public.curated_owner_id() or not exists (select 1 from public.profiles where id = uid) then
    raise exception 'not allowed';
  end if;
  if char_length(ev) < 10 then
    raise exception 'tell us how we can confirm the game is yours';
  end if;
  if not exists (
    select 1
    from public.projects p
    join public.project_curation c on c.project_id = p.id
    where p.id = pid and p.owner_id = public.curated_owner_id() and c.status in ('listed', 'claim_pending')
  ) then
    raise exception 'this game cannot be claimed';
  end if;
  if exists (select 1 from public.project_claims where project_id = pid and claimant_id = uid and status = 'pending') then
    raise exception 'you already have a claim waiting for this game';
  end if;
  -- A real creator rarely has more than a few games here; this stops someone claiming everything.
  if (select count(*) from public.project_claims where claimant_id = uid and status = 'pending') >= 5 then
    raise exception 'you have too many claims waiting; we will answer those first';
  end if;

  insert into public.project_claims (project_id, claimant_id, email, evidence)
  values (pid, uid, coalesce((select auth.jwt() ->> 'email'), ''), left(ev, 2000))
  returning id into claim_id;

  update public.project_curation set status = 'claim_pending' where project_id = pid and status = 'listed';
  return claim_id;
end;
$$;

revoke all on function public.submit_claim(uuid, text) from public;
grant execute on function public.submit_claim(uuid, text) to authenticated;

-- 3. Deciding a claim -----------------------------------------------------------------------------

create or replace function public.admin_decide_claim(p_claim uuid, p_approve boolean, p_note text default null)
returns table (owner_handle text, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.project_claims%rowtype;
  game public.projects%rowtype;
  note text := nullif(trim(coalesce(p_note, '')), '');
  next_slug text;
  n int := 1;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select * into c from public.project_claims where id = p_claim for update;
  if not found then
    raise exception 'claim not found';
  end if;
  if c.status <> 'pending' then
    raise exception 'this claim was already decided';
  end if;

  if not p_approve then
    update public.project_claims
    set status = 'rejected', decision_note = left(note, 1000), decided_by = (select auth.uid()), decided_at = now()
    where id = c.id;
    -- Back to listed, unless someone else is still waiting.
    update public.project_curation
    set status = 'listed'
    where project_id = c.project_id
      and status = 'claim_pending'
      and not exists (select 1 from public.project_claims where project_id = c.project_id and status = 'pending');
    return;
  end if;

  select * into game from public.projects where id = c.project_id for update;
  if game.owner_id is distinct from public.curated_owner_id() then
    raise exception 'this game is no longer a curated game';
  end if;

  -- Keep the game's slug unless the claimant already has a game with it; then add -2, -3, ...
  -- Slugs are at most 48 characters (projects_slug_format).
  next_slug := game.slug;
  while exists (select 1 from public.projects where owner_id = c.claimant_id and projects.slug = next_slug) loop
    n := n + 1;
    next_slug := left(game.slug, 48 - 1 - char_length(n::text)) || '-' || n;
  end loop;

  -- Comments open now that the creator owns it. Donations stay as they are until the creator turns them on.
  update public.projects
  set owner_id = c.claimant_id, slug = next_slug, community = 'comments'
  where id = game.id;

  update public.project_curation set status = 'claimed', claimed_at = now() where project_id = game.id;

  update public.project_claims
  set status = 'approved', decision_note = left(note, 1000), decided_by = (select auth.uid()), decided_at = now()
  where id = c.id;

  update public.project_claims
  set status = 'rejected', decision_note = 'Another claim for this game was approved.',
      decided_by = (select auth.uid()), decided_at = now()
  where project_id = game.id and status = 'pending';

  return query select pr.handle, next_slug from public.profiles pr where pr.id = c.claimant_id;
end;
$$;

revoke all on function public.admin_decide_claim(uuid, boolean, text) from public;
grant execute on function public.admin_decide_claim(uuid, boolean, text) to authenticated;
