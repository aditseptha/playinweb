"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ds/avatar";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { InlineAlert } from "@/components/ds/feedback";
import { TextArea } from "@/components/ds/field";
import { Skeleton } from "@/components/ds/skeleton";
import { focusRing } from "@/components/ds/styles";
import { IconChevronDown, IconComment, IconHeart } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatCommentTime, formatPlays } from "@/lib/format";
import { siteOrigin } from "@/lib/host";
import { cachedAvatarUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import { requestBadgeCheck } from "@/lib/badge-events";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  author_id: string;
  parent_id: string | null;
  like_count: number;
  liked: boolean;
  profiles: { handle: string; display_name: string; avatar_path?: string | null } | null;
};

const COMMENT_MAX = 500;
/** Threads shown before "Show all {n} comments". */
const FIRST_THREADS = 3;

const COMMENT_FIELDS =
  "id, body, created_at, updated_at, author_id, parent_id, like_count, profiles!project_comments_author_id_fkey ( handle, display_name, avatar_path )";

export function ProjectComments({
  projectId,
  ownerId,
  creatorName,
  enabled,
  initialCount,
  onCountChange,
}: {
  projectId: string;
  /** The game's creator: their comments get a "Creator" badge. */
  ownerId: string;
  creatorName: string;
  enabled: boolean;
  /** Comment count from the server (replies included), shown until the list loads. */
  initialCount: number;
  /** Reports the live count (replies included) so the page shows one number everywhere. */
  onCountChange?: (count: number) => void;
}) {
  const { user, profile } = useAuth();
  const { openLogin } = useLoginDialog();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (user && profile?.avatar_path) cachedAvatarUrl(user.id, profile.avatar_path);
  }, [user, profile]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("project_comments")
      .select(COMMENT_FIELDS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .then(async ({ data, error: loadFailed }) => {
        if (loadFailed) {
          // Keep the server count and offer a retry instead of claiming there are no comments.
          if (!cancelled) setLoadError(true);
          return;
        }
        const rows = ((data as unknown as Omit<Comment, "liked">[]) ?? []).map((row) => {
          cachedAvatarUrl(row.author_id, row.profiles?.avatar_path);
          return {
            ...row,
            parent_id: row.parent_id ?? null,
            like_count: row.like_count ?? 0,
            updated_at: row.updated_at ?? null,
            liked: false,
          };
        });
        if (user && rows.length) {
          const { data: likes } = await supabase
            .from("project_comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
            .in(
              "comment_id",
              rows.map((row) => row.id),
            );
          const liked = new Set((likes ?? []).map((row) => row.comment_id));
          for (const row of rows) row.liked = liked.has(row.id);
        }
        if (!cancelled) {
          setLoadError(false);
          setComments(rows);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, user, attempt]);

  const count = comments ? comments.length : initialCount;
  useEffect(() => {
    if (comments) onCountChange?.(comments.length);
  }, [comments, onCountChange]);

  const threads = useMemo(() => {
    const replies = new Map<string, Comment[]>();
    const roots: Comment[] = [];
    for (const row of comments ?? []) {
      if (row.parent_id) {
        const list = replies.get(row.parent_id) ?? [];
        list.push(row);
        replies.set(row.parent_id, list);
      } else {
        roots.push(row);
      }
    }
    return { roots, replies };
  }, [comments]);

  if (!enabled) return null;

  async function postComment(text: string, parentId: string | null) {
    if (!user || !profile || !text) return false;
    setPending(true);
    setError("");
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("project_comments")
      .insert({ project_id: projectId, author_id: user.id, body: text, parent_id: parentId })
      .select("id, body, created_at, updated_at, author_id, parent_id, like_count")
      .single();
    setPending(false);
    if (insertError || !data) {
      setError(insertError?.message || "Could not post.");
      return false;
    }
    requestBadgeCheck();
    setComments((rows) => [
      ...(rows ?? []),
      {
        ...data,
        parent_id: data.parent_id ?? parentId,
        like_count: data.like_count ?? 0,
        updated_at: data.updated_at ?? null,
        liked: false,
        profiles: {
          handle: profile.handle,
          display_name: profile.display_name,
          avatar_path: profile.avatar_path,
        },
      },
    ]);
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (await postComment(text, null)) setBody("");
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    const text = replyBody.trim();
    if (!replyTo) return;
    if (await postComment(text, replyTo)) {
      setReplyBody("");
      setReplyTo(null);
    }
  }

  async function onLike(comment: Comment) {
    if (!user) {
      openLogin();
      return;
    }
    const supabase = createClient();
    if (comment.liked) {
      await supabase.from("project_comment_likes").delete().eq("comment_id", comment.id).eq("user_id", user.id);
      setComments((rows) =>
        (rows ?? []).map((row) =>
          row.id === comment.id ? { ...row, liked: false, like_count: Math.max(0, row.like_count - 1) } : row,
        ),
      );
      return;
    }
    await supabase.from("project_comment_likes").insert({ comment_id: comment.id, user_id: user.id });
    setComments((rows) =>
      (rows ?? []).map((row) => (row.id === comment.id ? { ...row, liked: true, like_count: row.like_count + 1 } : row)),
    );
  }

  function startReply(comment: Comment) {
    if (!user) {
      openLogin();
      return;
    }
    setReplyTo(comment.parent_id ?? comment.id);
    setReplyBody("");
    setEditingId(null);
    setError("");
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setReplyTo(null);
    setError("");
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    const text = editBody.trim();
    if (!user || !editingId || !text) return;
    setPending(true);
    setError("");
    const supabase = createClient();
    const editedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("project_comments")
      .update({ body: text, updated_at: editedAt })
      .eq("id", editingId)
      .eq("author_id", user.id);
    setPending(false);
    if (updateError) {
      setError(updateError.message || "Could not save.");
      return;
    }
    setComments((rows) =>
      (rows ?? []).map((row) => (row.id === editingId ? { ...row, body: text, updated_at: editedAt } : row)),
    );
    setEditingId(null);
    setEditBody("");
  }

  async function onDelete(comment: Comment) {
    if (!user || comment.author_id !== user.id) return;
    if (!window.confirm("Delete this comment?")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("project_comments")
      .delete()
      .eq("id", comment.id)
      .eq("author_id", user.id);
    if (deleteError) {
      setError(deleteError.message || "Could not delete.");
      return;
    }
    setComments((rows) => (rows ?? []).filter((row) => row.id !== comment.id && row.parent_id !== comment.id));
    if (editingId === comment.id) setEditingId(null);
    if (replyTo === comment.id) setReplyTo(null);
  }

  const itemProps = (c: Comment) => ({
    comment: c,
    mine: user?.id === c.author_id,
    creator: c.author_id === ownerId,
    editing: editingId === c.id,
    editBody,
    pending,
    onLike: () => void onLike(c),
    onReply: () => startReply(c),
    onEdit: () => startEdit(c),
    onDelete: () => void onDelete(c),
    onEditBody: setEditBody,
    onSaveEdit: (e: FormEvent) => void onSaveEdit(e),
    onCancelEdit: () => setEditingId(null),
  });

  const roots = showAll ? threads.roots : threads.roots.slice(0, FIRST_THREADS);
  const hidden = threads.roots.length - roots.length;

  return (
    <section aria-labelledby="comments-title" className="flex flex-col gap-5">
      <h2 id="comments-title" className="flex items-center gap-2.5">
        <span className="font-pw-display text-[28px] leading-none font-extrabold uppercase italic">Comments</span>
        <Badge tone="neutral" className="tabular-nums">
          <span className="sr-only">Count: </span>
          {formatPlays(count)}
        </Badge>
      </h2>

      {user ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex gap-3 rounded-pw-xl border border-pw-line bg-pw-surface-1 p-3 sm:p-4"
        >
          <Avatar
            name={profile?.display_name || user.email || "You"}
            src={profile?.avatar_path ? cachedAvatarUrl(user.id, profile.avatar_path) || undefined : undefined}
            size="sm"
            className="max-sm:hidden"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="comment-body" className="sr-only">
              Comment
            </label>
            <TextArea
              id="comment-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={COMMENT_MAX}
              placeholder="Share what you thought, or your best score…"
              className="min-h-[5.5rem]"
            />
            {error ? <p className="text-pw-body-sm text-pw-danger">{error}</p> : null}
            <div className="flex items-center gap-3">
              <CharCount value={body} />
              <Button type="submit" variant="primary" size="sm" className="ml-auto" disabled={pending || !body.trim()}>
                {pending ? "Posting…" : "Post"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-pw-xl border border-pw-line bg-pw-surface-1 p-3 sm:flex-nowrap sm:p-4">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-pw-md bg-pw-surface-3 text-pw-sky">
            <IconComment className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-pw-body font-semibold text-pw-text">Sign in to comment</p>
            <p className="text-pw-body-sm text-pw-text-soft">Tell {creatorName} what you thought, or share your best score.</p>
          </div>
          <Button variant="secondary" size="sm" className="max-sm:w-full" onClick={() => openLogin()}>
            Sign in
          </Button>
        </div>
      )}

      {loadError && comments === null ? (
        <InlineAlert
          tone="danger"
          title="Comments didn't load"
          action={
            <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          }
        />
      ) : comments === null ? (
        initialCount > 0 ? (
          <div aria-hidden className="flex flex-col gap-5">
            {Array.from({ length: Math.min(3, initialCount) }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </div>
            ))}
          </div>
        ) : null
      ) : threads.roots.length === 0 ? (
        <EmptyState
          kind="inline"
          icon={IconComment}
          title="No comments yet"
          body="Be the first to say what you thought."
          className="rounded-pw-xl border border-pw-line py-5"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-pw-line">
          {roots.map((c) => (
            <li key={c.id} className="py-4 first:pt-0">
              <CommentItem {...itemProps(c)} />
              {(threads.replies.get(c.id) ?? []).length > 0 || replyTo === c.id ? (
                <ul className="mt-3 ml-11 flex flex-col gap-3 border-l border-pw-line pl-4">
                  {(threads.replies.get(c.id) ?? []).map((reply) => (
                    <li key={reply.id}>
                      <CommentItem {...itemProps(reply)} />
                    </li>
                  ))}
                  {replyTo === c.id && user ? (
                    <li>
                      <form onSubmit={(e) => void onReply(e)} className="flex flex-col gap-2">
                        <label htmlFor={`reply-${c.id}`} className="sr-only">
                          Reply
                        </label>
                        <TextArea
                          id={`reply-${c.id}`}
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          rows={2}
                          maxLength={COMMENT_MAX}
                          placeholder="Write a reply"
                          className="min-h-[4.5rem]"
                        />
                        <div className="flex items-center gap-2">
                          <Button type="submit" variant="primary" size="sm" disabled={pending || !replyBody.trim()}>
                            {pending ? "Posting…" : "Reply"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                            Cancel
                          </Button>
                          <CharCount value={replyBody} />
                        </div>
                      </form>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-pw-sm text-pw-body-sm font-semibold text-pw-link hover:underline",
            focusRing,
          )}
        >
          Show all {formatPlays(count)} comments
          <IconChevronDown aria-hidden className="size-4" />
        </button>
      ) : null}
    </section>
  );
}

function CharCount({ value }: { value: string }) {
  return (
    <p className="text-pw-caption text-pw-faint tabular-nums">
      {value.length}/{COMMENT_MAX}
    </p>
  );
}

const textAction = cn(
  "relative inline-flex items-center gap-1 rounded-pw-sm text-pw-caption font-semibold text-pw-muted transition-colors hover:text-pw-text",
  focusRing,
);

function CommentItem({
  comment,
  mine,
  creator,
  editing,
  editBody,
  pending,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onEditBody,
  onSaveEdit,
  onCancelEdit,
}: {
  comment: Comment;
  mine: boolean;
  creator: boolean;
  editing: boolean;
  editBody: string;
  pending: boolean;
  onLike: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditBody: (value: string) => void;
  onSaveEdit: (e: FormEvent) => void;
  onCancelEdit: () => void;
}) {
  const name = comment.profiles?.display_name || comment.profiles?.handle || "Player";
  return (
    <div className="flex gap-3">
      <Avatar name={name} src={cachedAvatarUrl(comment.author_id, comment.profiles?.avatar_path) || undefined} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-pw-body-sm">
          {comment.profiles ? (
            <Link
              href={siteOrigin(comment.profiles.handle)}
              className={cn("rounded-pw-sm font-semibold text-pw-text hover:underline", focusRing)}
            >
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-pw-text">{name}</span>
          )}
          <span className="text-pw-caption text-pw-muted">{formatCommentTime(comment.created_at)}</span>
          {comment.updated_at ? <span className="text-pw-caption text-pw-muted">(edited)</span> : null}
          {creator ? <Badge tone="primary">Creator</Badge> : null}
        </p>
        {editing ? (
          <form onSubmit={onSaveEdit} className="mt-2 flex flex-col gap-2">
            <label htmlFor={`edit-${comment.id}`} className="sr-only">
              Edit comment
            </label>
            <TextArea
              id={`edit-${comment.id}`}
              value={editBody}
              onChange={(e) => onEditBody(e.target.value)}
              rows={3}
              maxLength={COMMENT_MAX}
              className="min-h-[4.5rem]"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={pending || !editBody.trim()}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
              <CharCount value={editBody} />
            </div>
          </form>
        ) : (
          <p className="mt-1 text-pw-body break-words whitespace-pre-wrap text-pw-text">{comment.body}</p>
        )}
        {editing ? null : (
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onLike}
              className={cn(textAction, comment.liked && "text-pw-text")}
              aria-pressed={comment.liked}
              aria-label={`Like comment${comment.like_count > 0 ? `, ${comment.like_count} likes` : ""}`}
            >
              <IconHeart aria-hidden className={cn("size-3.5", comment.liked && "text-pw-gold")} />
              {comment.like_count > 0 ? formatPlays(comment.like_count) : null}
            </button>
            <button type="button" onClick={onReply} className={textAction}>
              Reply
            </button>
            {mine ? (
              <>
                <button type="button" onClick={onEdit} className={textAction}>
                  Edit
                </button>
                <button type="button" onClick={onDelete} className={cn(textAction, "hover:text-pw-danger")}>
                  Delete
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
