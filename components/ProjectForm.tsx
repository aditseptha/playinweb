"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { FormSkeleton } from "@/components/ds/skeleton";
import { EmptyState } from "@/components/ds/empty-state";
import { Button as DsButton } from "@/components/ds/button";
import { useLoginDialog } from "@/components/LoginDialog";
import { BuildFields } from "@/components/project-form/BuildFields";
import { CurationFields, type CurationDraft } from "@/components/project-form/CurationFields";
import f from "@/components/project-form/form.module.css";
import { MediaAside, type MediaHandle } from "@/components/project-form/MediaAside";
import {
  asCommunity,
  asKind,
  isHttpUrl,
  MAX_FILE,
  MAX_TAGS,
  saveErrorMessage,
  SelectField,
} from "@/components/project-form/shared";
import { useSignupDialog } from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { isFeaturePubliclyEnabled, useFeature } from "@/lib/features";
import { cn } from "@/lib/cn";
import { CURATION_LICENSES, FRAME_MAX, FRAME_MIN, LINK_OUT_LICENSE, isOfficialEmbedUrl, validFrameSize } from "@/lib/curation";
import type { Database } from "@/lib/database.types";
import { slugify } from "@/lib/format";
import { taglineFrom, type LinkPreview } from "@/lib/link-preview";
import { apexHref, apexOrigin, isSlug, projectPublicUrl } from "@/lib/host";
import {
  contentType,
  filesFromHtmlUpload,
  hostedPlayPath,
  flashStoragePrefix,
  htmlBuildSourcePath,
  htmlStoragePrefix,
  MAX_HTML_BYTES,
} from "@/lib/html-game";
import { fileExt, MEDIA_BUCKET } from "@/lib/media";
import { MAX_CLIP_BYTES, MAX_IMAGE_BYTES } from "@/lib/media-standard";
import {
  COMMUNITIES,
  GENRES,
  RELEASE_STATUSES,
  STORES,
  type Community,
  type ProjectKind,
} from "@/lib/project-fields";
import { clearCatalogueCache, type ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import { CONTROLS, CONTROL_LABEL, isMissingColumnError, normalizeControls, playsOnPhone, type Control } from "@/lib/device";

const KIND_CHOICES: { id: ProjectKind; title: string; hint: string }[] = [
  { id: "html", title: "Playable on PlayInWeb", hint: "Upload a game people play here" },
  { id: "external", title: "External link", hint: "Redirect players to another site" },
];

const RELEASE_SHORT: Record<string, string> = {
  released: "Released",
  in_development: "In development",
  prototype: "Prototype",
  canceled: "Canceled",
};

const COMMUNITY_SHORT: Record<string, string> = {
  disabled: "Off",
  comments: "Comments",
  board: "Discussion board",
};

type CurationRow = Database["public"]["Tables"]["project_curation"]["Row"];

/**
 * Save the game as a curated game (#9): owned by the `listed` system account, with credit and license.
 * Admin only; row-level security allows it for admins and for games owned by that account alone.
 */
export type CuratedTarget = {
  ownerId: string;
  handle: string;
  row?: Partial<CurationRow> | null;
  /** Where to go after saving an edit or deleting. */
  doneHref: string;
};

function curationDraft(row: Partial<CurationRow> | null | undefined): CurationDraft {
  return {
    creatorName: row?.creator_name ?? "",
    creatorUrl: row?.creator_url ?? "",
    sourceUrl: row?.source_url ?? "",
    sourceCodeUrl: row?.source_code_url ?? "",
    license: row?.license ?? "",
    licenseUrl: row?.license_url ?? "",
    modified: row?.modified ?? false,
    confirmed: false,
    frameWidth: row?.frame_width ? String(row.frame_width) : "",
    frameHeight: row?.frame_height ? String(row.frame_height) : "",
  };
}

export function ProjectForm({ project, curated }: { project?: ProjectRecord; curated?: CuratedTarget }) {
  const editing = Boolean(project);
  const { user, profile, loading } = useAuth();
  const { feature: donationsFeature } = useFeature("donations");
  const donationsOpen = isFeaturePubliclyEnabled(donationsFeature, "donations");
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [tagline, setTagline] = useState(project?.tagline ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  // A curated game is hosted here (open license or permission) or links out to the creator's page (#9 F2).
  const [kind, setKind] = useState<ProjectKind | null>(project ? asKind(project.kind) : curated ? "html" : null);
  const [curation, setCuration] = useState<CurationDraft>(() => curationDraft(curated?.row));
  const [detailsOpen, setDetailsOpen] = useState(editing);
  const [allowDonations, setAllowDonations] = useState(project ? project.pricing_type !== "no_payments" : true);
  const [community, setCommunity] = useState<Community>(asCommunity(project?.community));
  const [containsAi, setContainsAi] = useState<"" | "yes" | "no">(
    project ? (project.contains_ai ? "yes" : "no") : "",
  );
  const [tags, setTags] = useState<string[]>((project?.project_tags ?? []).map((t) => t.tag));
  // How the game is played (#38): decides whether it shows under the Phone or Desktop chip.
  const [controls, setControls] = useState<Control[]>(normalizeControls(project?.controls));
  const [tagDraft, setTagDraft] = useState("");
  const [storeUrls, setStoreUrls] = useState<Record<string, string>>(
    Object.fromEntries((project?.project_store_links ?? []).map((l) => [l.store, l.url])),
  );
  const mediaRef = useRef<MediaHandle>(null);
  const continueRequest = useRef(0);
  const [htmlBuild, setHtmlBuild] = useState<File | null>(null);
  const [flashBuild, setFlashBuild] = useState<File | null>(null);
  const [playLink, setPlayLink] = useState(
    project?.kind === "external" && project.play_url.startsWith("http") ? project.play_url : "",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(project?.published === false ? "private" : "public");
  const [suggestedCover, setSuggestedCover] = useState<File | null>(null);
  const [filledFromLink, setFilledFromLink] = useState(false);
  const [readingLink, setReadingLink] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const playChoices = useMemo(() => {
    const choices = curated
      ? KIND_CHOICES.filter((choice) => choice.id === "html" || choice.id === "external")
      : [...KIND_CHOICES];
    if (project && !choices.some((choice) => choice.id === project.kind)) {
      choices.push({ id: project.kind as ProjectKind, title: project.kind, hint: "Current type" });
    }
    return choices;
  }, [project, curated]);

  if (loading) return <FormSkeleton label="Loading account" fields={6} />;

  if (!user || !profile) {
    return (
      <div className="rounded-panel bg-surface-2 px-5 py-10 text-center">
        <p className="text-title font-medium">Create an account first</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => openSignup()}>
            Create account
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => openLogin()}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags([...tags, tag]);
    setTagDraft("");
  }

  async function continueToDetails() {
    setError("");
    const request = ++continueRequest.current;
    if (!kind) {
      setError("Choose how people play this game.");
      return;
    }
    if (kind === "html" && !htmlBuild && !editing) {
      setError("Upload a .zip or .html file.");
      return;
    }
    if (kind === "html" && htmlBuild) {
      try {
        await filesFromHtmlUpload(htmlBuild.name, await htmlBuild.arrayBuffer());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read this file.");
        return;
      }
    }
    if (kind === "flash" && !flashBuild && (!editing || !project?.play_url)) {
      setError("Upload a .swf file.");
      return;
    }
    if (kind === "external") {
      const url = playLink.trim();
      if (!isHttpUrl(url)) {
        setError("Enter a valid play link.");
        return;
      }
      setReadingLink(true);
      try {
        const preview = await requestLinkPreview(url);
        if (continueRequest.current !== request || playLink.trim() !== url) return;
        if (preview) applyLinkPreview(preview);
      } finally {
        setReadingLink(false);
      }
    }
    if (continueRequest.current !== request) return;
    setDetailsOpen(true);
  }

  function applyLinkPreview(preview: LinkPreview) {
    let filled = false;
    if (!title.trim() && preview.title) {
      setTitle(preview.title);
      if (!slugTouched) setSlug(slugify(preview.title).slice(0, 48));
      filled = true;
    }
    if (!description.trim() && preview.description) {
      setDescription(preview.description);
      filled = true;
    }
    if (!tagline.trim() && preview.description) {
      setTagline(taglineFrom(preview.description));
      filled = true;
    }
    const cover = fileFromPreview(preview.image);
    setSuggestedCover(cover);
    if (cover) filled = true;
    setFilledFromLink(filled);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detailsOpen) {
      await continueToDetails();
      return;
    }
    setError("");
    const fd = new FormData(e.currentTarget);
    const nextTitle = title.trim();
    const nextSlug = editing && project ? project.slug : slug.trim();
    if (!kind) {
      setError("Choose how people play this game.");
      return;
    }
    if (!nextTitle || !nextSlug) {
      setError("Title and game URL are required.");
      return;
    }
    if (!isSlug(nextSlug)) {
      setError("Game URL must be lowercase letters, numbers, and hyphens.");
      return;
    }
    if (containsAi === "") {
      setError("Please disclose whether this game uses generative AI.");
      return;
    }
    if (curated) {
      const links = [curation.creatorUrl, curation.sourceUrl, curation.sourceCodeUrl, curation.licenseUrl];
      if (!curation.creatorName.trim()) {
        setError("Add the creator's name.");
        return;
      }
      if (links.some((link) => link.trim() && !isHttpUrl(link.trim()))) {
        setError("Links must start with http:// or https://.");
        return;
      }
      const sizeTyped = curation.frameWidth || curation.frameHeight;
      if (kind === "external" && isOfficialEmbedUrl(playLink) && sizeTyped && !validFrameSize(curation.frameWidth, curation.frameHeight)) {
        setError(`Game size needs both width and height, each between ${FRAME_MIN} and ${FRAME_MAX} pixels.`);
        return;
      }
    }
    // Hosting someone else's build needs a license; a link-out game hosts nothing, so it skips these.
    if (curated && kind !== "external") {
      if (!(CURATION_LICENSES as readonly string[]).includes(curation.license)) {
        setError("Choose the license that lets us host this game.");
        return;
      }
      if (["GPL-2.0", "GPL-3.0", "LGPL-3.0", "AGPL-3.0", "MPL-2.0"].includes(curation.license) && !curation.sourceCodeUrl.trim()) {
        setError("This license needs a link to the source code.");
        return;
      }
      if (!editing && !curation.confirmed) {
        setError("Confirm that you checked the license.");
        return;
      }
    }
    if (kind === "html" && !htmlBuild && !editing) {
      setError("Upload a .zip of the HTML game (with index.html), or a single HTML file.");
      return;
    }
    if (kind === "html" && htmlBuild && htmlBuild.size > MAX_HTML_BYTES) {
      setError("HTML5 game must be 100 MB or smaller.");
      return;
    }
    if (kind === "flash" && !flashBuild && (!editing || !project?.play_url)) {
      setError("Upload a .swf file.");
      return;
    }
    if (kind === "flash" && flashBuild && flashBuild.size > MAX_FILE) {
      setError("Flash game must be 50 MB or smaller.");
      return;
    }
    if (kind === "flash" && flashBuild && !flashBuild.name.toLowerCase().endsWith(".swf")) {
      setError("Flash uploads must be a .swf file.");
      return;
    }
    if (kind === "external") {
      const url = playLink.trim();
      if (!url || !isHttpUrl(url)) {
        setError("Enter a valid http(s) URL where players can play your game.");
        return;
      }
    }
    const media = mediaRef.current?.getDraft();
    if (!media) return;
    if (!editing && !project?.cover_path && !media.landscape) {
      setError("Upload a landscape cover, at least 1280×720.");
      return;
    }
    if (media.landscape && media.landscape.size > MAX_IMAGE_BYTES) {
      setError("Cover image must be 5 MB or smaller.");
      return;
    }
    if (media.portrait && media.portrait.size > MAX_IMAGE_BYTES) {
      setError("Portrait cover must be 5 MB or smaller.");
      return;
    }
    if (media.clip && media.clip.size > MAX_CLIP_BYTES) {
      setError("Preview clip must be 8 MB or smaller.");
      return;
    }
    if (media.shots.length > 8) {
      setError("You can add up to 8 screenshots.");
      return;
    }

    if (!user || !profile) return;
    setPending(true);
    const supabase = createClient();
    const uid = curated?.ownerId ?? user.id;
    const handle = curated?.handle ?? profile.handle;

    async function upload(folder: string, file: File, type?: string) {
      const limit = folder === "clips" ? MAX_CLIP_BYTES : folder === "covers" || folder === "screenshots" ? MAX_IMAGE_BYTES : MAX_FILE;
      if (file.size > limit) throw new Error(`${file.name} is too large.`);
      const path = `${uid}/${folder}/${crypto.randomUUID()}.${fileExt(file.name)}`;
      const { error: upError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, type ? { contentType: type } : undefined);
      if (upError) throw upError;
      return path;
    }

    try {
      let coverPath: string | null = project?.cover_path ?? null;
      let portraitPath: string | null = media.dropPortrait ? null : (project?.cover_portrait_path ?? null);
      let originalPath: string | null = project?.cover_original_path ?? null;
      let clipPath: string | null = media.dropClip ? null : (project?.preview_clip_path ?? null);
      if (media.landscape) {
        setStatus("Uploading cover…");
        coverPath = await upload("covers", media.landscape, "image/webp");
        if (media.original) originalPath = await upload("covers", media.original, media.original.type || undefined);
      }
      if (media.portrait) {
        setStatus("Uploading portrait cover…");
        portraitPath = await upload("covers", media.portrait, "image/webp");
      }
      if (media.clip) {
        setStatus("Uploading preview clip…");
        clipPath = await upload("clips", media.clip, media.clip.type || undefined);
      }

      const fields = {
        title: nextTitle,
        slug: nextSlug,
        tagline: String(fd.get("tagline") ?? "").trim(),
        classification: "game",
        kind,
        release_status: String(fd.get("releaseStatus") ?? "released"),
        // No PlayInWeb donations for a game until its creator claims it (#9).
        pricing_type: !curated && donationsOpen && allowDonations ? "donate" : "no_payments",
        suggested_donation: null,
        min_price: null,
        cover_path: coverPath,
        cover_portrait_path: portraitPath,
        cover_original_path: originalPath,
        cover_focal_x: media.focalX,
        cover_focal_y: media.focalY,
        preview_clip_path: clipPath,
        trailer_url: String(fd.get("trailerUrl") ?? "").trim() || null,
        description: String(fd.get("description") ?? "").trim(),
        genre: String(fd.get("genre") ?? "") === "No genre" ? null : String(fd.get("genre") ?? "").trim() || null,
        custom_noun: project?.custom_noun || "game",
        // Comments open once the creator claims the game (#9).
        community: curated ? "disabled" : community,
        contains_ai: containsAi === "yes",
        // An official embed link (for example itch.io's embed player) plays here instead of opening a tab.
        embeddable: kind === "html" || (kind === "external" && isOfficialEmbedUrl(playLink)),
        // A new curated game stays hidden until its credit is saved, then goes public below.
        published: curated && !editing ? false : visibility === "public",
      };

      let projectId = project?.id ?? "";
      if (editing && project) {
        const { error: updateError } = await supabase.from("projects").update(fields).eq("id", project.id).eq("owner_id", uid);
        if (updateError) throw updateError;
        projectId = project.id;
      } else {
        const { data: created, error: insertError } = await supabase
          .from("projects")
          .insert({
            ...fields,
            owner_id: uid,
            play_url: "",
          })
          .select("id")
          .single();
        if (insertError || !created) throw insertError ?? new Error("Could not create the game.");
        projectId = created.id;
      }

      // Saved on its own so the rest of the form still saves before the controls migration runs.
      const { error: controlsError } = await supabase
        .from("projects")
        .update({ controls })
        .eq("id", projectId)
        .eq("owner_id", uid);
      if (controlsError && !isMissingColumnError(controlsError)) throw controlsError;

      if (kind === "html" && htmlBuild) {
        const packed = await filesFromHtmlUpload(htmlBuild.name, await htmlBuild.arrayBuffer());
        const prefix = htmlStoragePrefix(uid, projectId);
        for (const file of packed) {
          const copy = new Uint8Array(file.bytes);
          const { error: htmlError } = await supabase.storage.from(MEDIA_BUCKET).upload(
            `${prefix}/${file.path}`,
            new Blob([copy], { type: contentType(file.path) }),
            { contentType: contentType(file.path), upsert: true },
          );
          if (htmlError) throw htmlError;
        }
        const { error: sourceError } = await supabase.storage.from(MEDIA_BUCKET).upload(
          htmlBuildSourcePath(prefix),
          new Blob([htmlBuild.name], { type: "text/plain" }),
          { contentType: "text/plain", upsert: true },
        );
        if (sourceError) throw sourceError;
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: hostedPlayPath(nextSlug) })
          .eq("id", projectId);
        if (playError) throw playError;
        void supabase.from("projects").update({ html_build_name: htmlBuild.name }).eq("id", projectId);
      } else if (kind === "html" && editing && project && nextSlug !== project.slug) {
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: hostedPlayPath(nextSlug) })
          .eq("id", projectId);
        if (playError) throw playError;
      } else if (kind === "flash" && flashBuild) {
        const prefix = flashStoragePrefix(uid, projectId);
        const safeName = flashBuild.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${prefix}/${safeName}`;
        const { error: flashError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, flashBuild, {
          contentType: "application/x-shockwave-flash",
          upsert: true,
        });
        if (flashError) throw flashError;
        const { error: sourceError } = await supabase.storage.from(MEDIA_BUCKET).upload(
          htmlBuildSourcePath(prefix),
          new Blob([flashBuild.name], { type: "text/plain" }),
          { contentType: "text/plain", upsert: true },
        );
        if (sourceError) throw sourceError;
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: storagePath })
          .eq("id", projectId);
        if (playError) throw playError;
        void supabase.from("projects").update({ html_build_name: flashBuild.name }).eq("id", projectId);
      } else if (kind === "external") {
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: playLink.trim() })
          .eq("id", projectId);
        if (playError) throw playError;
      }

      if (editing) {
        const { error: clearTags } = await supabase.from("project_tags").delete().eq("project_id", projectId);
        if (clearTags) throw clearTags;
        const { error: clearLinks } = await supabase.from("project_store_links").delete().eq("project_id", projectId);
        if (clearLinks) throw clearLinks;
      }

      if (tags.length) {
        const { error: tagError } = await supabase.from("project_tags").insert(tags.map((tag) => ({ project_id: projectId, tag })));
        if (tagError) throw tagError;
      }
      setStatus(media.shots.some((shot) => shot.file) ? "Uploading screenshots…" : "Saving screenshots…");
      const previous = project?.project_screenshots ?? [];
      const rows: { project_id: string; storage_path: string; sort_order: number; width: number | null; height: number | null; kind: string }[] = [];
      for (const shot of media.shots) {
        const storage_path = shot.file ? await upload("screenshots", shot.file, shot.file.type || undefined) : shot.storagePath;
        if (!storage_path) continue;
        rows.push({
          project_id: projectId,
          storage_path,
          sort_order: rows.length,
          width: shot.width,
          height: shot.height,
          kind: "image",
        });
      }
      if (rows.length) {
        const { error: shotError } = await supabase.from("project_screenshots").insert(rows);
        if (shotError) throw shotError;
      }
      if (previous.length) {
        const { error: clearShots } = await supabase
          .from("project_screenshots")
          .delete()
          .eq("project_id", projectId)
          .in("id", previous.map((shot) => shot.id));
        if (clearShots) throw clearShots;
      }
      const keptPaths = new Set(rows.map((row) => row.storage_path));
      const removedPaths = previous.map((shot) => shot.storage_path).filter((path) => path && !keptPaths.has(path));
      if (removedPaths.length) {
        const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove(removedPaths);
        if (storageError) throw storageError;
      }
      const links = STORES.map((s) => ({ store: s.id, url: storeUrls[s.id]?.trim() ?? "" })).filter((l) => l.url);
      if (links.length) {
        const { error: linkError } = await supabase.from("project_store_links").insert(
          links.map((l) => ({ project_id: projectId, store: l.store, url: l.url })),
        );
        if (linkError) throw linkError;
      }

      if (curated) {
        setStatus("Saving credit…");
        const linkOut = kind === "external";
        const embed = linkOut && isOfficialEmbedUrl(playLink);
        const frame = validFrameSize(curation.frameWidth, curation.frameHeight);
        const credit = {
          project_id: projectId,
          play_mode: linkOut ? (isOfficialEmbedUrl(playLink) ? "embed" : "link_out") : "hosted",
          creator_name: curation.creatorName.trim(),
          creator_url: curation.creatorUrl.trim() || null,
          source_url: curation.sourceUrl.trim() || null,
          source_code_url: curation.sourceCodeUrl.trim() || null,
          license: linkOut ? LINK_OUT_LICENSE : curation.license,
          license_url: linkOut ? null : curation.licenseUrl.trim() || null,
          modified: linkOut ? false : curation.modified,
          // Only embed games have a native size; sending it for others would fail before the column exists.
          ...(embed ? { frame_width: frame?.width ?? null, frame_height: frame?.height ?? null } : {}),
          ...(curated.row ? {} : { listed_by: user.id }),
        };
        const { error: creditError } = await supabase.from("project_curation").upsert(credit, { onConflict: "project_id" });
        if (creditError) throw creditError;
        if (!editing && visibility === "public") {
          const { error: publishError } = await supabase.from("projects").update({ published: true }).eq("id", projectId);
          if (publishError) throw publishError;
        }
      }

      clearCatalogueCache();
      if (editing) {
        router.push(curated?.doneHref ?? "/manage");
        router.refresh();
        return;
      }
      setPending(false);
      setStatus("");
      setPublished(projectPublicUrl(handle, nextSlug));
      router.refresh();
    } catch (err) {
      setPending(false);
      setStatus("");
      setError(saveErrorMessage(err));
    }
  }

  if (published) {
    return (
      <EmptyState
        kind="first-use"
        illustration="success"
        title="Your game is live"
        body="The listing is published. Open it, or go back to your games."
        action={
          <>
            <DsButton variant="primary" asChild>
              <Link href={published}>View game</Link>
            </DsButton>
            <DsButton asChild>
              <Link href="/manage">Manage games</Link>
            </DsButton>
          </>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className={f.stack}>
      <section className={f.block}>
        <div className={f.kinds} role="radiogroup" aria-label="How people play it">
          {playChoices.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={kind === item.id}
              className={f.kind}
              onClick={() => {
                if (item.id === kind) return;
                setKind(item.id);
                if (!editing) {
                  setDetailsOpen(false);
                  setSuggestedCover(null);
                  setFilledFromLink(false);
                  continueRequest.current += 1;
                }
                setError("");
              }}
            >
              <strong>{item.title}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>

        {kind ? (
          <BuildFields
            kind={kind}
            editing={editing}
            project={project}
            htmlBuild={htmlBuild}
            setHtmlBuild={setHtmlBuild}
            flashBuild={flashBuild}
            setFlashBuild={setFlashBuild}
            playLink={playLink}
            setPlayLink={setPlayLink}
            setError={setError}
            action={
              detailsOpen ? null : (
                <Button type="button" variant="primary" disabled={readingLink} onClick={() => void continueToDetails()}>
                  {readingLink ? "Reading…" : "Continue"}
                </Button>
              )
            }
          />
        ) : null}

        {kind && !detailsOpen && error ? <p className="text-ui text-danger">{error}</p> : null}
      </section>

      {detailsOpen ? (
        <>

      <section className={f.block}>
        <header className={f.head}>
          <h2>About this game</h2>
          {filledFromLink ? <p>Filled from the play link. Change anything.</p> : null}
        </header>
        <Field label="Title">
          <TextInput
            value={title}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setTitle(nextTitle);
              if (!editing && !slugTouched) setSlug(slugify(nextTitle).slice(0, 48));
            }}
            required
          />
        </Field>

        <Field label="Game URL" hint={editing ? "Locked" : undefined}>
          <div className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg bg-surface-2 sm:h-9">
            <span className="hidden max-w-[55%] shrink-0 truncate bg-surface-3 px-3 py-2 text-caption text-text-subtle lg:inline">
              {`${apexOrigin()}/${curated?.handle ?? profile.handle}/`}
            </span>
            <TextInput
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              required
              readOnly={editing}
              disabled={editing}
              className="h-full min-w-0 flex-1 rounded-none bg-transparent px-3 focus:bg-transparent sm:h-full"
            />
          </div>
        </Field>

        <Field label="Tagline">
          <TextInput name="tagline" placeholder="Optional" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>

        <Field label="Description">
          <TextArea
            name="description"
            className="h-[150px] min-h-[150px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <SelectField label="Genre" name="genre" defaultValue={project?.genre && GENRES.includes(project.genre as (typeof GENRES)[number]) ? project.genre : "No genre"}>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <div>
          <p className="text-caption font-medium text-text-muted">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="rounded-lg bg-surface-2 px-3 py-1 text-caption hover:bg-surface-3"
              >
                {tag} ×
              </button>
            ))}
          </div>
          <TextInput
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            placeholder="Press Enter"
            className="mt-2"
          />
        </div>

        <SelectField label="Release status" name="releaseStatus" defaultValue={project?.release_status ?? "released"}>
          {RELEASE_STATUSES.map((item) => (
            <option key={item.id} value={item.id}>
              {RELEASE_SHORT[item.id] ?? item.label}
            </option>
          ))}
        </SelectField>
      </section>

      {curated ? (
        <CurationFields
          draft={curation}
          onChange={setCuration}
          requireConfirm={!editing}
          linkOut={kind === "external"}
          embed={kind === "external" && isOfficialEmbedUrl(playLink)}
        />
      ) : null}

      <section className={f.block}>
        <header className={f.head}>
          <h2>Cover and media</h2>
        </header>
        <MediaAside
          project={project}
          title={title}
          handleRef={mediaRef}
          setError={setError}
          suggestedCover={suggestedCover}
        />
      </section>

      <section className={f.block}>
        <header className={f.head}>
          <h2>Listing</h2>
        </header>

        {donationsOpen && !curated ? (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-ui font-medium">Allow donations</p>
            </div>
            <span className="relative inline-flex h-7 w-12 shrink-0">
              <input
                type="checkbox"
                role="switch"
                checked={allowDonations}
                onChange={(e) => setAllowDonations(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full transition-colors duration-200 ease-out-quint",
                  "bg-surface-3 peer-checked:bg-brand-blue",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-quint",
                  "peer-checked:translate-x-5",
                )}
              />
            </span>
          </label>
        ) : null}

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Controls</legend>
          <p className="mt-1 text-caption text-text-subtle">
            Tick every way the game can be played. Games with Touchscreen, or with Mouse and no Keyboard, show under
            Phone; the rest show under Desktop.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {CONTROLS.map((control) => (
              <label key={control} className="flex items-center gap-2 text-ui">
                <input
                  type="checkbox"
                  name="controls"
                  value={control}
                  checked={controls.includes(control)}
                  onChange={() =>
                    setControls((list) => normalizeControls(list.includes(control) ? list.filter((c) => c !== control) : [...list, control]))
                  }
                />
                {CONTROL_LABEL[control]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-caption text-text-muted">
            {controls.length === 0
              ? "Not set yet: the game shows under Desktop only."
              : playsOnPhone(controls)
                ? "Shows under Phone and Desktop."
                : "Shows under Desktop only."}
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Generative AI</legend>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="ai" checked={containsAi === "yes"} onChange={() => setContainsAi("yes")} />
            Yes
          </label>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="ai" checked={containsAi === "no"} onChange={() => setContainsAi("no")} />
            No
          </label>
        </fieldset>

        <div>
          <p className="text-caption font-medium text-text-muted">Store links</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {STORES.map((store) => (
              <TextInput
                key={store.id}
                value={storeUrls[store.id] ?? ""}
                onChange={(e) => setStoreUrls({ ...storeUrls, [store.id]: e.target.value })}
                placeholder={store.label}
              />
            ))}
          </div>
        </div>

        {curated ? (
          <p className="text-ui text-text-muted">Comments and donations stay off until the creator claims this game.</p>
        ) : (
          <fieldset>
            <legend className="text-caption font-medium text-text-muted">Community</legend>
            {COMMUNITIES.map((item) => (
              <label key={item.id} className="mt-2 flex items-start gap-2 text-ui">
                <input type="radio" name="community" checked={community === item.id} onChange={() => setCommunity(item.id)} />
                {COMMUNITY_SHORT[item.id] ?? item.id}
              </label>
            ))}
          </fieldset>
        )}

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Visibility</legend>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="visibility" checked={visibility === "public"} onChange={() => setVisibility("public")} />
            Public
          </label>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="visibility" checked={visibility === "private"} onChange={() => setVisibility("private")} />
            Private
          </label>
        </fieldset>

        {error ? <p className="text-ui text-danger">{error}</p> : null}
        {status && pending ? <p className="text-ui text-text-muted">{status}</p> : null}

        <Button type="submit" variant="primary" disabled={pending} className="w-fit">
          {pending ? "Saving…" : editing ? "Save changes" : "Save & view page"}
        </Button>

        {editing && project ? (
          <div className="mt-4 border-t border-border pt-6">
            <p className="text-caption font-medium text-text-muted">Danger zone</p>
            <p className="mt-1 max-w-xl text-body text-text-muted">Deletes the game and its files.</p>
            <DeleteProjectButton
              project={project}
              className="mt-3"
              onDeleted={() => router.push(curated ? curated.doneHref : apexHref("/manage"))}
            />
          </div>
        ) : null}
      </section>
        </>
      ) : null}
    </form>
  );
}

async function requestLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const response = await fetch("/api/link-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<LinkPreview>;
    const image = data.image;
    const mime = image?.mime;
    const usable =
      image &&
      typeof image.base64 === "string" &&
      (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp")
        ? { mime, base64: image.base64 }
        : null;
    return {
      title: typeof data.title === "string" ? data.title : "",
      description: typeof data.description === "string" ? data.description : "",
      image: usable,
    };
  } catch {
    return null;
  }
}

function fileFromPreview(image: LinkPreview["image"]) {
  if (!image?.base64) return null;
  try {
    const binary = atob(image.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const ext = image.mime === "image/png" ? "png" : image.mime === "image/webp" ? "webp" : "jpg";
    return new File([bytes], `cover.${ext}`, { type: image.mime });
  } catch {
    return null;
  }
}
