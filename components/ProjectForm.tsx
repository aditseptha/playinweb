"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { useLoginDialog } from "@/components/LoginDialog";
import { BuildFields } from "@/components/project-form/BuildFields";
import { MediaAside } from "@/components/project-form/MediaAside";
import {
  asCommunity,
  asKind,
  fieldLabel,
  fieldLegend,
  imageSizeError,
  imageTooLarge,
  isHttpUrl,
  MAX_FILE,
  MAX_IMAGE_BYTES,
  MAX_TAGS,
  minCoverSize,
  saveErrorMessage,
  sectionLabel,
  SelectField,
} from "@/components/project-form/shared";
import { useSignupDialog } from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { isFeaturePubliclyEnabled, useFeature } from "@/lib/features";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
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
import {
  COMMUNITIES,
  GENRES,
  LEGACY_PROJECT_KINDS,
  PROJECT_KINDS,
  RELEASE_STATUSES,
  STORES,
  type Community,
  type ProjectKind,
} from "@/lib/project-fields";
import { clearCatalogueCache, type ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

export function ProjectForm({ project }: { project?: ProjectRecord }) {
  const editing = Boolean(project);
  const { user, profile, loading } = useAuth();
  const { feature: donationsFeature } = useFeature("donations");
  const donationsOpen = isFeaturePubliclyEnabled(donationsFeature, "donations");
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [kind, setKind] = useState<ProjectKind>(asKind(project?.kind));
  const [allowDonations, setAllowDonations] = useState(project ? project.pricing_type !== "no_payments" : true);
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
  const [htmlBuild, setHtmlBuild] = useState<File | null>(null);
  const [flashBuild, setFlashBuild] = useState<File | null>(null);
  const [playLink, setPlayLink] = useState(
    project?.kind === "external" && project.play_url.startsWith("http") ? project.play_url : "",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(project?.published === false ? "private" : "public");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const previewUrl = useMemo(() => {
    if (!profile || !slug) return "";
    return projectPublicUrl(profile.handle, slug);
  }, [profile, slug]);

  const kindOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [...PROJECT_KINDS];
    if (project && LEGACY_PROJECT_KINDS.includes(project.kind as (typeof LEGACY_PROJECT_KINDS)[number])) {
      options.push({ id: project.kind, label: `${project.kind} (legacy)` });
    }
    return options;
  }, [project]);

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user || !profile) {
    return (
      <div className="rounded-panel bg-surface-2 px-5 py-10 text-center">
        <p className="text-title font-medium">Create an account first</p>
        <p className="mx-auto mt-1 max-w-md text-ui text-text-muted">
          Games are published on your page, like yourname/game.
        </p>
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
    if (cover && imageTooLarge(cover)) {
      setError(imageSizeError("Cover image"));
      return;
    }
    const oversizedShot = shots.find((file) => imageTooLarge(file));
    if (oversizedShot) {
      setError(imageSizeError(oversizedShot.name));
      return;
    }

    if (!user || !profile) return;
    setPending(true);
    const supabase = createClient();
    const uid = user.id;
    const handle = profile.handle;

    async function upload(folder: string, file: File) {
      const limit = folder === "covers" || folder === "screenshots" ? MAX_IMAGE_BYTES : MAX_FILE;
      if (file.size > limit) {
        throw new Error(
          folder === "covers"
            ? imageSizeError("Cover image")
            : folder === "screenshots"
              ? imageSizeError(file.name)
              : `${file.name} is over 50 MB.`,
        );
      }
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

      const fields = {
        title: nextTitle,
        slug: nextSlug,
        tagline: String(fd.get("tagline") ?? "").trim(),
        classification: "game",
        kind,
        release_status: String(fd.get("releaseStatus") ?? "released"),
        pricing_type: donationsOpen && allowDonations ? "donate" : "no_payments",
        suggested_donation: null,
        min_price: null,
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
      setError(saveErrorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-6">
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

        <SelectField label="Release status" name="releaseStatus" defaultValue={project?.release_status ?? "released"}>
          {RELEASE_STATUSES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>

        <Field label={fieldLabel("Short description or tagline", "Optional. Avoid duplicating your game's title.")}>
          <TextInput name="tagline" placeholder="Optional" defaultValue={project?.tagline ?? ""} />
        </Field>

        <Field label={fieldLabel("Kind of game", "Choose how players access your game.")}>
          <SelectInput value={kind} onChange={(e) => setKind(e.target.value as ProjectKind)}>
            {kindOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </Field>

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
        />

        {donationsOpen ? (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-ui font-medium">Allow donations</p>
              <p className="mt-0.5 text-meta text-text-subtle">Let players support your game with a voluntary donation.</p>
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

        <Field label={fieldLabel("Description", "This will make up the content of your game page.")}>
          <TextArea name="description" className="h-[150px] min-h-[150px]" defaultValue={project?.description ?? ""} />
        </Field>

        <SelectField
          label={fieldLabel("Genre", "You can add additional genres with tags.")}
          name="genre"
          defaultValue={project?.genre && GENRES.includes(project.genre as (typeof GENRES)[number]) ? project.genre : "No genre"}
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <div>
          {sectionLabel("Tags", "Any other keywords someone might search. Max of 10.")}
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
          {fieldLegend("Generative AI disclosure", "Does this game contain output from generative AI tools?")}
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
          {sectionLabel("App store links", "These will be linked to on the game page.")}
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
          {fieldLegend(
            "Visibility",
            visibility === "private"
              ? "Only you can open this listing. It stays off the catalogue and your public page."
              : "Anyone can find and play this listing.",
          )}
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

        {editing && project ? (
          <div className="mt-10 border-t border-border pt-8">
            <p className="text-caption font-medium text-text-muted">Danger zone</p>
            <p className="mt-1 max-w-xl text-body text-text-muted">
              Permanently delete this game, its media, and all stats. This cannot be undone.
            </p>
            <DeleteProjectButton
              project={project}
              className="mt-3"
              onDeleted={() => router.push(apexHref("/manage"))}
            />
          </div>
        ) : null}
      </div>

      <MediaAside
        project={project}
        cover={cover}
        setCover={setCover}
        shots={shots}
        setShots={setShots}
        keptShots={keptShots}
        setKeptShots={setKeptShots}
        setError={setError}
      />
    </form>
  );
}
