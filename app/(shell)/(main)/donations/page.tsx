"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GameThumb } from "@/components/GameThumb";
import { useLoginDialog } from "@/components/LoginDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useAuth } from "@/lib/auth";
import { money, paidOutAmount, reservedPayoutAmount } from "@/lib/cashout";
import {
  payoutCycleLabel,
  payoutDayLocalName,
  payoutScheduleLocalLabel,
  payoutScheduleLocalSentence,
} from "@/lib/payout-schedule";
import {
  DEFAULT_WALLET_SETTINGS,
  formatCommissionPct,
  readWalletSettings,
  WALLET_SETTING_IDS,
} from "@/lib/site-settings";
import { isPaypalEmail, maskEmail } from "@/lib/paypal-email";
import { formatJoined, formatMoney, gamePath } from "@/lib/format";
import { apexHref, projectPublicUrl, siteOrigin } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { isDummyDonation, isDummyPayout } from "@/lib/dummy-seed";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/types";

type Mode = "give" | "earn";

type Person = { href: string | null; label: string };

type Gift = {
  id: string;
  at: string;
  amount: number;
  earned: number;
  person: Person;
};

type Payout = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
};

type DonationRow = {
  projectId: string;
  title: string;
  handle: string | null;
  slug: string;
  cover: string;
  total: number;
  lastAt: string;
  detail: string;
  people: Person[];
  gifts: Gift[];
};

const SELECT =
  "id, amount, commission_pct, created_at, project_id, donor_email, donor_handle, creator_name, creator_handle, game_title, game_slug, projects ( title, slug, cover_path, profiles!projects_owner_id_fkey ( handle, display_name ) )";

export default function DonationsPage() {
  return (
    <Suspense fallback={<p className="text-ui text-text-muted">Loading account…</p>}>
      <DonationsView />
    </Suspense>
  );
}

