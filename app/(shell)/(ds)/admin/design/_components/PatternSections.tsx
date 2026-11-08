"use client";

import { Gamepad2, Inbox, MessageCircle, Play, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { CHANGELOG } from "@/components/ds/changelog";
import { ConfirmDialog } from "@/components/ds/dialog";
import { EmptyState, StatusPage } from "@/components/ds/empty-state";
import { InlineAlert, OfflineBanner, ProgressBar, Stat } from "@/components/ds/feedback";
import { Field, FormErrorSummary, Select, TextInput } from "@/components/ds/field";
import { GameCard } from "@/components/ds/game-card";
import { useDelayedFlag, useUnsavedChanges } from "@/components/ds/hooks";
import { Illustration } from "@/components/ds/illustration";
import {
  AuthSkeleton,
  CatalogSkeleton,
  DashboardSkeleton,
  DetailSkeleton,
  FormSkeleton,
} from "@/components/ds/skeleton";
import { Spinner } from "@/components/ds/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ds/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ds/tabs";
import {
  AuthTemplate,
  CatalogTemplate,
  DashboardTemplate,
  DetailTemplate,
  DocTemplate,
  FormSection,
  FormTemplate,
  PageHeader,
  SaveBar,
  SectionHeader,
} from "@/components/ds/templates";
import { useToast } from "@/components/ds/toast";
import { formatDate, formatMoney } from "@/lib/format";
import { Demo, DocSection, Rule, useDocSettings } from "./kit";
import { DEMO_NOW, sampleGames } from "./samples";

export function PatternSections() {
  return (
    <>
      <Templates />
      <FormPatterns />
      <States />
      <Interaction />
      <WhatsNew />
    </>
  );
}

// ---------- Templates ----------

function Frame({ children }: { children: ReactNode }) {
  return <div className="max-h-[520px] overflow-auto rounded-pw-lg border border-pw-line bg-pw-bg">{children}</div>;
}

function Templates() {
  const { worstCase } = useDocSettings();
  const games = sampleGames(worstCase);
  return (
    <DocSection
      id="templates"
      eyebrow="Build"
      title="Templates"
      description="Every page uses one of seven templates. They set the grid, max width, title style and section rhythm, and each has a skeleton with the same footprint. Pages fill the slots."
    >
      <Demo
        title="T1 Catalogue"
        note="Home, Top, Library, Collection"
        code={`import { CatalogTemplate } from "@/components/ds/templates";`}
      >
        <Frame>
          <CatalogTemplate
            hero={
              <div className="bg-linear-to-b from-pw-navy to-pw-bg px-6 py-10">
                <p className="font-pw-pixel text-pw-label tracking-[0.06em] text-pw-gold uppercase">Featured game</p>
                <p className="mt-2 font-pw-display text-pw-display-l font-extrabold text-pw-mist-50 uppercase italic">
                  {games[0].title}
                </p>
              </div>
            }
          >
            <section className="flex flex-col gap-4">
              <SectionHeader
                title="Popular this week"
                action={
                  <Button size="sm" variant="ghost">
                    See all
                  </Button>
                }
              />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {games.map((g, i) => (
                  <GameCard key={`${g.title}-${i}`} data={g} variant="tall" />
                ))}
              </div>
            </section>
          </CatalogTemplate>
        </Frame>
      </Demo>

      <Demo title="T2 Detail" note="Game detail, player, creator site">
        <Frame>
          <DetailTemplate
            media={<GameCard data={games[0]} variant="wide" />}
            aside={
              <>
                <Button variant="primary" size="lg">
                  <Play className="fill-current" aria-hidden /> Play now
                </Button>
                <div className="rounded-pw-xl border border-pw-line bg-pw-surface-1 p-4 text-pw-body-sm text-pw-text-soft">
                  Released {formatDate(DEMO_NOW)} · Adventure
                </div>
              </>
            }
          >
            <p className="text-pw-body text-pw-text-soft">
              A chicken escapes the market and has one night to get home.
            </p>
          </DetailTemplate>
        </Frame>
      </Demo>

      <Demo title="T3 Dashboard" note="Manage, wallet, admin. Compact tables.">
        <Frame>
          <DashboardTemplate
            header={<PageHeader title="Wallet" description="Money in and out of your account." />}
            stats={
              <>
                <Stat label="Balance" value={125} display={formatMoney(125)} />
                <Stat label="This month" value={42} display={formatMoney(42)} />
                <Stat label="Supporters" value={18} />
                <Stat label="Payouts" value={3} />
              </>
            }
          >
            <Table caption="Payouts" density="compact">
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH numeric>Amount</TH>
                </TR>
              </THead>
              <TBody>
                <TR>
                  <TD>{formatDate(DEMO_NOW)}</TD>
                  <TD numeric>{formatMoney(80)}</TD>
                </TR>
              </TBody>
            </Table>
          </DashboardTemplate>
        </Frame>
      </Demo>

      <div className="grid gap-8 xl:grid-cols-2">
        <Demo title="T4 Form" note="Create/edit game, profile, report, tip. See Form patterns.">
          <Frame>
            <FormTemplate header={<PageHeader title="Edit profile" />}>
              <FormSection title="Basics">
                <Field label="Display name">
                  <TextInput defaultValue="kikiew" />
                </Field>
              </FormSection>
            </FormTemplate>
          </Frame>
        </Demo>
        <Demo title="T5 Auth" note="Login, signup, reset password">
          <Frame>
            <AuthTemplate fullHeight={false}>
              <h2 className="text-center text-pw-title font-bold">Welcome back</h2>
              <div className="mt-6 flex flex-col gap-4">
                <Field label="Email">
                  <TextInput type="email" autoComplete="email" />
                </Field>
                <Button variant="primary">Sign in</Button>
              </div>
            </AuthTemplate>
          </Frame>
        </Demo>
        <Demo title="T6 Document" note="Privacy, terms">
          <Frame>
            <DocTemplate title="Terms" updated={`Updated ${formatDate(DEMO_NOW)}`}>
              <p>These terms cover how you use PlayInWeb and the games on it.</p>
              <h2>Your account</h2>
              <p>
                Keep your login safe. You’re responsible for what happens under your account. Read the{" "}
                <a href="#templates">privacy policy</a>.
              </p>
            </DocTemplate>
          </Frame>
        </Demo>
        <Demo title="T7 Status" note="404, error, sign in, no access, coming soon">
          <Frame>
            <StatusPage
              status="not-found"
              fullHeight={false}
              actions={<Button variant="primary">Back to home</Button>}
            />
          </Frame>
        </Demo>
      </div>
    </DocSection>
  );
}

// ---------- Form patterns ----------

type Errors = Partial<Record<"title" | "url", string>>;

function validate(v: { title: string; url: string }): Errors {
  const e: Errors = {};
  if (!v.title.trim()) e.title = "Add a title";
  else if (v.title.length > 60) e.title = "Keep the title to 60 characters";
  if (!/^https:\/\/\S+\.\S+/.test(v.url)) e.url = "Enter a link that starts with https://";
  return e;
}

function FormPatterns() {
  const toast = useToast();
  const initial = { title: "Ayam Kabur", url: "", tagline: "", genre: "adventure" };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);

  const errors = validate(values);
  const show = (k: keyof Errors) => (touched[k] || submitted ? errors[k] : undefined);
  const set = (k: keyof typeof initial) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const summary = submitted
    ? (Object.entries(errors) as Array<[keyof Errors, string]>).map(([k, message]) => ({
        fieldId: `ds-form-${k}`,
        message,
      }))
    : [];

  return (
    <DocSection
      id="forms"
      eyebrow="Patterns"
      title="Form patterns"
      description="Rules for every form, shown on a working example. Try saving with an empty Play URL."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Demo title="Edit game" bodyClassName="p-0">
          <FormTemplate
            header={<PageHeader title="Edit game" />}
            saveBar={
              <SaveBar dirty={dirty}>
                <Button variant="ghost" disabled={!dirty} onClick={() => setValues(saved)}>
                  Discard
                </Button>
                <Button
                  variant="primary"
                  loading={busy}
                  onClick={() => {
                    setSubmitted(true);
                    if (Object.keys(errors).length) {
                      window.requestAnimationFrame(() => summaryRef.current?.focus());
                      return;
                    }
                    setBusy(true);
                    window.setTimeout(() => {
                      setBusy(false);
                      setSaved(values);
                      setSubmitted(false);
                      toast({ title: "Changes saved", tone: "success" });
                    }, 900);
                  }}
                >
                  Save changes
                </Button>
              </SaveBar>
            }
          >
            <FormErrorSummary ref={summaryRef} errors={summary} />
            <FormSection title="Basics" description="Shown on cards and your game page.">
              <Field
                label="Title"
                id="ds-form-title"
                error={show("title")}
                counter={{ value: values.title.length, max: 60 }}
              >
                <TextInput value={values.title} onChange={set("title")} onBlur={blur("title")} />
              </Field>
              <Field label="Tagline" optional>
                <TextInput value={values.tagline} onChange={set("tagline")} placeholder="One line about your game" />
              </Field>
              <Field
                label="Play URL"
                id="ds-form-url"
                error={show("url")}
                hint="Where the game runs. We embed it if the host allows."
              >
                <TextInput
                  value={values.url}
                  onChange={set("url")}
                  onBlur={blur("url")}
                  inputMode="url"
                  placeholder="https://"
                />
              </Field>
              <Field label="Genre">
                <Select value={values.genre} onChange={set("genre")}>
                  <option value="adventure">Adventure</option>
                  <option value="horror">Horror</option>
                  <option value="puzzle">Puzzle</option>
                </Select>
              </Field>
            </FormSection>
            <FormSection title="Danger zone">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-pw-xl border border-pw-danger/40 p-4">
                <p className="text-pw-body-sm text-pw-text-soft">Delete the game, its plays and comments.</p>
                <Button variant="danger" onClick={() => setConfirm(true)}>
                  <Trash2 aria-hidden /> Delete game
                </Button>
              </div>
            </FormSection>
          </FormTemplate>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title={`Delete ${values.title || "this game"}?`}
            description="This removes the game for everyone."
            confirmText={values.title || "delete"}
            confirmLabel="Delete game"
            onConfirm={() => {
              setConfirm(false);
              toast({ title: "Game deleted", tone: "success" });
            }}
          />
        </Demo>
        <Demo title="Rules">
          <ul className="flex flex-col gap-3">
            <Rule kind="do">Validate when the user leaves a field they’ve touched, and on submit.</Rule>
            <Rule kind="dont">Show errors before the user has typed anything.</Rule>
            <Rule kind="do">
              Keep Submit enabled. On error, focus the summary (long forms) or the first invalid field.
            </Rule>
            <Rule kind="do">Mark optional fields “(optional)”. No asterisks.</Rule>
            <Rule kind="do">Save explicitly, show “Unsaved changes”, warn before leaving, toast on success.</Rule>
            <Rule kind="do">Deleting a game asks the user to type its title.</Rule>
            <Rule kind="do">Money: show the amount summary before confirming, and a success screen after.</Rule>
          </ul>
        </Demo>
      </div>
    </DocSection>
  );
}

