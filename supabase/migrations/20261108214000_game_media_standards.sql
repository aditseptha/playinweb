-- Landscape cover stays in cover_path. Portrait, the uncropped original, and the focus point
-- let cards crop 16:9 and 3:4 without cutting off the subject. Old rows default to a center focus.

alter table public.projects
  add column if not exists cover_portrait_path text,
  add column if not exists cover_original_path text,
  add column if not exists preview_clip_path text,
  add column if not exists cover_focal_x double precision not null default 0.5,
  add column if not exists cover_focal_y double precision not null default 0.5;

alter table public.projects drop constraint if exists projects_cover_focal_check;
alter table public.projects
  add constraint projects_cover_focal_check check (
    cover_focal_x between 0 and 1 and cover_focal_y between 0 and 1
  );

alter table public.project_screenshots
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists kind text not null default 'image';

alter table public.project_screenshots drop constraint if exists project_screenshots_kind_check;
alter table public.project_screenshots
  add constraint project_screenshots_kind_check check (kind in ('image', 'gif', 'clip'));

update public.projects
set cover_focal_x = 0.5, cover_focal_y = 0.5
where cover_focal_x is null or cover_focal_y is null;
