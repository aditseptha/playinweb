"use client";

import {
  IconBell,
  IconBookmark,
  IconDownload,
  IconFlag,
  IconGrid,
  IconHeart,
  IconHome,
  IconInbox,
  IconLineGraph,
  IconLogout,
  IconMore,
  IconPlay,
  IconPlus,
  IconSettings,
  IconShare,
  IconSliders,
  IconTrash,
  IconUser,
  IconWallet,
} from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ds/avatar";
import { Breadcrumb } from "@/components/ds/breadcrumb";
import { FileUpload, type UploadStatus } from "@/components/ds/file-upload";
import { List, ListItem } from "@/components/ds/list";
import { MenuSheet, Sidebar, TopNav, type NavGroup } from "@/components/ds/nav";
import { LoadMore, Pagination } from "@/components/ds/pagination";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ds/popover";
import { Badge, Chip } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ds/dialog";
import { EmptyState } from "@/components/ds/empty-state";
import { InlineAlert, OfflineBanner, ProgressBar, Stat } from "@/components/ds/feedback";
import { Checkbox, Field, RadioGroup, SearchInput, Select, Switch, TextArea, TextInput } from "@/components/ds/field";
import { GameCard, GameCardSkeleton, SlotCard } from "@/components/ds/game-card";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ds/menu";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ds/sheet";
import { Spinner } from "@/components/ds/spinner";
import { Table, TBody, TD, TEmpty, TH, THead, TR } from "@/components/ds/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ds/tabs";
import { useToast } from "@/components/ds/toast";
import { Tooltip } from "@/components/ds/tooltip";
import { TableSkeletonRows } from "@/components/ds/skeleton";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { Demo, DocSection, useDocSettings } from "./kit";
import { DEMO_NOW, sampleGames, sampleRows } from "./samples";

