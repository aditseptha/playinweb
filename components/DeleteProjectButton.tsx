"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProject, type ProjectRecord } from "@/lib/projects";

export function DeleteProjectButton({
  project,
  onDeleted,
  size = "sm",
  className,
}: {
  project: ProjectRecord;
  onDeleted: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function onConfirmDelete() {
    setDeleting(true);
    setError("");
    const result = await deleteProject(project);
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    onDeleted();
  }

  return (
    <div className={className}>
      {confirming ? (
        <div className="rounded-panel border border-danger/30 bg-danger/5 px-4 py-3">
          <p className="text-body font-medium text-text">
            Delete &ldquo;{project.title}&rdquo; permanently?
          </p>
          <p className="mt-1 max-w-xl text-ui text-text-muted">
            This removes the listing, media, and stats. This cannot be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size={size}
              disabled={deleting}
              onClick={() => {
                setConfirming(false);
                setError("");
              }}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void onConfirmDelete()}
              className="inline-flex h-8 items-center rounded-lg bg-danger px-3 text-ui font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
            >
              {deleting ? "Deleting…" : "Yes, delete game"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={deleting}
          onClick={() => setConfirming(true)}
          className="inline-flex h-8 items-center rounded-lg px-3 text-ui font-medium text-danger transition-colors hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-45"
        >
          Delete game
        </button>
      )}
      {error ? <p className="mt-2 text-ui text-danger">{error}</p> : null}
    </div>
  );
}