function DonationsView() {
  const { user, profile, loading, refresh } = useAuth();
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const tab = useSearchParams().get("tab") === "cashout" ? "cashout" : "donations";
  const [give, setGive] = useState<DonationRow[] | null>(null);
  const [earn, setEarn] = useState<DonationRow[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [walletSettings, setWalletSettings] = useState(DEFAULT_WALLET_SETTINGS);
  const [error, setError] = useState("");
  const { commission, frequency: payoutFrequency, weekday: payoutWeekday, hourUtc: payoutHourUtc, cashoutMin } =
    walletSettings;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    createClient()
      .from("site_settings")
      .select("id, value")
      .in("id", [...WALLET_SETTING_IDS])
      .then(({ data, error: settingsError }) => {
        if (cancelled) return;
        if (!settingsError && data) setWalletSettings(readWalletSettings(data));
      });
    return () => {
      cancelled = true;
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setGive([]);
      setEarn([]);
      setPayouts([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("donations").select(SELECT).eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("projects").select("id").eq("owner_id", user.id),
      supabase.from("payouts").select("id, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(async ([givenRes, ownedRes, payoutRes]) => {
      if (cancelled) return;
      if (givenRes.error || ownedRes.error || payoutRes.error) {
        setError("Could not load donations.");
        setGive([]);
        setEarn([]);
        setPayouts([]);
        return;
      }
      const ids = (ownedRes.data ?? []).map((row) => row.id);
      const received =
        ids.length === 0
          ? { data: [], error: null }
          : await supabase.from("donations").select(SELECT).in("project_id", ids).order("created_at", { ascending: false });
      if (cancelled) return;
      if (received.error) {
        setError("Could not load donations.");
        setGive(groupDonations(givenRes.data, "give"));
        setEarn([]);
        setPayouts(((payoutRes.data ?? []) as Payout[]).filter((row) => !isDummyPayout(row)));
        return;
      }
      setGive(groupDonations(givenRes.data, "give"));
      setEarn(groupDonations(received.data, "earn"));
      setPayouts(((payoutRes.data ?? []) as Payout[]).filter((row) => !isDummyPayout(row)));
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user) {
    return (
      <div className="min-w-0 pt-4">
        <h1 className="text-display font-semibold tracking-tight">Wallet</h1>
        <p className="mt-1.5 text-body text-text-muted">Sign in to see games you gave to and earned from.</p>
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => openLogin()}>
            Sign in
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => openSignup()}>
            Create account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 pt-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-display font-semibold tracking-tight">Wallet</h1>
        <Segmented
          aria-label="Wallet menu"
          value={tab}
          options={[
            { value: "donations", label: "Donations", href: "/donations" },
            { value: "cashout", label: "Payout", href: "/donations?tab=cashout" },
          ]}
        />
      </div>
      {error ? <p className="mt-6 text-ui text-danger">{error}</p> : null}
      {tab === "cashout" ? (
        <section className="mt-10">
          <h2 className="text-title font-semibold tracking-tight">Payout</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MoneyTile
              label="Outstanding"
              value={earn === null ? "—" : formatMoney(money(sumRows(earn) - reservedPayoutAmount(payouts)))}
              note={`Payouts occur ${payoutScheduleLocalLabel(payoutFrequency, payoutWeekday, payoutHourUtc)} when your pocket is at least ${formatMoney(cashoutMin)}.`}
            />
            <MoneyTile
              label="Lifetime payout"
              value={payouts === null ? "—" : formatMoney(paidOutAmount(payouts))}
            />
          </div>
          {earn === null ? null : <CashoutHistory payouts={payouts ?? []} />}
          <PaypalConnect
            accountEmail={user.email ?? ""}
            paypal={profile?.wallet_address ?? null}
            onPaypal={refresh}
          />
          <div className="mt-10">
            <p className="text-ui font-medium">How cash out works</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-caption text-text-muted">
              <li>
                PlayInWeb keeps a {formatCommissionPct(commission)}% platform fee from each donation. That cut stays with
                the site. You receive the rest.
              </li>
              <li>
                {payoutScheduleLocalSentence(payoutFrequency, payoutWeekday, payoutHourUtc)}, if your outstanding is at
                least {formatMoney(cashoutMin)}, the full amount is sent to the PayPal on this account. There is no cash
                out button.
              </li>
              <li>
                Below {formatMoney(cashoutMin)} stays in your pocket until a{" "}
                {payoutDayLocalName(payoutFrequency, payoutWeekday, payoutHourUtc)} you have enough.
              </li>
              <li>
                Connect PayPal before each payout. Without it, that {payoutCycleLabel(payoutFrequency)} is skipped.
              </li>
            </ul>
          </div>
        </section>
      ) : (
        <>
          <DonationSection
            title="Give"
            emptyTitle="No donations yet"
            empty="Open a listing and use Donate. It will show up here with the amount."
            emptyHref="/"
            emptyLabel="Browse games"
            loading="Loading what you gave…"
            summary={(rows, total) => `${formatMoney(total)} given across ${rows.length} ${rows.length === 1 ? "game" : "games"}`}
            rows={give}
          />
          <DonationSection
            title="Earn"
            emptyTitle="No earnings yet"
            empty="When someone donates to one of your games, that game is listed here with who paid, when, and what you earned."
            emptyHref="/manage"
            emptyLabel="Manage games"
            loading="Loading what you earned…"
            summary={(rows, total) => `${formatMoney(total)} earned across ${rows.length} ${rows.length === 1 ? "game" : "games"}`}
            rows={earn}
            showGifts
          />
        </>
      )}
    </div>
  );
}

function DonationSection({
  title,
  emptyTitle,
  empty,
  emptyHref,
  emptyLabel,
  loading,
  summary,
  rows,
  showGifts,
}: {
  title: string;
  emptyTitle: string;
  empty: string;
  emptyHref: string;
  emptyLabel: string;
  loading: string;
  summary: (rows: DonationRow[], total: number) => string;
  rows: DonationRow[] | null;
  showGifts?: boolean;
}) {
  const total = (rows ?? []).reduce((n, row) => n + row.total, 0);
  return (
    <section className="mt-10">
      <h2 className="text-title font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-body text-text-muted">
        {rows === null ? loading : rows.length === 0 ? empty : summary(rows, total)}
      </p>
      {rows === null ? null : rows.length === 0 ? (
        <div className="mt-4 rounded-panel bg-surface-2 px-5 py-8 text-center">
          <p className="font-medium">{emptyTitle}</p>
          <Link
            href={emptyHref}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-surface-2 px-3.5 text-body font-medium hover:bg-surface-3"
          >
            {emptyLabel}
          </Link>
        </div>
      ) : showGifts ? (
        <ul className="mt-4 flex flex-col gap-4">
          {rows.map((row) => {
            const href =
              row.handle && row.slug ? projectPublicUrl(row.handle, row.slug) : gamePath(asGame(row));
            return (
              <li key={row.projectId} className="overflow-hidden rounded-panel bg-surface-2">
                <div className="flex items-center gap-4 px-4 py-3">
                  <Link href={href} className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <GameThumb game={asGame(row)} sizes="112px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="block truncate font-medium hover:text-text-muted">
                      {row.title}
                    </Link>
                    <p className="mt-0.5 truncate text-caption text-text-subtle">
                      {row.gifts.length} {row.gifts.length === 1 ? "donation" : "donations"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-caption text-text-subtle">Total</p>
                    <p className="text-title font-semibold tabular">{formatMoney(row.total)}</p>
                  </div>
                </div>
                <ul className="border-t border-border">
                  {row.gifts.map((gift) => (
                    <li
                      key={gift.id}
                      className="flex min-w-0 items-baseline gap-3 px-4 py-2.5 text-caption text-text-muted"
                    >
                      <div className="min-w-0 flex-1">
                        {gift.person.href ? (
                          <Link href={gift.person.href} className="truncate hover:text-text">
                            {gift.person.label}
                          </Link>
                        ) : (
                          <span className="truncate">{gift.person.label}</span>
                        )}
                        <span className="text-text-subtle"> · {formatJoined(gift.at)}</span>
                      </div>
                      <p className="shrink-0 tabular">
                        {formatMoney(gift.earned)}
                        <span className="ml-2 text-text-subtle">gave {formatMoney(gift.amount)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-panel bg-surface-2">
          {rows.map((row) => {
            const href =
              row.handle && row.slug ? projectPublicUrl(row.handle, row.slug) : gamePath(asGame(row));
            return (
              <li key={row.projectId} className="flex items-center gap-4 px-4 py-3">
                <Link href={href} className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <GameThumb game={asGame(row)} sizes="112px" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={href} className="block truncate font-medium hover:text-text-muted">
                    {row.title}
                  </Link>
                  <p className="mt-0.5 truncate text-caption text-text-subtle">
                    {row.people.length > 0 ? row.people.map((person) => person.label).join(", ") : row.detail}
                  </p>
                </div>
                <p className="shrink-0 text-ui font-semibold tabular">{formatMoney(row.total)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CashoutHistory({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) return null;
  return (
    <div className="mt-8">
      <p className="text-ui font-medium">Payout history</p>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-panel bg-surface-2 px-4">
        {payouts.map((row) => (
          <li key={row.id} className="flex items-baseline justify-between gap-3 py-2.5 text-caption text-text-muted">
            <span>
              {formatJoined(row.created_at)} · {row.status}
            </span>
            <span className="tabular">{formatMoney(Number(row.amount))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaypalConnect({
  accountEmail,
  paypal,
  onPaypal,
}: {
  accountEmail: string;
  paypal: string | null;
  onPaypal: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState(paypal ?? "");
  const [typedEmail, setTypedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [intent, setIntent] = useState<"connect" | "disconnect" | null>(null);
  const [step, setStep] = useState<"email" | "otp" | null>(null);
  const [pending, setPending] = useState(false);
  const connected = Boolean(paypal);
  const fromEmail = searchParams.get("paypal") === "1";
  const emailSaveTried = useRef(false);

  const finishPaypal = useCallback(
    async (message: string) => {
      await onPaypal();
      setStep(null);
      setIntent(null);
      setOtp("");
      setTypedEmail("");
      setNotice("");
      setToast(message);
    },
    [onPaypal],
  );

  useEffect(() => {
    setDraft(paypal ?? "");
  }, [paypal]);

  useEffect(() => {
    if (!fromEmail || emailSaveTried.current) return;
    emailSaveTried.current = true;
    let cancelled = false;
    setPending(true);
    fetch("/api/paypal/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          setNotice(body?.error || "Open the email we sent, then try again.");
          return;
        }
        await finishPaypal("PayPal email updated.");
        const url = new URL(window.location.href);
        url.searchParams.delete("paypal");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      })
      .catch(() => {
        if (!cancelled) setNotice("Could not save this PayPal account.");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finishPaypal, fromEmail]);

  function startConnect() {
    if (!isPaypalEmail(draft.trim())) {
      setNotice("Enter the email on your PayPal account.");
      return;
    }
    setNotice("");
    setTypedEmail("");
    setIntent("connect");
    setStep("email");
  }

  function startDisconnect() {
    setNotice("");
    setTypedEmail("");
    setIntent("disconnect");
    setStep("email");
  }

  async function sendCode(nextIntent: "connect" | "disconnect") {
    setPending(true);
    setNotice("");
    try {
      if (nextIntent === "connect") {
        const res = await fetch("/api/paypal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: draft.trim() }),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) {
          setNotice(body.error || "No PayPal account uses this email.");
          return false;
        }
      }
      const res = await fetch("/api/paypal/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextIntent,
          paypal: nextIntent === "connect" ? draft.trim() : null,
        }),
      });
      const body = (await res.json()) as { error?: string; rateLimited?: boolean };
      if (!res.ok && !body.rateLimited) {
        setNotice(body.error || "Could not send a confirmation email.");
        return false;
      }
      setOtp("");
      setIntent(nextIntent);
      setStep("otp");
      setNotice(body.rateLimited ? body.error || "" : "");
      return true;
    } catch {
      setNotice("Could not send a confirmation email.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function confirmAccountEmail() {
    if (!sameEmail(typedEmail, accountEmail)) {
      setNotice("Type your current email.");
      return;
    }
    if (!intent) return;
    await sendCode(intent);
  }

  async function confirmChange() {
    setPending(true);
    setNotice("");
    try {
      const res = await fetch("/api/paypal/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp,
          paypal: intent === "disconnect" ? null : draft.trim(),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice(body.error || "Could not save this PayPal account.");
        return;
      }
      if (intent === "disconnect") setDraft("");
      await finishPaypal(intent === "disconnect" ? "PayPal email removed." : "PayPal email updated.");
    } catch {
      setNotice("Could not save this PayPal account.");
    } finally {
      setPending(false);
    }
  }

  function closeDialogs() {
    if (pending) return;
    setStep(null);
    setIntent(null);
    setOtp("");
    setTypedEmail("");
    setNotice("");
  }

  return (
    <div className="mt-8">
      <p className="text-ui font-medium">Payment</p>
      <p className="mt-0.5 text-caption text-text-subtle">
        Secure PayPal payout. We only store the email you connect.
      </p>
      <form
        className="mt-2 flex w-fit max-w-full items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (connected) return;
          startConnect();
        }}
      >
        <TextInput
          type="email"
          value={draft}
          readOnly={connected}
          onChange={(e) => {
            if (connected) return;
            setDraft(e.target.value);
            setNotice("");
          }}
          placeholder="PayPal email"
          aria-label="PayPal email"
          className="w-[40rem] max-w-full"
        />
        {connected ? (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={startDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            Connect
          </Button>
        )}
      </form>
      {notice && !step ? <p className="mt-2 text-caption text-text-muted">{notice}</p> : null}
      {step === "email" ? (
        <PaypalEmailDialog
          title="Confirm your email"
          body="Type your current email to continue."
          value={typedEmail}
          onValue={setTypedEmail}
          pending={pending}
          error={notice}
          confirmLabel={pending ? "Sending…" : "Continue"}
          onCancel={closeDialogs}
          onConfirm={() => void confirmAccountEmail()}
        />
      ) : null}
      {step === "otp" && intent ? (
        <PaypalOtpDialog
          title="Enter the code"
          body={`We sent a code to ${maskEmail(accountEmail)}. Enter the numbers from “Your verification code.”`}
          otp={otp}
          onOtp={setOtp}
          confirmLabel={pending ? "Checking…" : "Confirm"}
          pending={pending}
          error={notice}
          onCancel={closeDialogs}
          onConfirm={() => void confirmChange()}
          onResend={() => void sendCode(intent)}
        />
      ) : null}
      {toast ? <PaypalToast message={toast} onGone={() => setToast("")} /> : null}
    </div>
  );
}

function sameEmail(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function PaypalToast({ message, onGone }: { message: string; onGone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onGone, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the message changes
  }, [message]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-panel bg-surface px-4 py-3 text-body shadow-panel"
    >
      {message}
    </div>
  );
}

function PaypalEmailDialog({
  title,
  body,
  value,
  onValue,
  pending,
  error,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  value: string;
  onValue: (value: string) => void;
  pending: boolean;
  error: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ready = value.trim().includes("@");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paypal-email-title"
        className="w-full max-w-sm rounded-panel bg-surface p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="paypal-email-title" className="text-title font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-body text-text-muted">{body}</p>
        <Field label="Current email" className="mt-5">
          <TextInput
            type="email"
            autoFocus
            autoComplete="email"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (ready && !pending) onConfirm();
              }
            }}
            placeholder="Current email"
          />
        </Field>
        {error ? <p className="mt-2 text-caption text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={pending || !ready}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaypalOtpDialog({
  title,
  body,
  otp,
  onOtp,
  confirmLabel,
  pending,
  error,
  onCancel,
  onConfirm,
  onResend,
}: {
  title: string;
  body: string;
  otp: string;
  onOtp: (value: string) => void;
  confirmLabel: string;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  onResend: () => void;
}) {
  const ready = /^\d{6,8}$/.test(otp.trim());

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paypal-confirm-title"
        className="w-full max-w-sm rounded-panel bg-surface p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="paypal-confirm-title" className="text-title font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-body text-text-muted">{body}</p>
        <Field label="Code" className="mt-5">
          <TextInput
            inputMode="numeric"
            autoFocus
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => onOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (ready && !pending) onConfirm();
              }
            }}
            placeholder="Code from email"
          />
        </Field>
        {error ? <p className="mt-2 text-caption text-danger">{error}</p> : null}
        <button
          type="button"
          className="mt-3 text-caption text-text-muted hover:text-text"
          disabled={pending}
          onClick={onResend}
        >
          Resend code
        </button>
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={pending || !ready}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MoneyTile({
  label,
  value,
  hint,
  note,
}: {
  label: string;
  value: string;
  hint?: string;
  note?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-panel bg-surface-2 px-6 py-7">
      <p className="text-caption text-text-subtle">
        {label}
        {hint ? <span> · {hint}</span> : null}
      </p>
      <p className="mt-4 flex items-baseline text-[80px] font-semibold leading-none tracking-tight tabular">
        {formatMoneyParts(value)}
      </p>
      {note ? <p className="mt-3 text-caption text-text-subtle">{note}</p> : null}
    </div>
  );
}

function formatMoneyParts(value: string) {
  const match = value.match(/^(\$)([\d,]+)(\.\d+)?$/);
  if (!match) return value;
  return (
    <>
      <span className="text-text-subtle">{match[1]}</span>
      {match[2]}
      {match[3] ? <span className="text-text-subtle">{match[3]}</span> : null}
    </>
  );
}

function sumRows(rows: DonationRow[] | null) {
  return (rows ?? []).reduce((n, row) => n + row.total, 0);
}

function asGame(row: DonationRow): Game {
  return {
    id: row.projectId,
    title: row.title,
    developer: row.detail,
    description: row.title,
    playUrl: "",
    thumbnailUrl: row.cover,
    screenshots: [],
    embeddable: false,
    tags: [],
    createdAt: row.lastAt,
    playCount: 0,
    viewCount: 0,
    likeCount: 0,
    promotionBoost: 0,
    channelHandle: row.handle ?? undefined,
    projectSlug: row.slug,
  };
}

function creatorGets(amount: number, pct: number) {
  const value = Number.isFinite(amount) ? amount : 0;
  const cut = Number.isFinite(pct) ? pct : 0;
  return value * (1 - cut / 100);
}

function groupDonations(raw: unknown, mode: Mode): DonationRow[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, DonationRow>();
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    if (
      isDummyDonation({
        user_id: typeof row.user_id === "string" ? row.user_id : null,
        project_id: typeof row.project_id === "string" ? row.project_id : null,
        donor_email: typeof row.donor_email === "string" ? row.donor_email : null,
        donor_handle: typeof row.donor_handle === "string" ? row.donor_handle : null,
        creator_handle: typeof row.creator_handle === "string" ? row.creator_handle : null,
      })
    ) {
      continue;
    }
    const project = (Array.isArray(row.projects) ? row.projects[0] : row.projects) as Record<string, unknown> | null;
    const profile = project
      ? ((Array.isArray(project.profiles) ? project.profiles[0] : project.profiles) as Record<string, unknown> | null)
      : null;
    const projectId = String(row.project_id ?? "");
    if (!projectId) continue;
    const amount = Number(row.amount);
    const createdAt = String(row.created_at ?? "");
    const given = Number.isFinite(amount) ? amount : 0;
    const earned = creatorGets(amount, Number(row.commission_pct));
    const add = mode === "earn" ? earned : given;
    const person = mode === "earn" ? donorPerson(row) : creatorPerson(row, profile);
    const gift: Gift = {
      id: typeof row.id === "string" ? row.id : `${projectId}-${createdAt}-${person?.label ?? "gift"}`,
      at: createdAt,
      amount: given,
      earned,
      person: person ?? { href: null, label: mode === "earn" ? "Supporter" : "Creator" },
    };
    const current = map.get(projectId);
    if (current) {
      current.total += add;
      if (createdAt > current.lastAt) current.lastAt = createdAt;
      if (person && !current.people.some((item) => item.label === person.label)) current.people.push(person);
      current.gifts.push(gift);
      current.gifts.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      continue;
    }
    const title =
      (typeof project?.title === "string" && project.title) ||
      (typeof row.game_title === "string" && row.game_title) ||
      "Untitled";
    const handle =
      (typeof profile?.handle === "string" && profile.handle) ||
      (typeof row.creator_handle === "string" && row.creator_handle) ||
      null;
    const slug =
      (typeof project?.slug === "string" && project.slug) || (typeof row.game_slug === "string" && row.game_slug) || "";
    map.set(projectId, {
      projectId,
      title,
      handle,
      slug,
      cover: publicMediaUrl(typeof project?.cover_path === "string" ? project.cover_path : null),
      total: add,
      lastAt: createdAt,
      detail: mode === "earn" ? "Supporters" : person?.label ?? "Creator",
      people: person ? [person] : [],
      gifts: [gift],
    });
  }
  return [...map.values()].sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
}

function creatorPerson(row: Record<string, unknown>, profile: Record<string, unknown> | null) {
  const handle =
    (typeof profile?.handle === "string" && profile.handle) ||
    (typeof row.creator_handle === "string" && row.creator_handle) ||
    "";
  const name =
    (typeof profile?.display_name === "string" && profile.display_name) ||
    (typeof row.creator_name === "string" && row.creator_name) ||
    handle ||
    "Creator";
  return { href: handle ? siteOrigin(handle) : null, label: name };
}

function donorPerson(row: Record<string, unknown>) {
  const handle = typeof row.donor_handle === "string" ? row.donor_handle : "";
  const email = typeof row.donor_email === "string" ? row.donor_email : "";
  const label = handle ? `@${handle}` : email || "Supporter";
  return { href: handle ? siteOrigin(handle) : null, label };
}