export function ComponentSections() {
  return (
    <DocSection
      id="components"
      eyebrow="Build"
      title="Components"
      description={
        <>
          Import from <code className="text-pw-text-soft">@/components/ds/*</code>. Props are consistent:{" "}
          <code>variant</code>, <code>size</code>, <code>tone</code>, <code>loading</code>, <code>disabled</code>, and{" "}
          <code>asChild</code> to render a Next <code>Link</code> with a component’s styling. <code>className</code> is
          for layout (margins, width), not for overriding a variant.
        </>
      }
    >
      <Buttons />
      <Fields />
      <TabsDemo />
      <Badges />
      <Avatars />
      <Cards />
      <Overlays />
      <PopoverDemo />
      <Navigation />
      <Wayfinding />
      <Lists />
      <Tables />
      <Uploads />
      <Feedback />
    </DocSection>
  );
}

function Buttons() {
  const [loading, setLoading] = useState(false);
  return (
    <Demo
      title="Button"
      note="Primary once per view. Small sizes keep a 44px tap area."
      code={`import { Button } from "@/components/ds/button";\n<Button variant="primary">Play now</Button>\n<Button asChild><Link href="/top">See all</Link></Button>`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">
            <IconPlay className="fill-current" aria-hidden /> Play now
          </Button>
          <Button variant="secondary">
            <IconHeart aria-hidden /> Save
          </Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="highlight">
            <IconPlus aria-hidden /> Publish a game
          </Button>
          <Button variant="danger">
            <IconTrash aria-hidden /> Delete game
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Filters">
            <IconSliders />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Settings">
            <IconSettings />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => setLoading(false), 1500);
            }}
          >
            Save changes
          </Button>
          <Button disabled>Disabled</Button>
          <Button asChild variant="secondary">
            <Link href="#components">Link as button</Link>
          </Button>
        </div>
      </div>
    </Demo>
  );
}

function Fields() {
  const [title, setTitle] = useState("Ayam Kabur");
  const [q, setQ] = useState("");
  return (
    <Demo
      title="Fields"
      note="Field wires label, hint, error and counter to the control."
      code={`import { Field, TextInput } from "@/components/ds/field";\n<Field label="Title" hint="Shown on cards" counter={{ value: title.length, max: 60 }}>\n  <TextInput value={title} onChange={…} />\n</Field>`}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Title" hint="Shown on cards and in search." counter={{ value: title.length, max: 60 }}>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Tagline" optional>
          <TextInput placeholder="One line about your game" />
        </Field>
        <Field label="Play URL" error="Enter a link that starts with https://">
          <TextInput defaultValue="ayam-kabur.itch" />
        </Field>
        <Field label="Genre">
          <Select defaultValue="adventure">
            <option value="adventure">Adventure</option>
            <option value="horror">Horror</option>
            <option value="puzzle">Puzzle</option>
          </Select>
        </Field>
        <Field label="Description" optional className="md:col-span-2">
          <TextArea placeholder="What is it about, and how long does it take to play?" />
        </Field>
        <div className="flex flex-col gap-4">
          <SearchInput value={q} onValueChange={setQ} placeholder="Search games" />
          <Checkbox label="Embeddable" description="Players can play it right on PlayInWeb." defaultChecked />
          <Switch label="Show on my channel" defaultChecked />
        </div>
        <RadioGroup
          aria-label="Visibility"
          defaultValue="public"
          options={[
            { value: "public", label: "Public", description: "Anyone can find and play it." },
            { value: "unlisted", label: "Unlisted", description: "Only people with the link." },
            { value: "draft", label: "Draft", description: "Only you.", disabled: true },
          ]}
        />
      </div>
    </Demo>
  );
}

function TabsDemo() {
  return (
    <Demo
      title="Tabs"
      note="Switch views inside a page. Arrow keys move between tabs."
      code={`import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ds/tabs";`}
    >
      <div className="flex flex-col gap-6" data-testid="tabs-demo">
        <Tabs defaultValue="all">
          <TabsList look="pill" aria-label="Game categories">
            <TabsTrigger value="all">All games</TabsTrigger>
            <TabsTrigger value="horror">Horror</TabsTrigger>
            <TabsTrigger value="story">Story</TabsTrigger>
            <TabsTrigger value="puzzle">Puzzle</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="text-pw-body-sm text-pw-muted">
            Showing all games.
          </TabsContent>
          <TabsContent value="horror" className="text-pw-body-sm text-pw-muted">
            Showing horror.
          </TabsContent>
          <TabsContent value="story" className="text-pw-body-sm text-pw-muted">
            Showing story.
          </TabsContent>
          <TabsContent value="puzzle" className="text-pw-body-sm text-pw-muted">
            Showing puzzle.
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="overview">
          <TabsList look="segmented" aria-label="Admin views">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-pw-body-sm text-pw-muted">
            Overview panel.
          </TabsContent>
          <TabsContent value="wallet" className="text-pw-body-sm text-pw-muted">
            Wallet panel.
          </TabsContent>
          <TabsContent value="reports" className="text-pw-body-sm text-pw-muted">
            Reports panel.
          </TabsContent>
        </Tabs>
      </div>
    </Demo>
  );
}

function Badges() {
  const [tags, setTags] = useState<string[]>(["horror"]);
  const toggle = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  return (
    <Demo title="Badge and Chip" code={`import { Badge, Chip } from "@/components/ds/badge";`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="highlight">Top</Badge>
          <Badge tone="primary">New</Badge>
          <Badge>Draft</Badge>
          <Badge tone="success">Published</Badge>
          <Badge tone="warning">Pending</Badge>
          <Badge tone="danger">Failed</Badge>
          <Badge tone="highlight-text" look="pixel">
            Featured game
          </Badge>
          <Badge look="pill">This device only</Badge>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {["horror", "story", "puzzle", "folklore"].map((t) => (
            <Chip key={t} pressed={tags.includes(t)} onClick={() => toggle(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
    </Demo>
  );
}

function Avatars() {
  const { worstCase } = useDocSettings();
  const names = worstCase
    ? ["", "x", "nusantara.interactive.collective", "森の小屋"]
    : ["kikiew", "laras.dev", "Dimas Game", "Nusa Studio", "bumipixel", "nadiapixel"];
  return (
    <Demo
      title="Avatar"
      note="Photo when there is one; same-name-same-pastel initials otherwise."
      code={`import { Avatar } from "@/components/ds/avatar";\n<Avatar name={game.developer} src={game.creatorAvatarUrl} size="sm" />`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
            <Avatar key={s} name="kikiew" src="/playinweb-icon.png" size={s} label="kikiew" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {names.map((n, i) => (
            <Avatar key={`${n}-${i}`} name={n} size="lg" label={n || "Unnamed creator"} />
          ))}
        </div>
      </div>
    </Demo>
  );
}

function Cards() {
  const { worstCase } = useDocSettings();
  const games = sampleGames(worstCase);
  return (
    <Demo
      title="GameCard"
      note="16:9 for feature and wide; 3:4 for tall and row (media standard, #5). Crops follow the creator’s focal point."
      code={`import { GameCard, toGameCardData } from "@/components/ds/game-card";\n<GameCard data={toGameCardData(game)} variant="feature" />`}
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2">
          <GameCard data={games[0]} variant="feature" />
          <GameCard data={games[1]} variant="wide" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {games.map((g, i) => (
            <GameCard key={`${g.title}-${i}`} data={g} variant="tall" />
          ))}
          <SlotCard href="#forms" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ol className="flex flex-col">
            {games.map((g, i) => (
              <li key={`${g.title}-${i}`}>
                <GameCard data={g} variant="row" rank={i + 1} />
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-4">
            <GameCardSkeleton variant="wide" />
            <GameCardSkeleton variant="tall" />
          </div>
        </div>
      </div>
    </Demo>
  );
}

function Overlays() {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <Demo
      title="Dialog, Sheet, Menu, Tooltip, Toast"
      note="Focus moves in and stays in; Esc closes; focus returns to the trigger."
      code={`import { Dialog, DialogTrigger, DialogContent } from "@/components/ds/dialog";\nimport { useToast } from "@/components/ds/toast";`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="open-dialog">Open dialog</Button>
          </DialogTrigger>
          <DialogContent
            title="Add to collection"
            description="Pick a collection for Ayam Kabur."
            footer={
              <>
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">Add</Button>
                </DialogClose>
              </>
            }
          >
            <Field label="Collection">
              <Select defaultValue="weekend">
                <option value="weekend">Weekend picks</option>
                <option value="horror">Late-night horror</option>
              </Select>
            </Field>
          </DialogContent>
        </Dialog>

        <Button variant="danger" data-testid="open-confirm" onClick={() => setConfirm(true)}>
          Delete game
        </Button>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Delete Ayam Kabur?"
          description="The game, its plays and comments are removed for good."
          confirmText="Ayam Kabur"
          confirmLabel="Delete game"
          onConfirm={() => {
            setConfirm(false);
            toast({ title: "Game deleted", tone: "success" });
          }}
        />

        <Sheet>
          <SheetTrigger asChild>
            <Button data-testid="open-sheet">
              <IconSliders aria-hidden /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent
            title="Filters"
            description="Narrow the catalogue."
            footer={
              <>
                <SheetClose asChild>
                  <Button variant="secondary">Clear</Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="primary">Show 24 games</Button>
                </SheetClose>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Checkbox label="Instant play only" />
              <Checkbox label="New this week" />
              <Switch label="Hide games I’ve played" />
            </div>
          </SheetContent>
        </Sheet>

        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu" data-testid="open-menu">
              <IconMore />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>Signed in as kikiew</MenuLabel>
            <MenuItem>
              <IconUser aria-hidden /> My channel
            </MenuItem>
            <MenuItem>
              <IconDownload aria-hidden /> Downloads
            </MenuItem>
            <MenuSeparator />
            <MenuItem tone="danger">
              <IconLogout aria-hidden /> Sign out
            </MenuItem>
          </MenuContent>
        </Menu>

        <Tooltip content="Saved to this device only">
          <Button variant="ghost" size="icon" aria-label="Saved">
            <IconHeart />
          </Button>
        </Tooltip>

        <Button
          onClick={() => toast({ title: "Saved", description: "Ayam Kabur is in your favorites.", tone: "success" })}
        >
          Toast: success
        </Button>
        <Button
          onClick={() =>
            toast({
              title: "Couldn’t save",
              description: "Check your connection.",
              tone: "danger",
              action: { label: "Try again", onClick: () => toast({ title: "Saved", tone: "success" }) },
            })
          }
        >
          Toast: failed + retry
        </Button>
      </div>
    </Demo>
  );
}

const STATUS_TONE = { paid: "success", pending: "warning", failed: "danger" } as const;

function Tables() {
  const { density, worstCase } = useDocSettings();
  const [mode, setMode] = useState<"data" | "loading" | "empty">("data");
  const rows = sampleRows(worstCase);
  return (
    <Demo
      title="Table"
      note="Density follows the toggle in the header. Compact is for admin and wallet."
      code={`import { Table, THead, TBody, TR, TH, TD } from "@/components/ds/table";\n<Table caption="Donations" density="compact">…</Table>`}
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Table state">
        {(["data", "loading", "empty"] as const).map((m) => (
          <Chip key={m} pressed={mode === m} onClick={() => setMode(m)} size="sm">
            {m === "data" ? "With data" : m === "loading" ? "Loading" : "Empty"}
          </Chip>
        ))}
      </div>
      {mode === "loading" ? (
        <TableSkeletonRows rows={3} />
      ) : (
        <Table caption="Recent donations" density={density}>
          <THead>
            <TR>
              <TH>Creator</TH>
              <TH>Game</TH>
              <TH>Date</TH>
              <TH>Status</TH>
              <TH numeric>Amount</TH>
            </TR>
          </THead>
          <TBody>
            {mode === "empty" ? (
              <TEmpty colSpan={5}>
                <EmptyState
                  kind="inline"
                  icon={IconInbox}
                  title="No donations yet"
                  body="Donations to your games show up here."
                />
              </TEmpty>
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-48 truncate" title={r.creator}>
                    {r.creator}
                  </TD>
                  <TD className="max-w-64 truncate" title={r.game}>
                    {r.game}
                  </TD>
                  <TD title={formatDate(r.date)}>{formatRelative(r.date, DEMO_NOW)}</TD>
                  <TD>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </TD>
                  <TD numeric>{formatMoney(r.amount)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}
    </Demo>
  );
}

function Feedback() {
  const { worstCase } = useDocSettings();
  return (
    <Demo
      title="Feedback"
      code={`import { ProgressBar, InlineAlert, Stat, OfflineBanner } from "@/components/ds/feedback";\nimport { Spinner } from "@/components/ds/spinner";`}
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Plays this week" value={worstCase ? 98_765_432 : 12_400} hint="+18% vs last week" />
          <Stat label="Likes" value={worstCase ? 1_234_567 : 886} />
          <Stat
            label="Balance"
            value={worstCase ? 98_765_432.1 : 125}
            display={formatMoney(worstCase ? 98_765_432.1 : 125)}
          />
          <Stat label="Games" value={worstCase ? 0 : 4} />
        </div>
        <ProgressBar value={42} label="Uploading ayam-kabur.zip" detail="34 MB of 80 MB" onCancel={() => {}} />
        <div className="grid gap-3 lg:grid-cols-2">
          <InlineAlert tone="info" title="Cover looks soft on big screens">
            Upload at least 1280×720 for a sharp hero.
          </InlineAlert>
          <InlineAlert tone="success" title="Published">
            Ayam Kabur is live on your channel.
          </InlineAlert>
          <InlineAlert tone="warning" title="PayPal not connected">
            Connect PayPal to receive payouts.
          </InlineAlert>
          <InlineAlert
            tone="danger"
            title="Couldn’t load donations"
            action={
              <Button size="sm" variant="secondary">
                Try again
              </Button>
            }
          >
            The wallet service didn’t respond.
          </InlineAlert>
        </div>
        <div className="flex items-center gap-4 text-pw-text-soft">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
        <div className="overflow-hidden rounded-pw-lg">
          <OfflineBanner forceOffline />
        </div>
      </div>
    </Demo>
  );
}

function PopoverDemo() {
  return (
    <Demo
      title="Popover"
      note="Small anchored panels: share, quick info. Not for actions (Menu) or long tasks (Dialog)."
      code={`import { Popover, PopoverTrigger, PopoverContent } from "@/components/ds/popover";`}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button data-testid="open-popover">
            <IconShare aria-hidden /> Share
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label="Share Ayam Kabur">
          <p className="font-semibold text-pw-text">Share Ayam Kabur</p>
          <p className="mt-1 text-pw-muted">Anyone with the link can play it in their browser.</p>
          <div className="mt-3 flex items-center gap-2">
            <TextInput readOnly value="playinweb.com/kikiew/ayam-kabur" aria-label="Game link" />
            <PopoverClose asChild>
              <Button size="sm" variant="primary">
                Copy
              </Button>
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    </Demo>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/creators", label: "Creators" },
  { href: "/top", label: "Rankings" },
];

const CREATOR_NAV: NavGroup[] = [
  { items: [{ href: "/", label: "Home", icon: IconHome }] },
  {
    title: "Create",
    items: [
      { href: "/profile", label: "Channel", icon: IconUser },
      { href: "/manage", label: "Manage games", icon: IconGrid },
      { href: "/library", label: "Library", icon: IconBookmark },
      { href: "/donations", label: "Wallet", icon: IconWallet },
    ],
  },
  { title: "Explore", items: [{ href: "/top", label: "Top played", icon: IconLineGraph }] },
  { title: "Help", items: [{ href: "/report", label: "Report an issue", icon: IconFlag }] },
];

function Navigation() {
  return (
    <Demo
      title="Navigation"
      note="TopNav (solid, or over art), Sidebar for creator and admin areas, MenuSheet on phones. Which shell each page uses is decided in #4."
      code={`import { TopNav, Sidebar, MenuSheet } from "@/components/ds/nav";`}
      bodyClassName="flex flex-col gap-6"
    >
      <div className="overflow-hidden rounded-pw-lg border border-pw-line">
        <TopNav
          links={NAV_LINKS}
          current="/top"
          menu={CREATOR_NAV}
          actions={
            <>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <IconBell />
              </Button>
              <Button variant="primary" size="sm" className="hidden sm:inline-flex">
                <IconPlus aria-hidden /> Add game
              </Button>
            </>
          }
        />
      </div>
      <div className="relative h-56 overflow-hidden rounded-pw-lg border border-pw-line bg-[url(/home-hero.webp)] bg-cover bg-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-[color-mix(in_srgb,var(--pw-night-950)_70%,transparent)] to-transparent"
        />
        <TopNav
          onArt
          links={NAV_LINKS}
          current="/"
          actions={
            <Button variant="primary" size="sm">
              Sign up free
            </Button>
          }
        />
      </div>
      <div className="flex h-[440px] overflow-hidden rounded-pw-lg border border-pw-line">
        <Sidebar groups={CREATOR_NAV} current="/manage" className="hidden sm:flex" />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <p className="text-pw-body-sm text-pw-muted">
            On phones the same groups open in a sheet. The menu button shows below 768px:
          </p>
          <div>
            <MenuSheet groups={CREATOR_NAV} current="/manage" />
          </div>
        </div>
      </div>
    </Demo>
  );
}

function Wayfinding() {
  const [page, setPage] = useState(3);
  const [shown, setShown] = useState(24);
  const [loading, setLoading] = useState(false);
  return (
    <Demo
      title="Breadcrumb, Pagination, Load more"
      note="Catalogue grids load more in place; creator and admin tables use numbered pages with shareable links."
      code={`import { Breadcrumb } from "@/components/ds/breadcrumb";\nimport { Pagination, LoadMore } from "@/components/ds/pagination";`}
    >
      <div className="flex flex-col gap-8">
        <Breadcrumb
          items={[
            { label: "Manage games", href: "#components" },
            { label: "The Extraordinarily Long and Winding Adventures of Si Kancil", href: "#components" },
            { label: "Edit" },
          ]}
        />
        {/* The demo stays on this page: page links update local state instead of navigating. */}
        <div
          onClickCapture={(e) => {
            const a = (e.target as HTMLElement).closest("a");
            if (!a) return;
            e.preventDefault();
            const n = Number(new URL(a.href).searchParams.get("page"));
            if (n) setPage(n);
          }}
        >
          <Pagination page={page} pages={12} hrefFor={(n) => `?page=${n}`} />
        </div>
        <LoadMore
          shown={shown}
          total={120}
          loading={loading}
          onLoadMore={() => {
            setLoading(true);
            window.setTimeout(() => {
              setShown((n) => Math.min(120, n + 24));
              setLoading(false);
            }, 700);
          }}
        />
      </div>
    </Demo>
  );
}

