"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Chip } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { TextInput } from "@/components/ds/field";
import { IconHeart } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/lib/auth";
import { isFeaturePubliclyEnabled, useFeature } from "@/lib/features";
import { formatMoney } from "@/lib/format";
import { CHECKOUT_MAX_AMOUNT } from "@/lib/polar";
import { isPersistedId, type ProjectRecord } from "@/lib/projects";

const DONATE_PRESETS = [1, 3, 5, 10, 25];

export function ProjectCheckout({ project, creatorName }: { project: ProjectRecord; creatorName: string }) {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { feature: donationsFeature, loading: donationsLoading } = useFeature("donations");
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
  const [confirmedCheckout, setConfirmedCheckout] = useState<string | null>(null);
  const confirming = Boolean(polarCheckout && !loading && user) && confirmedCheckout !== polarCheckout;
  const busy = pending || confirming;

  const presets = useMemo(() => {
    if (paid) return [min].filter((n) => n > 0);
    return DONATE_PRESETS;
  }, [min, paid]);

  useEffect(() => {
    if (!polarCheckout || loading || !user) return;
    let cancelled = false;
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
        if (!cancelled) setConfirmedCheckout(polarCheckout);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, polarCheckout, project.id, user]);

  if (project.pricing_type === "no_payments") return null;
  if (donationsLoading) return null;
  if (!isFeaturePubliclyEnabled(donationsFeature, "donations")) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || busy) return;
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
    <form
      id="support"
      onSubmit={(e) => void onSubmit(e)}
      aria-labelledby="support-title"
      className="flex flex-col gap-3 rounded-pw-xl border border-pw-line bg-pw-surface-1 p-4"
    >
      <div>
        <h2 id="support-title" className="flex items-center gap-2 text-pw-body font-bold text-pw-text">
          <IconHeart aria-hidden className="size-4 text-pw-gold" />
          {paid ? "Get this game" : `Support ${creatorName}`}
        </h2>
        <p className="mt-0.5 text-pw-body-sm text-pw-text-soft">
          {paid
            ? `Pay what you want, from ${formatMoney(min)}.`
            : `Name your price, ${formatMoney(1)}–${formatMoney(CHECKOUT_MAX_AMOUNT)}.`}{" "}
          Paid securely with Polar.
        </p>
      </div>
      {presets.length > 1 ? (
        <div role="group" aria-label="Amount" className="flex flex-wrap gap-2">
          {presets.map((value) => {
            const active = Number.isFinite(selected) && Math.abs(selected - value) < 0.001;
            return (
              <Chip
                key={value}
                size="sm"
                pressed={active}
                onClick={() => {
                  setAmount(value.toFixed(2));
                  setNotice("");
                }}
              >
                ${value.toFixed(value % 1 === 0 ? 0 : 2)}
              </Chip>
            );
          })}
        </div>
      ) : null}
      <div className="relative">
        <label htmlFor="support-amount" className="sr-only">
          Amount in US dollars
        </label>
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-pw-body text-pw-muted">
          $
        </span>
        <TextInput
          id="support-amount"
          type="number"
          inputMode="decimal"
          min={min}
          max={CHECKOUT_MAX_AMOUNT}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="pl-8 tabular-nums"
        />
      </div>
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? "Redirecting…" : paid ? "Buy" : "Support"}
      </Button>
      {notice ? (
        <p role="status" className="text-pw-body-sm text-pw-text-soft">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
