"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { CHECKOUT_MAX_AMOUNT } from "@/lib/polar";
import { isPersistedId, type ProjectRecord } from "@/lib/projects";

const DONATE_PRESETS = [1, 3, 5, 10, 25];

export function ProjectCheckout({ project }: { project: ProjectRecord }) {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const paid = project.pricing_type === "paid";
  const donate = project.pricing_type === "donate";
  const min = paid ? Number(project.min_price ?? 0) : 1;
  const suggested = donate ? Number(project.suggested_donation ?? 5) : min;
  const [amount, setAmount] = useState(
    donate
      ? (DONATE_PRESETS.includes(suggested) ? suggested : 5).toFixed(2)
      : suggested > 0
        ? suggested.toFixed(2)
        : min.toFixed(2),
  );
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const polarCheckout = searchParams.get("polar_checkout") ?? searchParams.get("checkout_id");

  const presets = useMemo(() => {
    if (paid) return [min].filter((n) => n > 0);
    return DONATE_PRESETS;
  }, [min, paid]);

  useEffect(() => {
    if (!polarCheckout || loading || !user) return;
    let cancelled = false;
    setPending(true);
    fetch("/api/polar/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId: polarCheckout, projectId: project.id }),
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
  }, [loading, polarCheckout, project.id, user]);

  if (project.pricing_type === "no_payments") return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || pending) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < min) {
      setNotice(paid ? `Minimum is $${min.toFixed(2)}.` : "Minimum is $1.00.");
      return;
    }
    if (value > CHECKOUT_MAX_AMOUNT) {
      setNotice(`Maximum is $${CHECKOUT_MAX_AMOUNT.toFixed(2)}.`);
      return;
    }
    if (!user) {
      openLogin();
      return;
    }
    if (!isPersistedId(project.id)) {
      setNotice("This listing cannot take payments yet.");
      return;
    }
    setPending(true);
    setNotice("");
    const here = window.location.href;
    const res = await fetch("/api/polar/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "donation",
        projectId: project.id,
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

  const selected = Number(amount);

  return (
    <form id="support" onSubmit={(e) => void onSubmit(e)} className="rounded-panel bg-surface-2/80 p-3">
      <p className="text-title font-semibold">{paid ? "Get this project" : "Fuel the next build"}</p>
      {presets.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.map((value) => {
            const active = Number.isFinite(selected) && Math.abs(selected - value) < 0.001;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAmount(value.toFixed(2));
                  setNotice("");
                }}
                className={cn(
                  "h-7 rounded-md px-2 text-caption font-medium transition-colors duration-150 ease-out-quint",
                  active ? "bg-accent text-accent-fg" : "bg-surface text-text-muted hover:text-text",
                )}
              >
                ${value.toFixed(value % 1 === 0 ? 0 : 2)}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui text-text-subtle">$</span>
          <TextInput
            type="number"
            min={min}
            max={CHECKOUT_MAX_AMOUNT}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
          />
        </div>
        <Button type="submit" variant="primary" className="active:translate-y-px" disabled={pending}>
          {pending ? "Redirecting…" : paid ? "Buy" : "Donate"}
        </Button>
      </div>
      <p className="mt-2 text-meta text-text-subtle">
        {paid ? `Minimum $${min.toFixed(2)}. ` : `Name your price ($1–$${CHECKOUT_MAX_AMOUNT}). `}
        Paid with Polar.
      </p>
      {notice ? <p className="mt-2 text-ui text-text-muted">{notice}</p> : null}
    </form>
  );
}