function Lists() {
  return (
    <Demo
      title="List"
      note="Mixed rows: notifications, settings. Data columns use Table."
      code={`import { List, ListItem } from "@/components/ds/list";`}
    >
      <List label="Notifications" className="max-w-xl">
        <ListItem
          unread
          leading={<Avatar name="laras.dev" size="md" />}
          title="laras.dev followed your channel"
          description={formatRelative(DEMO_NOW - 20 * 60_000, DEMO_NOW)}
        />
        <ListItem
          leading={<Avatar name="Dimas Game" size="md" />}
          title={`Dimas Game tipped ${formatMoney(5)} on Night Bus 9`}
          description={formatRelative(DEMO_NOW - 2 * 86_400_000, DEMO_NOW)}
        />
        <ListItem
          leading={<IconSettings aria-hidden className="size-5 text-pw-muted" />}
          title="Account settings"
          href="#components"
        />
      </List>
    </Demo>
  );
}

function Uploads() {
  const [uploads, setUploads] = useState<UploadStatus[]>([
    { id: "a", name: "ayam-kabur-build.zip", size: 82 * 1024 * 1024, progress: 42, state: "uploading" },
    { id: "b", name: "cover.png", size: 3.4 * 1024 * 1024, state: "done" },
    {
      id: "c",
      name: "trailer.mov",
      size: 240 * 1024 * 1024,
      state: "error",
      error: "Couldn’t upload: the connection dropped. Try again.",
    },
  ]);
  return (
    <Demo
      title="FileUpload"
      note="Checks type and size before uploading; progress per file. Cover cropping is part of the media flow (#5)."
      code={`import { FileUpload } from "@/components/ds/file-upload";\n<FileUpload label="Game build" accept=".zip,.html" maxBytes={100 * 1024 * 1024} onFiles={upload} uploads={uploads} />`}
    >
      <FileUpload
        label="Game build"
        hint="A .zip with index.html at the top level, or a single .html file."
        accept=".zip,.html,application/zip"
        maxBytes={100 * 1024 * 1024}
        onFiles={(files) =>
          setUploads((cur) => [
            ...files.map((f) => ({ id: `${f.name}-${f.size}`, name: f.name, size: f.size, state: "done" as const })),
            ...cur,
          ])
        }
        uploads={uploads}
        onCancel={(id) => setUploads((cur) => cur.filter((u) => u.id !== id))}
      />
    </Demo>
  );
}
