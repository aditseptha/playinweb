"use client";

import { ICON_GALLERY, ICON_SIZES, IconBookmark, IconHeart, type AppIcon } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { apexHref } from "@/lib/host";

const GROUNDS = [
  { name: "On blue", background: "#062a73", color: "#f4f7ff" },
  { name: "On a cover", background: "#14110e", color: "#f6e7c1" },
] as const;

function Cell({ Icon, size, color }: { Icon: AppIcon; size: number; color: string }) {
  return <Icon width={size} height={size} style={{ color }} />;
}

export default function DesignIconsPage() {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-heading font-semibold">Page not found</h1>
        <LinkButton href={apexHref("/")} variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <p className="text-ui text-text-muted">
        <a href={apexHref("/admin")} className="text-link">
          Admin
        </a>
      </p>
      <h1 className="mt-2 text-heading font-semibold">Icons</h1>
      <p className="mt-2 max-w-xl text-ui text-text-muted">
        Icons8 iOS Filled, at 16, 20, and 24. Color comes from the surface they sit on.
      </p>

      {GROUNDS.map((ground) => (
        <section key={ground.name} className="mt-8">
          <h2 className="text-ui font-semibold">{ground.name}</h2>
          <div className="mt-3 rounded-2xl p-4" style={{ background: ground.background }}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {ICON_GALLERY.map(({ name, Icon }) => (
                <li key={`${ground.name}-${name}`} className="flex items-center gap-3">
                  <span className="flex items-end gap-2">
                    {ICON_SIZES.map((size) => (
                      <Cell key={size} Icon={Icon} size={size} color={ground.color} />
                    ))}
                  </span>
                  <span className="text-xs" style={{ color: ground.color }}>
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="mt-8">
        <h2 className="text-ui font-semibold">Saved and liked</h2>
        <p className="mt-1 text-ui text-text-muted">The quieter mark is the same icon before it is saved or liked.</p>
        <div className="mt-3 flex gap-6 rounded-2xl p-4" style={{ background: "#062a73", color: "#f4f7ff" }}>
          <span className="flex items-center gap-2">
            <IconBookmark filled={false} width={24} height={24} />
            <IconBookmark width={24} height={24} />
            Bookmark
          </span>
          <span className="flex items-center gap-2">
            <IconHeart filled={false} width={24} height={24} />
            <IconHeart width={24} height={24} />
            Heart
          </span>
        </div>
      </section>
    </div>
  );
}
