"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { publicMediaUrl } from "@/lib/media";

const PRESETS = [1, 3, 5, 10, 25, 100];

export default function TipPage() {
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const [amount, setAmount] = useState("5.00");
  const [custom, setCustom] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const selected = Number(amount);
  const parts = amountParts(amount);
  const stamp = new Date().toLocaleString("en", { month: "long", year: "numeric" });
  const supporter = profile?.display_name || (profile?.handle ? `@${profile.handle}` : "Supporter");
  const polarCheckout = searchParams.get("polar_checkout") ?? searchParams.get("checkout_id");

  useEffect(() => {
    if (!polarCheckout || loading || !user) return;
    let cancelled = false;
    setPending(true);
    fetch("/api/polar/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId: polarCheckout }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { amount?: number; error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          setNotice(data?.error || "Could not confirm this payment.");
          return;
        }
        const paidAmount = Number(data?.amount);
        setNotice(
          Number.isFinite(paidAmount)
            ? `Thanks — ${formatMoney(paidAmount)} was paid.`
            : "Thanks — payment received.",
        );
        const url = new URL(window.location.href);
        url.searchParams.delete("polar_checkout");
        url.searchParams.delete("checkout_id");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      })
      .catch(() => {
        if (!cancelled) setNotice("Could not confirm this payment.");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, polarCheckout, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || pending) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      setNotice("Minimum is $1.00.");
      return;
    }
    if (!user) {
      openLogin();
      return;
    }
    setPending(true);
    setNotice("");
    const here = window.location.href;
    const res = await fetch("/api/polar/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tip",
        amount: value,
        successUrl: here,
        returnUrl: here,
      }),
    });
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !data?.url) {
      setPending(false);
      setNotice(data?.error || "Could not start Polar checkout.");
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <div className="flex min-h-[calc(100dvh-9.75rem)] min-w-0 items-center justify-center">
    <div className="mx-auto w-full max-w-3xl text-center">
      <h1 className="text-[40px] font-semibold tracking-tight sm:text-[48px]">Support the project</h1>
      <p className="mx-auto mt-4 max-w-[52ch] text-body leading-relaxed text-text-muted">
        This is a place to go beyond a thank you. A tip is optional. Anything you send goes to the team building
        PlayInWeb, not to a game listing.
      </p>
      <p className="mt-10 text-caption text-text-subtle">Choose an amount</p>
      <form onSubmit={onSubmit} className="mt-4">
        <div className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1">
          {PRESETS.map((value) => {
            const active = !custom && Number.isFinite(selected) && Math.abs(selected - value) < 0.001;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setCustom(false);
                  setAmount(value.toFixed(2));
                  setNotice("");
                }}
                className={cn(
                  "h-10 shrink-0 rounded-full px-4 text-ui font-medium transition-colors",
                  active ? "bg-accent text-accent-fg" : "text-text-muted hover:text-text",
                )}
              >
                ${value}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setAmount("");
              setNotice("");
            }}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-ui font-medium transition-colors",
              custom ? "bg-accent text-accent-fg" : "text-text-muted hover:text-text",
            )}
          >
            Other
          </button>
        </div>
        <div className="mt-6 flex justify-center">
          <div className="flex w-fit items-baseline text-[80px] font-semibold leading-none tracking-tight tabular">
            <span className="text-text-subtle">$</span>
            <span className="relative min-w-[1ch]">
              <span className="pointer-events-none">
                {parts.int}
                {parts.frac ? <span className="text-text-subtle">{parts.frac}</span> : null}
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label="Tip amount"
                size={1}
                value={amount}
                onChange={(e) => {
                  setCustom(true);
                  setAmount(sanitizeAmount(e.target.value));
                }}
                className="absolute inset-0 w-full bg-transparent p-0 text-[80px] font-semibold leading-none tracking-tight tabular text-transparent caret-text outline-none"
              />
            </span>
          </div>
        </div>
        <div className="relative mt-10">
          <HeartPeek amount={selected} />
          <Certificate
            amount={Number.isFinite(selected) ? formatMoney(selected) : "$0.00"}
            supporter={supporter}
            stamp={stamp}
            name={profile?.display_name || supporter}
            avatarUrl={publicMediaUrl(profile?.avatar_path) || undefined}
          />
        </div>
        <Button type="submit" variant="primary" className="mt-6" disabled={pending}>
          {pending ? "Redirecting…" : "Send tip"}
        </Button>
        <p className="mt-3 text-meta text-text-subtle">Minimum $1.00. Paid with Polar.</p>
        {notice ? <p className="mt-2 text-ui text-warning">{notice}</p> : null}
      </form>
    </div>
    </div>
  );
}

