"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconClose } from "@/components/icons";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { apexOrigin, isSlug, projectPublicUrl } from "@/lib/host";
import { fileExt, MEDIA_BUCKET, publicMediaUrl } from "@/lib/media";
import { contentType, filesFromHtmlUpload, hostedPlayPath, htmlStoragePrefix, MAX_HTML_BYTES } from "@/lib/html-game";
import {
  CLASSIFICATIONS,
  COMMUNITIES,
  GENRES,
  PRICING_TYPES,
  PROJECT_KINDS,
  RELEASE_STATUSES,
  STORES,
  type Community,
  type PricingType,
  type ProjectKind,
} from "@/lib/project-fields";
import { clearCatalogueCache, type ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE = 50 * 1024 * 1024;
const MAX_TAGS = 10;

type HtmlPreview = {
  name: string;
  size: number;
  files: string[];
  error: string;
};

function asKind(value: string | undefined): ProjectKind {
  return PROJECT_KINDS.some((item) => item.id === value) ? (value as ProjectKind) : "html";
}

function asPricing(value: string | undefined): PricingType {
  return PRICING_TYPES.some((item) => item.id === value) ? (value as PricingType) : "donate";
}

function asCommunity(value: string | undefined): Community {
  return COMMUNITIES.some((item) => item.id === value) ? (value as Community) : "comments";
}

export function ProjectForm({ project }: { project?: ProjectRecord }) {
  const editing = Boolean(project);
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [kind, setKind] = useState<ProjectKind>(asKind(project?.kind));
  const [pricing, setPricing] = useState<PricingType>(asPricing(project?.pricing_type));
  const [community, setCommunity] = useState<Community>(asCommunity(project?.community));
  const [containsAi, setContainsAi] = useState<"" | "yes" | "no">(
    project ? (project.contains_ai ? "yes" : "no") : "",
  );
  const [tags, setTags] = useState<string[]>((project?.project_tags ?? []).map((t) => t.tag));
  const [tagDraft, setTagDraft] = useState("");
  const [storeUrls, setStoreUrls] = useState<Record<string, string>>(
    Object.fromEntries((project?.project_store_links ?? []).map((l) => [l.store, l.url])),
  );
  const [cover, setCover] = useState<File | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  const [keptShots, setKeptShots] = useState(
    [...(project?.project_screenshots ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [uploads, setUploads] = useState<File[]>([]);
  const [htmlBuild, setHtmlBuild] = useState<File | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<HtmlPreview | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">(project?.published === false ? "private" : "public");
  const [externalName, setExternalName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [showExternal, setShowExternal] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const previewUrl = useMemo(() => {
    if (!profile || !slug) return "";
    return projectPublicUrl(profile.handle, slug);
  }, [profile, slug]);

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : ""), [cover]);
  const shotPreviews = useMemo(() => shots.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [shots]);
  const coverSrc = coverPreview || publicMediaUrl(project?.cover_path);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => () => {
    for (const shot of shotPreviews) URL.revokeObjectURL(shot.url);
  }, [shotPreviews]);

  useEffect(() => {
    if (!htmlBuild) {
      setHtmlPreview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const packed = await filesFromHtmlUpload(htmlBuild.name, await htmlBuild.arrayBuffer());
        if (cancelled) return;
        setHtmlPreview({
          name: htmlBuild.name,
          size: htmlBuild.size,
          files: packed.map((file) => file.path),
          error: "",
        });
      } catch (err) {
        if (!cancelled) {
          setHtmlPreview({
            name: htmlBuild.name,
            size: htmlBuild.size,
            files: [],
            error: err instanceof Error ? err.message : "Could not read this file.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [htmlBuild]);

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user || !profile) {
    return (
      <div className="rounded-panel bg-surface px-5 py-10 text-center">
        <p className="text-title font-medium">Create an account first</p>
        <p className="mx-auto mt-1 max-w-md text-ui text-text-muted">
          Games are published on your page, like yourname/game.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <LinkButton href="/signup" variant="primary" size="sm">
            Create account
          </LinkButton>
          <LinkButton href="/login" variant="secondary" size="sm">
            Sign in
          </LinkButton>
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const nextTitle = title.trim();
    const nextSlug = editing && project ? project.slug : slug.trim();
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
    if (kind === "html" && !htmlBuild && !editing) {
      setError("Upload a .zip of the HTML game (with index.html), or a single HTML file.");
      return;
    }
    if (kind === "html" && htmlBuild && htmlBuild.size > MAX_HTML_BYTES) {
      setError("HTML5 game must be 100 MB or smaller.");
      return;
    }

    if (!user || !profile) return;
    setPending(true);
    const supabase = createClient();
    const uid = user.id;
    const handle = profile.handle;

    async function upload(folder: string, file: File) {
      if (file.size > MAX_FILE) throw new Error(`${file.name} is over 50 MB.`);
      const path = `${uid}/${folder}/${crypto.randomUUID()}.${fileExt(file.name)}`;
      const { error: upError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file);
      if (upError) throw upError;
      return path;
    }

    try {
      let coverPath: string | null = project?.cover_path ?? null;
      if (cover) {
        const ok = await minCoverSize(cover, 320, 180);
        if (!ok) throw new Error("Cover must be at least 320×180.");
        coverPath = await upload("covers", cover);
      }

      const shotPaths: string[] = [];
      for (const file of shots) shotPaths.push(await upload("screenshots", file));

      const fileRows: { file_name: string; storage_path: string | null; external_url: string | null; size_bytes: number | null }[] = [];
      for (const file of uploads) {
        const path = await upload("files", file);
        fileRows.push({ file_name: file.name, storage_path: path, external_url: null, size_bytes: file.size });
      }
      if (externalUrl.trim()) {
        fileRows.push({
          file_name: externalName.trim() || "External file",
          storage_path: null,
          external_url: externalUrl.trim(),
          size_bytes: null,
        });
      }

      const suggested = pricing === "donate" ? Number(fd.get("suggestedDonation") || 2) : null;
      const minPrice = pricing === "paid" ? Number(fd.get("minPrice") || 0) : null;

      const fields = {
        title: nextTitle,
        slug: nextSlug,
        tagline: String(fd.get("tagline") ?? "").trim(),
        classification: String(fd.get("classification") ?? "game"),
        kind,
        release_status: String(fd.get("releaseStatus") ?? "released"),
        pricing_type: pricing,
        suggested_donation: Number.isFinite(suggested) ? suggested : null,
        min_price: Number.isFinite(minPrice) ? minPrice : null,
        cover_path: coverPath,
        trailer_url: String(fd.get("trailerUrl") ?? "").trim() || null,
        description: String(fd.get("description") ?? "").trim(),
        genre: String(fd.get("genre") ?? "") === "No genre" ? null : String(fd.get("genre") ?? "").trim() || null,
        custom_noun: project?.custom_noun || "game",
        community,
        contains_ai: containsAi === "yes",
        embeddable: kind === "html",
        published: visibility === "public",
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
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: hostedPlayPath(nextSlug) })
          .eq("id", projectId);
        if (playError) throw playError;
      } else if (kind === "html" && editing && project && nextSlug !== project.slug) {
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: hostedPlayPath(nextSlug) })
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
      const originalPaths = (project?.project_screenshots ?? []).map((shot) => shot.storage_path);
      const keptPaths = keptShots.map((shot) => shot.storage_path);
      const removedPaths = originalPaths.filter((path) => !keptPaths.includes(path));
      if (removedPaths.length) {
        const { error: clearShots } = await supabase
          .from("project_screenshots")
          .delete()
          .eq("project_id", projectId)
          .in("storage_path", removedPaths);
        if (clearShots) throw clearShots;
        const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove(removedPaths);
        if (storageError) throw storageError;
      }
      if (shotPaths.length) {
        const { error: shotError } = await supabase.from("project_screenshots").insert(
          shotPaths.map((storage_path, i) => ({
            project_id: projectId,
            storage_path,
            sort_order: keptShots.length + i,
          })),
        );
        if (shotError) throw shotError;
      }
      if (fileRows.length) {
        const { error: fileError } = await supabase.from("project_files").insert(
          fileRows.map((row) => ({ ...row, project_id: projectId })),
        );
        if (fileError) throw fileError;
      }
      const links = STORES.map((s) => ({ store: s.id, url: storeUrls[s.id]?.trim() ?? "" })).filter((l) => l.url);
      if (links.length) {
        const { error: linkError } = await supabase.from("project_store_links").insert(
          links.map((l) => ({ project_id: projectId, store: l.store, url: l.url })),
        );
        if (linkError) throw linkError;
      }

      clearCatalogueCache();
      router.push(editing ? "/manage" : projectPublicUrl(handle, nextSlug));
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Could not save the game.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="rounded-lg bg-warning/12 px-4 py-3 text-ui text-warning">
          Payments are not live. If you set a paid price, people still cannot check out here.
        </div>

        <Field label="Title">
          <TextInput
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!editing && !slug) setSlug(slugify(e.target.value).slice(0, 48));
            }}
            required
          />
        </Field>

        <Field
          label="Game URL"
          hint={
            editing
              ? previewUrl || "This URL is locked after the game is created."
              : previewUrl || "Shown as yourname/game on this site."
          }
        >
          <div className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg bg-surface-2 sm:h-9">
            <span className="hidden max-w-[55%] shrink-0 truncate bg-surface-3 px-3 py-2 text-caption text-text-subtle lg:inline">
              {`${apexOrigin()}/${profile.handle}/`}
            </span>
            <TextInput
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              readOnly={editing}
              disabled={editing}
              className="h-full min-w-0 flex-1 rounded-none bg-transparent px-3 focus:bg-transparent sm:h-full"
            />
          </div>
        </Field>

        <Field label="Short description or tagline" hint="Optional. Avoid duplicating your game's title.">
          <TextInput name="tagline" placeholder="Optional" defaultValue={project?.tagline ?? ""} />
        </Field>

        <SelectField label="Classification" name="classification" hint="What are you uploading?" defaultValue={project?.classification ?? "game"}>
          {CLASSIFICATIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>

        <Field label="Kind of game" hint="You can add additional downloadable files for any of the types above.">
          <SelectInput value={kind} onChange={(e) => setKind(e.target.value as ProjectKind)}>
            {PROJECT_KINDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <SelectField label="Release status" name="releaseStatus" defaultValue={project?.release_status ?? "released"}>
          {RELEASE_STATUSES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>

        {kind === "html" ? (
          <Field
            label="HTML5 game"
            hint={
              editing
                ? "Leave empty to keep the current build. Upload a new .zip to replace it. Max 100 MB."
                : "A .zip with index.html, like itch.io. Max 100 MB. Players run it here — the original host is never shown."
            }
          >
            <input
              type="file"
              accept=".zip,.html,.htm,application/zip"
              className="block w-full text-ui text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:text-body file:text-text"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > MAX_HTML_BYTES) {
                  e.target.value = "";
                  setHtmlBuild(null);
                  setHtmlPreview({
                    name: file.name,
                    size: file.size,
                    files: [],
                    error: "HTML5 game must be 100 MB or smaller.",
                  });
                  return;
                }
                setHtmlBuild(file);
              }}
            />
            {htmlPreview ? (
              <HtmlBuildPreview preview={htmlPreview} />
            ) : htmlBuild ? (
              <span className="text-meta text-text-subtle">{htmlBuild.name}</span>
            ) : editing && project ? (
              <p className="text-meta text-text-subtle">
                Current file: {project.play_url || hostedPlayPath(project.slug)}
              </p>
            ) : null}
          </Field>
        ) : null}

        <div>
          <p className="text-caption font-medium text-text-muted">Pricing</p>
          <Segmented
            className="mt-2"
            value={pricing}
            onChange={setPricing}
            options={PRICING_TYPES.map((item) => ({ value: item.id, label: item.label }))}
          />
          {pricing === "donate" ? (
            <Field label="Suggested donation" className="mt-3 max-w-xs">
              <TextInput
                name="suggestedDonation"
                type="number"
                min="0"
                step="0.01"
                defaultValue={project?.suggested_donation != null ? String(project.suggested_donation) : "2.00"}
              />
            </Field>
          ) : null}
          {pricing === "paid" ? (
            <Field label="Minimum price" className="mt-3 max-w-xs">
              <TextInput
                name="minPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={project?.min_price != null ? String(project.min_price) : "0.00"}
              />
            </Field>
          ) : null}
        </div>

        <div>
          <p className="text-caption font-medium text-text-muted">Uploads</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-accent px-3.5 text-body font-medium text-accent-fg sm:h-9">
              Upload files
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => setUploads([...(e.target.files ?? [])])}
              />
            </label>
            <button type="button" onClick={() => setShowExternal(true)} className="text-ui text-text-muted hover:text-text">
              Add external file
            </button>
          </div>
          <p className="mt-2 text-meta text-text-subtle">File size limit: 50 MB per file.</p>
          {uploads.length > 0 ? (
            <ul className="mt-2 text-ui text-text-muted">
              {uploads.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          ) : null}
          {showExternal ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <TextInput value={externalName} onChange={(e) => setExternalName(e.target.value)} placeholder="File name" />
              <TextInput value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
            </div>
          ) : null}
        </div>

        <Field label="Description" hint="This will make up the content of your game page.">
          <TextArea name="description" rows={10} className="min-h-[12rem]" defaultValue={project?.description ?? ""} />
        </Field>

        <SelectField
          label="Genre"
          name="genre"
          hint="You can add additional genres with tags."
          defaultValue={project?.genre && GENRES.includes(project.genre as (typeof GENRES)[number]) ? project.genre : "No genre"}
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <div>
          <p className="text-caption font-medium text-text-muted">Tags</p>
          <p className="text-meta text-text-subtle">Any other keywords someone might search. Max of 10.</p>
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
            placeholder="Click to view options, type to filter or enter custom tag"
            className="mt-2"
          />
        </div>

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Generative AI disclosure</legend>
          <p className="text-meta text-text-subtle">Does this game contain output from generative AI tools?</p>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="ai" checked={containsAi === "yes"} onChange={() => setContainsAi("yes")} />
            Yes — This game contains the output of Generative AI
          </label>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="ai" checked={containsAi === "no"} onChange={() => setContainsAi("no")} />
            No — This game does not contain the output of Generative AI
          </label>
        </fieldset>

        <div>
          <p className="text-caption font-medium text-text-muted">App store links</p>
          <p className="text-meta text-text-subtle">These will be linked to on the game page.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {STORES.map((store) => (
              <TextInput
                key={store.id}
                value={storeUrls[store.id] ?? ""}
                onChange={(e) => setStoreUrls({ ...storeUrls, [store.id]: e.target.value })}
                placeholder={`+ ${store.label}`}
              />
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Community</legend>
          {COMMUNITIES.map((item) => (
            <label key={item.id} className="mt-2 flex items-start gap-2 text-ui">
              <input type="radio" name="community" checked={community === item.id} onChange={() => setCommunity(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Visibility</legend>
          <p className="text-meta text-text-subtle">
            {visibility === "private"
              ? "Only you can open this listing. It stays off the catalogue and your public page."
              : "Anyone can find and play this listing."}
          </p>
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

        <Button type="submit" variant="primary" disabled={pending} className="w-fit">
          {pending ? "Saving…" : editing ? "Save changes" : "Save & view page"}
        </Button>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
        <div>
          <p className="text-caption font-medium text-text-muted">Cover image</p>
          <label className="relative mt-2 grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-panel bg-bg-inset text-center text-ui text-text-muted">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <span
              className={cn(
                "relative z-10 rounded-md px-2 py-1",
                coverSrc ? "bg-black/60 text-white" : "",
              )}
            >
              {cover ? "Replace cover image" : project?.cover_path ? "Replace cover image" : "Upload cover image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-2 text-meta text-text-subtle">Required for best results. 16:9, minimum 320×180, recommended 1280×720.</p>
        </div>
        <Field label="Gameplay video or trailer" hint="YouTube or Vimeo">
          <TextInput name="trailerUrl" placeholder="https://www.youtube.com/watch?v=…" defaultValue={project?.trailer_url ?? ""} />
        </Field>
        <div>
          <p className="text-caption font-medium text-text-muted">Screenshots</p>
          <label className="mt-2 inline-flex h-10 cursor-pointer items-center rounded-lg bg-surface-2 px-3.5 text-body sm:h-9">
            Add screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const next = [...(e.target.files ?? [])];
                if (next.length) setShots((cur) => [...cur, ...next]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-2 text-meta text-text-subtle">Upload 3 to 5 for best results.</p>
          {keptShots.length || shotPreviews.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {keptShots.map((shot) => (
                <li key={shot.storage_path} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicMediaUrl(shot.storage_path)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <RemoveShotButton
                    label="Remove screenshot"
                    onClick={() => setKeptShots((cur) => cur.filter((item) => item.storage_path !== shot.storage_path))}
                  />
                </li>
              ))}
              {shotPreviews.map((shot, i) => (
                <li key={shot.url} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <RemoveShotButton
                    label="Remove screenshot"
                    onClick={() => setShots((cur) => cur.filter((_, index) => index !== i))}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {shotPreviews.length && keptShots.length ? (
            <p className="mt-2 text-meta text-text-subtle">
              {keptShots.length} uploaded, {shotPreviews.length} new ready to save
            </p>
          ) : shotPreviews.length ? (
            <p className="mt-2 text-meta text-text-subtle">{shotPreviews.length} new screenshot{shotPreviews.length === 1 ? "" : "s"} ready to save</p>
          ) : keptShots.length ? (
            <p className="mt-2 text-meta text-text-subtle">{keptShots.length} already uploaded</p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}

function RemoveShotButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
    >
      <IconClose className="h-3.5 w-3.5" />
    </button>
  );
}

function HtmlBuildPreview({ preview }: { preview: HtmlPreview }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg bg-bg-inset">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-ui font-medium">{preview.name}</p>
        <p className="text-meta text-text-subtle">{formatSize(preview.size)}</p>
      </div>
      {preview.error ? (
        <p className="px-3 pb-3 text-ui text-danger">{preview.error}</p>
      ) : (
        <>
          <p className="px-3 text-meta text-text-subtle">
            {preview.files.length} file{preview.files.length === 1 ? "" : "s"}
          </p>
          <ul className="max-h-32 overflow-y-auto px-3 pb-3 text-meta text-text-subtle">
            {preview.files.slice(0, 20).map((path) => (
              <li key={path} className="truncate">
                {path}
              </li>
            ))}
            {preview.files.length > 20 ? <li>+{preview.files.length - 20} more</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function SelectField({
  label,
  name,
  hint,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      <SelectInput name={name} defaultValue={defaultValue}>
        {children}
      </SelectInput>
    </Field>
  );
}

function minCoverSize(file: File, minW: number, minH: number) {
  return new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width >= minW && img.height >= minH);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}
