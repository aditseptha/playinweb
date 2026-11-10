"use client";

import f from "@/components/project-form/form.module.css";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { CURATION_LICENSES, licenseLabel } from "@/lib/curation";

export type CurationDraft = {
  creatorName: string;
  creatorUrl: string;
  sourceUrl: string;
  sourceCodeUrl: string;
  license: string;
  licenseUrl: string;
  modified: boolean;
  /** The admin checked the license; required when adding a game. */
  confirmed: boolean;
};

/**
 * Credit and license for a curated game (#9). Shown only in the admin's Curated games form.
 * A link-out game hosts nothing here, so it needs the credit but no license.
 */
export function CurationFields({
  draft,
  onChange,
  requireConfirm,
  linkOut = false,
}: {
  draft: CurationDraft;
  onChange: (next: CurationDraft) => void;
  requireConfirm: boolean;
  linkOut?: boolean;
}) {
  const set = (patch: Partial<CurationDraft>) => onChange({ ...draft, ...patch });

  return (
    <section className={f.block}>
      <header className={f.head}>
        <h2>{linkOut ? "Credit" : "Credit and license"}</h2>
        <p>
          {linkOut
            ? "Who made this game. Shown on the game page; Play opens the creator's page."
            : "Who made this game, and the license that lets us host it. Shown on the game page."}
        </p>
      </header>

      <Field label="Creator name">
        <TextInput
          value={draft.creatorName}
          onChange={(e) => set({ creatorName: e.target.value })}
          placeholder="As the creator credits themselves"
          maxLength={120}
          required
        />
      </Field>

      <Field label="Creator link" hint="Website or profile">
        <TextInput
          type="url"
          value={draft.creatorUrl}
          onChange={(e) => set({ creatorUrl: e.target.value })}
          placeholder="https://"
        />
      </Field>

      <Field label="Original game link" hint="Where the creator hosts it">
        <TextInput
          type="url"
          value={draft.sourceUrl}
          onChange={(e) => set({ sourceUrl: e.target.value })}
          placeholder="https://"
        />
      </Field>

      {linkOut ? null : (
        <>
          <Field label="Source code link" hint="Required for GPL, AGPL and MPL">
            <TextInput
              type="url"
              value={draft.sourceCodeUrl}
              onChange={(e) => set({ sourceCodeUrl: e.target.value })}
              placeholder="https://github.com/…"
            />
          </Field>

          <Field label="License">
            <SelectInput value={draft.license} onChange={(e) => set({ license: e.target.value })} required>
              <option value="" disabled>
                Choose a license
              </option>
              {CURATION_LICENSES.map((id) => (
                <option key={id} value={id}>
                  {id === "Permission" ? licenseLabel(id) : `${id} · ${licenseLabel(id)}`}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="License link" hint="The LICENSE file in the repo">
            <TextInput
              type="url"
              value={draft.licenseUrl}
              onChange={(e) => set({ licenseUrl: e.target.value })}
              placeholder="https://"
            />
          </Field>

          <label className="flex items-start gap-2 text-ui">
            <input type="checkbox" checked={draft.modified} onChange={(e) => set({ modified: e.target.checked })} />
            <span>
              We changed the build (for example removed trackers or ads)
              <span className="block text-caption text-text-subtle">The credit then says “Modified for PlayInWeb”.</span>
            </span>
          </label>
        </>
      )}

      {requireConfirm && !linkOut ? (
        <label className="flex items-start gap-2 text-ui">
          <input type="checkbox" checked={draft.confirmed} onChange={(e) => set({ confirmed: e.target.checked })} />
          <span>
            I checked that this license covers the code and the art and audio, and the zip includes the LICENSE file
          </span>
        </label>
      ) : null}
    </section>
  );
}
