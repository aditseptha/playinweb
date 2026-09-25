"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { IconThumbUp } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatCommentTime, formatPlays } from "@/lib/format";
import { siteOrigin } from "@/lib/host";
import { cachedAvatarUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";

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

const COMMENT_FIELDS =
  "id, body, created_at, updated_at, author_id, parent_id, like_count, profiles!project_comments_author_id_fkey ( handle, display_name, avatar_path )";

export function ProjectComments({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { user, profile } = useAuth();
  const { openLogin } = useLoginDialog();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      .then(async ({ data }) => {
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
        if (!cancelled) setComments(rows);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, user]);

  const threads = useMemo(() => {
    const replies = new Map<string, Comment[]>();
    const roots: Comment[] = [];
    for (const row of comments) {
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
    setComments((rows) => [
      ...rows,
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
        rows.map((row) =>
          row.id === comment.id ? { ...row, liked: false, like_count: Math.max(0, row.like_count - 1) } : row,
        ),
      );
      return;
    }
    await supabase.from("project_comment_likes").insert({ comment_id: comment.id, user_id: user.id });
    setComments((rows) =>
      rows.map((row) => (row.id === comment.id ? { ...row, liked: true, like_count: row.like_count + 1 } : row)),
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
      rows.map((row) => (row.id === editingId ? { ...row, body: text, updated_at: editedAt } : row)),
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
    setComments((rows) => rows.filter((row) => row.id !== comment.id && row.parent_id !== comment.id));
    if (editingId === comment.id) setEditingId(null);
    if (replyTo === comment.id) setReplyTo(null);
  }

  return (
    <section className="mt-10">
      <h2 className="text-heading font-semibold">Comments</h2>
      <ul className="mt-4 flex flex-col gap-5">
        {threads.roots.length === 0 ? (
          <li className="text-ui text-text-muted">No comments yet.</li>
        ) : (
          threads.roots.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                mine={user?.id === c.author_id}
                editing={editingId === c.id}
                editBody={editBody}
                pending={pending}
                onLike={() => void onLike(c)}
                onReply={() => startReply(c)}
                onEdit={() => startEdit(c)}
                onDelete={() => void onDelete(c)}
                onEditBody={setEditBody}
                onSaveEdit={(e) => void onSaveEdit(e)}
                onCancelEdit={() => setEditingId(null)}
              />
              {(threads.replies.get(c.id) ?? []).length > 0 || replyTo === c.id ? (
                <ul className="mt-3 ml-11 flex flex-col gap-3 border-l border-border pl-4">
                  {(threads.replies.get(c.id) ?? []).map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        comment={reply}
                        mine={user?.id === reply.author_id}
                        editing={editingId === reply.id}
                        editBody={editBody}
                        pending={pending}
                        onLike={() => void onLike(reply)}
                        onReply={() => startReply(reply)}
                        onEdit={() => startEdit(reply)}
                        onDelete={() => void onDelete(reply)}
                        onEditBody={setEditBody}
                        onSaveEdit={(e) => void onSaveEdit(e)}
                        onCancelEdit={() => setEditingId(null)}
                      />
                    </li>
                  ))}
                  {replyTo === c.id && user ? (
                    <li>
                      <form onSubmit={(e) => void onReply(e)} className="flex flex-col gap-2">
                        <TextArea
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
          ))
        )}
      </ul>
      {user ? (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 flex flex-col gap-2">
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={COMMENT_MAX}
            placeholder="Leave a comment"
            className="min-h-[5.5rem]"
          />
          {error ? <p className="text-ui text-danger">{error}</p> : null}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" className="w-fit" disabled={pending || !body.trim()}>
              {pending ? "Posting…" : "Post comment"}
            </Button>
            <CharCount value={body} />
          </div>
        </form>
      ) : (
        <p className="mt-5 text-ui text-text-muted">
          <Button type="button" variant="secondary" size="sm" onClick={() => openLogin()}>
            Sign in
          </Button>
          <span className="ml-2">to comment.</span>
        </p>
      )}
    </section>
  );
}

function CharCount({ value }: { value: string }) {
  return (
    <p className="ml-auto text-meta tabular text-text-subtle">
      {value.length}/{COMMENT_MAX}
    </p>
  );
}

function CommentItem({
  comment,
  mine,
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
  return (
    <div className="flex gap-3">
      <Avatar
        name={comment.profiles?.display_name ?? ""}
        src={cachedAvatarUrl(comment.author_id, comment.profiles?.avatar_path) || undefined}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <p className="text-caption">
          {comment.profiles ? (
            <Link href={siteOrigin(comment.profiles.handle)} className="font-medium hover:text-text-muted">
              {comment.profiles.display_name}
            </Link>
          ) : (
            <span className="font-medium">Player</span>
          )}
          <span className="ml-2 text-text-subtle">{formatCommentTime(comment.created_at)}</span>
          {comment.updated_at ? <span className="ml-2 text-text-subtle">(edited)</span> : null}
        </p>
        {editing ? (
          <form onSubmit={onSaveEdit} className="mt-1 flex flex-col gap-2">
            <TextArea
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
          <p className="mt-1 whitespace-pre-wrap text-body text-text">{comment.body}</p>
        )}
        {editing ? null : (
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLike}
              className={cn(
                "inline-flex items-center gap-1 text-caption hover:text-text",
                comment.liked ? "text-text" : "text-text-subtle",
              )}
              aria-pressed={comment.liked}
              aria-label="Like comment"
            >
              <IconThumbUp className="h-3.5 w-3.5" filled={comment.liked} />
              {comment.like_count > 0 ? formatPlays(comment.like_count) : null}
            </button>
            <button type="button" onClick={onReply} className="text-caption text-text-subtle hover:text-text">
              Reply
            </button>
            {mine ? (
              <>
                <button type="button" onClick={onEdit} className="text-caption text-text-subtle hover:text-text">
                  Edit
                </button>
                <button type="button" onClick={onDelete} className="text-caption text-text-subtle hover:text-danger">
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