// ---------- States ----------

function DelayedDemo() {
  const [loading, setLoading] = useState(false);
  const shown = useDelayedFlag(loading);
  const run = (ms: number) => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), ms);
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={() => run(120)}>
        Fast load (120ms)
      </Button>
      <Button size="sm" onClick={() => run(1500)}>
        Slow load (1.5s)
      </Button>
      <span className="inline-flex h-9 items-center gap-2 text-pw-body-sm text-pw-muted" aria-live="polite">
        {shown ? (
          <>
            <Spinner size="sm" label="" /> Loading…
          </>
        ) : loading ? (
          "Loading, indicator held back"
        ) : (
          "Idle"
        )}
      </span>
    </div>
  );
}

function States() {
  const toast = useToast();
  return (
    <DocSection
      id="states"
      eyebrow="Patterns"
      title="States"
      description="Show the shape of the page while loading, turn empty states into a next step, and always give errors a way out."
    >
      <Demo title="Loading: skeleton per template" note="Replace every “Loading…” line with the page’s skeleton.">
        <Tabs defaultValue="catalog">
          <TabsList look="segmented" aria-label="Skeleton template">
            <TabsTrigger value="catalog">T1 Catalogue</TabsTrigger>
            <TabsTrigger value="detail">T2 Detail</TabsTrigger>
            <TabsTrigger value="dashboard">T3 Dashboard</TabsTrigger>
            <TabsTrigger value="form">T4 Form</TabsTrigger>
            <TabsTrigger value="auth">T5 Auth</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog">
            <CatalogSkeleton />
          </TabsContent>
          <TabsContent value="detail">
            <DetailSkeleton />
          </TabsContent>
          <TabsContent value="dashboard">
            <DashboardSkeleton />
          </TabsContent>
          <TabsContent value="form">
            <FormSkeleton />
          </TabsContent>
          <TabsContent value="auth">
            <AuthSkeleton />
          </TabsContent>
        </Tabs>
      </Demo>

      <div className="grid gap-6 lg:grid-cols-2">
        <Demo title="Loading timing" note="Indicator after ~200ms, then shown for at least ~400ms.">
          <DelayedDemo />
        </Demo>
        <Demo title="Actions and uploads">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Button variant="primary" loading>
                Publishing
              </Button>
            </div>
            <ProgressBar value={68} label="Uploading cover.webp" detail="3.4 MB of 5 MB" onCancel={() => {}} />
          </div>
        </Demo>
      </div>

      <Demo title="Empty" note="Four kinds. Page-level kinds get an illustration; inline ones don’t.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-pw-xl border border-pw-line">
            <EmptyState
              kind="first-use"
              illustration="first-use"
              title="Publish your first game"
              body="Upload a build or link your game. It takes a few minutes."
              action={
                <Button variant="primary">
                  <Plus aria-hidden /> Create game
                </Button>
              }
            />
          </div>
          <div className="rounded-pw-xl border border-pw-line">
            <EmptyState
              kind="user"
              illustration="no-favorites"
              title="No favorites yet"
              body="Press Save on a game you like and it shows up here."
              action={<Button>Browse games</Button>}
            />
          </div>
          <div className="rounded-pw-xl border border-pw-line">
            <EmptyState
              kind="no-results"
              illustration="no-results"
              title="No games match"
              body="Try removing a few filters or searching for something else."
              action={<Button variant="secondary">Clear filters</Button>}
            />
          </div>
          <div className="grid place-items-center rounded-pw-xl border border-pw-line">
            <EmptyState
              kind="inline"
              icon={MessageCircle}
              title="No comments yet"
              body="Be the first to say what you thought."
            />
          </div>
        </div>
      </Demo>

      <Demo title="Errors" note="Field → toast → section → page.">
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Play URL" error="Enter a link that starts with https://">
              <TextInput defaultValue="ayam-kabur" />
            </Field>
            <FormErrorSummary
              errors={[
                { fieldId: "none", message: "Add a title" },
                { fieldId: "none-2", message: "Enter a Play URL" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                toast({
                  title: "Couldn’t save",
                  description: "Your changes are still here.",
                  tone: "danger",
                  action: { label: "Try again", onClick: () => toast({ title: "Saved", tone: "success" }) },
                })
              }
            >
              Show failed-action toast
            </Button>
          </div>
          <InlineAlert
            tone="danger"
            title="Couldn’t load this section"
            action={
              <Button size="sm" variant="secondary">
                Try again
              </Button>
            }
          >
            The rest of the page still works.
          </InlineAlert>
          <Tabs defaultValue="error">
            <TabsList look="segmented" aria-label="Status page">
              <TabsTrigger value="error">Error</TabsTrigger>
              <TabsTrigger value="not-found">404</TabsTrigger>
              <TabsTrigger value="sign-in">Sign in</TabsTrigger>
              <TabsTrigger value="no-access">No access</TabsTrigger>
              <TabsTrigger value="coming-soon">Coming soon</TabsTrigger>
            </TabsList>
            {(["error", "not-found", "sign-in", "no-access", "coming-soon"] as const).map((s) => (
              <TabsContent key={s} value={s}>
                <div className="rounded-pw-xl border border-pw-line">
                  <StatusPage
                    status={s}
                    fullHeight={false}
                    errorId={s === "error" ? "4f2a9c1e" : undefined}
                    actions={
                      s === "error" ? (
                        <>
                          <Button variant="primary">Try again</Button>
                          <Button>Back to home</Button>
                        </>
                      ) : s === "sign-in" ? (
                        <>
                          <Button variant="primary">Sign in</Button>
                          <Button>Create account</Button>
                        </>
                      ) : (
                        <Button variant="primary">Back to home</Button>
                      )
                    }
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Demo>

      <div className="grid gap-6 lg:grid-cols-2">
        <Demo title="Success">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Illustration name="success" size="m" />
            <div>
              <Badge tone="success">Published</Badge>
              <h3 className="mt-3 text-pw-heading font-bold">Ayam Kabur is live</h3>
              <p className="mt-1 text-pw-body text-pw-muted">Share the link or keep editing.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="primary">
                <Gamepad2 aria-hidden /> View game
              </Button>
              <Button>Copy link</Button>
            </div>
          </div>
        </Demo>
        <Demo title="Offline">
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-pw-lg">
              <OfflineBanner forceOffline />
            </div>
            <EmptyState
              kind="inline"
              icon={Inbox}
              title="Some data may be out of date"
              body="It refreshes on its own once you’re back online."
            />
          </div>
        </Demo>
      </div>
    </DocSection>
  );
}

// ---------- Interaction ----------

function Interaction() {
  return (
    <DocSection
      id="interaction"
      eyebrow="Patterns"
      title="Hover, touch, keyboard"
      description="Hover is a bonus, never the only way. Supported browsers: Safari/iOS 16.4+, Chrome/Edge 111+, Firefox 128+. Newer CSS (scroll-driven animation, backdrop blur) is wrapped in @supports and the page still works without it."
    >
      <Table caption="Equivalents for hover interactions" density="compact">
        <THead>
          <TR>
            <TH>Interaction</TH>
            <TH>Mouse</TH>
            <TH>Touch</TH>
            <TH>Keyboard</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Game peek</TD>
            <TD>Hover 400ms</TD>
            <TD>Long-press → Sheet</TD>
            <TD>Focus card, open detail</TD>
          </TR>
          <TR>
            <TD>Preview clip (#5)</TD>
            <TD>Hover</TD>
            <TD>Plays on the detail page only</TD>
            <TD>Focus card</TD>
          </TR>
          <TR>
            <TD>Tooltip</TD>
            <TD>Hover 300ms</TD>
            <TD>Never the only copy of the info</TD>
            <TD>Focus</TD>
          </TR>
          <TR>
            <TD>Card lift and shine</TD>
            <TD>Hover</TD>
            <TD>None (decorative)</TD>
            <TD>Focus ring</TD>
          </TR>
        </TBody>
      </Table>
      <Demo title="Rules">
        <ul className="flex flex-col gap-2.5">
          <Rule kind="do">
            Hover styles only on devices that hover. Tailwind’s hover: already does this; in CSS use @media (hover:
            hover).
          </Rule>
          <Rule kind="do">Every interactive element shows the focus ring (focusRing in components/ds/styles).</Rule>
          <Rule kind="do">
            Tap targets are at least 44px; small controls grow their hit area instead of their look.
          </Rule>
          <Rule kind="dont">Put the only copy of important information in a tooltip or on hover.</Rule>
        </ul>
      </Demo>
    </DocSection>
  );
}

// ---------- What's new ----------

function WhatsNew() {
  return (
    <DocSection
      id="whats-new"
      eyebrow="Log"
      title="What’s new"
      description="Changes that affect anyone using the DS. Every PR labelled design-system adds an entry in components/ds/changelog.ts."
    >
      <ol className="flex flex-col gap-4">
        {CHANGELOG.map((e) => (
          <li key={e.date + e.title} className="rounded-pw-xl border border-pw-line bg-pw-surface-1 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <time className="text-pw-caption text-pw-muted" dateTime={e.date}>
                {formatDate(e.date)}
              </time>
              {e.breaking ? <Badge tone="danger">Breaking</Badge> : null}
            </div>
            <h3 className="mt-1 text-pw-title font-bold">{e.title}</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-pw-body-sm text-pw-text-soft">
              {e.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </DocSection>
  );
}