function Certificate({
  amount,
  supporter,
  stamp,
  name,
  avatarUrl,
}: {
  amount: string;
  supporter: string;
  stamp: string;
  name: string;
  avatarUrl?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useRef(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, live: false });

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce.current) return;
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const px = (e.clientX - box.left) / box.width;
    const py = (e.clientY - box.top) / box.height;
    setTilt({
      rx: (0.5 - py) * 14,
      ry: (px - 0.5) * 18,
      gx: px * 100,
      gy: py * 100,
      live: true,
    });
  }

  function onLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, live: false });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative z-10 overflow-hidden rounded-[28px] bg-surface text-left shadow-panel will-change-transform"
      style={{
        transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
        transition: tilt.live ? "transform 40ms linear" : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div className="flex items-baseline justify-between gap-4 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Image
              src="/playinweb-icon.png"
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-5 shrink-0 rounded-md"
            />
            <Image
              src="/playinweb-lettermark-white.webp"
              alt="PlayInWeb"
              width={109}
              height={20}
              unoptimized
              className="hidden h-5 w-auto shrink-0 translate-y-[2px] dark:block"
            />
            <Image
              src="/playinweb-lettermark-black.webp"
              alt="PlayInWeb"
              width={109}
              height={20}
              unoptimized
              className="h-5 w-auto shrink-0 translate-y-[2px] dark:hidden"
            />
          </div>
          <span className="text-[22px] font-semibold leading-none tracking-tight">certificate</span>
        </div>
        <p className="shrink-0 text-caption text-text-subtle">
          {supporter}
          <span className="text-text-subtle/70"> · Sponsor</span>
        </p>
      </div>
      <div className="relative">
        <div className="border-t border-dashed border-border-strong" />
        <span className="absolute left-0 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg" />
        <span className="absolute right-0 top-1/2 size-6 translate-x-1/2 -translate-y-1/2 rounded-full bg-bg" />
      </div>
      <div className="flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:px-8">
        <Image
          src="/playinweb-donation.webp"
          alt="PlayInWeb donation"
          width={256}
          height={256}
          unoptimized
          className="size-28 shrink-0 rounded-[22px] sm:size-32"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-semibold tracking-tight">{amount} donation</p>
          <p className="mt-1.5 max-w-[36ch] text-caption leading-relaxed text-text-muted">
            Playing stays free, with or without a tip. What you give helps the developer improve community features.
          </p>
        </div>
        <Stamp label={stamp} name={name} avatarUrl={avatarUrl} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{
          background: `radial-gradient(28rem circle at ${tilt.gx}% ${tilt.gy}%, oklch(1 0 0 / 0.28), transparent 58%)`,
        }}
      />
    </div>
  );
}

function HeartPeek({ amount }: { amount: number }) {
  const size = heartSize(amount);
  const tuck = heartTuck(amount);
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      style={{ width: size, height: size, transform: `rotate(-16deg) translateY(${tuck}px)` }}
      className="pointer-events-none absolute bottom-full left-14 z-0 text-[oklch(68%_0.26_18)] drop-shadow-[0_0_12px_oklch(68%_0.26_18/0.45)] transition-[width,height,transform] duration-300 ease-out"
    >
      <path
        fill="currentColor"
        d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"
      />
    </svg>
  );
}

function heartScale(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const t = Math.min(100, Math.max(1, n));
  return ((t - 1) / 99) ** 0.32;
}

function heartSize(amount: number) {
  return 56 + heartScale(amount) * (120 - 56);
}

function heartTuck(amount: number) {
  return 12 + heartScale(amount) * 16;
}

function Stamp({
  label,
  name,
  avatarUrl,
}: {
  label: string;
  name: string;
  avatarUrl?: string;
}) {
  const rim = `PlayInWeb supporter · ${label} · PlayInWeb supporter · ${label} · `;
  return (
    <div className="relative mx-auto grid size-[140px] shrink-0 place-items-center text-text-muted sm:mx-0">
      <svg viewBox="0 0 140 140" className="absolute inset-0" aria-hidden>
        <circle cx="70" cy="70" r="67" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
        <circle cx="70" cy="70" r="58" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
        <defs>
          <path id="tip-stamp-rim" d="M70,70 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
        </defs>
        <text className="fill-current text-[8px] uppercase" style={{ letterSpacing: "0.22em" }}>
          <textPath href="#tip-stamp-rim">{rim}</textPath>
        </text>
      </svg>
      <Avatar name={name} src={avatarUrl} size={56} />
    </div>
  );
}

function sanitizeAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
}

function amountParts(value: string) {
  const match = value.match(/^(\d*)(\.\d*)?$/);
  if (!match) return { int: value || "0", frac: "" };
  return { int: match[1] === "" ? "0" : match[1], frac: match[2] ?? "" };
}
