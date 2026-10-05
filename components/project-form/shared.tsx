import { Field, SelectInput } from "@/components/ui/field";
import { COMMUNITIES, LEGACY_PROJECT_KINDS, PROJECT_KINDS, type Community, type ProjectKind } from "@/lib/project-fields";

export const MAX_FILE = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TAGS = 10;

export type HtmlPreview = {
  name: string;
  size: number;
  files: string[];
  error: string;
};

export function asKind(value: string | undefined): ProjectKind {
  if (!value) return "html";
  if (PROJECT_KINDS.some((item) => item.id === value)) return value as ProjectKind;
  if (LEGACY_PROJECT_KINDS.includes(value as (typeof LEGACY_PROJECT_KINDS)[number])) return value as ProjectKind;
  return "html";
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function saveErrorMessage(err: unknown) {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err && typeof err.message === "string"
        ? err.message
        : "";
  if (!raw) return "Could not save the game.";
  if (raw.includes("projects_kind_check")) {
    return "That game type is not enabled in the database yet. Update projects_kind_check in Supabase to allow this kind.";
  }
  if (raw.includes("html_build_name")) {
    return "Missing html_build_name column. Run: alter table public.projects add column if not exists html_build_name text;";
  }
  return raw;
}

export function asCommunity(value: string | undefined): Community {
  return COMMUNITIES.some((item) => item.id === value) ? (value as Community) : "comments";
}

export function fieldLabel(title: string, hint: string) {
  return (
    <>
      {title}{" "}
      <span className="font-normal text-text-subtle">({hint})</span>
    </>
  );
}

export function sectionLabel(title: string, hint: string) {
  return (
    <p className="text-caption font-medium text-text-muted">
      {title}{" "}
      <span className="font-normal text-text-subtle">({hint})</span>
    </p>
  );
}

export function fieldLegend(title: string, hint: string) {
  return (
    <legend className="text-caption font-medium text-text-muted">
      {title}{" "}
      <span className="font-normal text-text-subtle">({hint})</span>
    </legend>
  );
}

export function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function imageTooLarge(file: File) {
  return file.size > MAX_IMAGE_BYTES;
}

export function imageSizeError(label: string) {
  return `${label} must be ${formatSize(MAX_IMAGE_BYTES)} or smaller.`;
}

export function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: React.ReactNode;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <SelectInput name={name} defaultValue={defaultValue}>
        {children}
      </SelectInput>
    </Field>
  );
}

export function minCoverSize(file: File, minW: number, minH: number) {
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
