import { useId, type SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

/** 16, 20, and 24 are the sizes the set is drawn for. 24 is the master. */
export const ICON_SIZES = [16, 20, 24] as const;

type GlyphProps = IconProps & { slug: string; filled?: boolean };

/**
 * Icons8 iOS Filled, free tier (PNG, 100px). A mask turns the black
 * silhouette into currentColor. https://icons8.com
 */
function Glyph({ slug, filled = true, active, ...props }: GlyphProps) {
  void active;
  const id = `i8${useId().replace(/:/g, "")}`;
  const maskProps = {
    id,
    maskUnits: "userSpaceOnUse",
    maskContentUnits: "userSpaceOnUse",
    maskType: "alpha",
  } as SVGProps<SVGMaskElement>;
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} aria-hidden opacity={filled ? undefined : 0.45}>
      <mask {...maskProps}>
        <image href={`/assets/icons/ios-filled/${slug}.png`} width="24" height="24" preserveAspectRatio="xMidYMid meet" />
      </mask>
      <rect width="24" height="24" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return <Glyph slug="menu" {...props} />;
}
export function IconHome(props: IconProps) {
  return <Glyph slug="home" {...props} />;
}
export function IconSearch(props: IconProps) {
  return <Glyph slug="search" {...props} />;
}
export function IconPlus(props: IconProps) {
  return <Glyph slug="plus" {...props} />;
}
export function IconClose(props: IconProps) {
  return <Glyph slug="multiply" {...props} />;
}
export function IconChevron(props: IconProps) {
  return <Glyph slug="chevron-right" {...props} />;
}
export function IconChevronLeft(props: IconProps) {
  return <Glyph slug="chevron-left" {...props} />;
}
export function IconChevronRight(props: IconProps) {
  return <Glyph slug="chevron-right" {...props} />;
}
export function IconChevronUp(props: IconProps) {
  return <Glyph slug="chevron-up" {...props} />;
}
export function IconChevronDown(props: IconProps) {
  return <Glyph slug="chevron-down" {...props} />;
}
export function IconCheck(props: IconProps) {
  return <Glyph slug="checkmark" {...props} />;
}
export function IconPlay(props: IconProps) {
  return <Glyph slug="play" {...props} />;
}
export function IconPause(props: IconProps) {
  return <Glyph slug="pause" {...props} />;
}
export function IconExternal(props: IconProps) {
  return <Glyph slug="external-link" {...props} />;
}
export function IconUser(props: IconProps) {
  return <Glyph slug="user" {...props} />;
}
export function IconLogout(props: IconProps) {
  return <Glyph slug="exit" {...props} />;
}
export function IconSun(props: IconProps) {
  return <Glyph slug="sun" {...props} />;
}
export function IconMoon(props: IconProps) {
  return <Glyph slug="moon-symbol" {...props} />;
}
export function IconEye(props: IconProps) {
  return <Glyph slug="visible" {...props} />;
}
export function IconEyeOff(props: IconProps) {
  return <Glyph slug="hide" {...props} />;
}
export function IconBell(props: IconProps) {
  return <Glyph slug="bell" {...props} />;
}
export function IconMail(props: IconProps) {
  return <Glyph slug="mail" {...props} />;
}
export function IconPencil(props: IconProps) {
  return <Glyph slug="edit" {...props} />;
}
export function IconShare(props: IconProps) {
  return <Glyph slug="share" {...props} />;
}
export function IconHeart({ filled, ...props }: IconProps & { filled?: boolean }) {
  return <Glyph slug="like" filled={filled} {...props} />;
}
export function IconBookmark({ filled = true, ...props }: IconProps & { filled?: boolean }) {
  return <Glyph slug="bookmark" filled={filled} {...props} />;
}
export function IconStar({ filled, ...props }: IconProps & { filled?: boolean }) {
  return <Glyph slug="star" filled={filled} {...props} />;
}
export function IconThumbUp({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return <Glyph slug="thumb-up" filled={filled} {...props} />;
}
export function IconThumbDown({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return <Glyph slug="thumbs-down" filled={filled} {...props} />;
}
export function IconDownload(props: IconProps) {
  return <Glyph slug="download" {...props} />;
}
export function IconFlag(props: IconProps) {
  return <Glyph slug="flag" {...props} />;
}
export function IconShield(props: IconProps) {
  return <Glyph slug="shield" {...props} />;
}
export function IconInfo(props: IconProps) {
  return <Glyph slug="info" {...props} />;
}
export function IconClock(props: IconProps) {
  return <Glyph slug="clock" {...props} />;
}
export function IconHistory(props: IconProps) {
  return <Glyph slug="time-machine" {...props} />;
}
export function IconExpand(props: IconProps) {
  return <Glyph slug="expand" {...props} />;
}
export function IconShrink(props: IconProps) {
  return <Glyph slug="collapse" {...props} />;
}
export function IconFullscreen(props: IconProps) {
  return <Glyph slug="full-screen" {...props} />;
}
export function IconFullscreenExit(props: IconProps) {
  return <Glyph slug="normal-screen" {...props} />;
}
export function IconTrophy(props: IconProps) {
  return <Glyph slug="trophy" {...props} />;
}
export function IconCalendar(props: IconProps) {
  return <Glyph slug="calendar" {...props} />;
}
export function IconWallet(props: IconProps) {
  return <Glyph slug="wallet" {...props} />;
}
export function IconCoin(props: IconProps) {
  return <Glyph slug="coins" {...props} />;
}
export function IconDoc(props: IconProps) {
  return <Glyph slug="document" {...props} />;
}
export function IconMegaphone(props: IconProps) {
  return <Glyph slug="megaphone" {...props} />;
}
export function IconGrid(props: IconProps) {
  return <Glyph slug="grid" {...props} />;
}
export function IconSpark(props: IconProps) {
  return <Glyph slug="sparkling" {...props} />;
}
export function IconFlame(props: IconProps) {
  return <Glyph slug="fire-element" {...props} />;
}
export function IconRocket(props: IconProps) {
  return <Glyph slug="rocket" {...props} />;
}
export function IconUsers(props: IconProps) {
  return <Glyph slug="conference" {...props} />;
}
export function IconBook(props: IconProps) {
  return <Glyph slug="book" {...props} />;
}
export function IconCompass(props: IconProps) {
  return <Glyph slug="compass" {...props} />;
}
export function IconGhost(props: IconProps) {
  return <Glyph slug="ghost" {...props} />;
}
export function IconPuzzle(props: IconProps) {
  return <Glyph slug="puzzle" {...props} />;
}
export function IconSliders(props: IconProps) {
  return <Glyph slug="sorting-options" {...props} />;
}
export function IconArrow(props: IconProps) {
  return <Glyph slug="arrow" {...props} />;
}
export function IconArrowLeft(props: IconProps) {
  return <Glyph slug="arrow" {...props} style={{ ...props.style, transform: "scaleX(-1)" }} />;
}
export function IconLineGraph(props: IconProps) {
  return <Glyph slug="line-chart" {...props} />;
}
export function IconCloudOff(props: IconProps) {
  return <Glyph slug="cloud-cross" {...props} />;
}

// Added for the design system components (same Icons8 iOS Filled set).
export function IconSettings(props: IconProps) {
  return <Glyph slug="settings" {...props} />;
}
export function IconTrash(props: IconProps) {
  return <Glyph slug="trash" {...props} />;
}
export function IconUpload(props: IconProps) {
  return <Glyph slug="upload" {...props} />;
}
export function IconLock(props: IconProps) {
  return <Glyph slug="lock" {...props} />;
}
export function IconGamepad(props: IconProps) {
  return <Glyph slug="controller" {...props} />;
}
export function IconImage(props: IconProps) {
  return <Glyph slug="image" {...props} />;
}
export function IconFileZip(props: IconProps) {
  return <Glyph slug="zip" {...props} />;
}
export function IconInbox(props: IconProps) {
  return <Glyph slug="inbox" {...props} />;
}
export function IconMore(props: IconProps) {
  return <Glyph slug="more" {...props} />;
}
export function IconCopy(props: IconProps) {
  return <Glyph slug="copy" {...props} />;
}
export function IconComment(props: IconProps) {
  return <Glyph slug="speech-bubble" {...props} />;
}
export function IconAlertCircle(props: IconProps) {
  return <Glyph slug="box-important" {...props} />;
}
export function IconCheckCircle(props: IconProps) {
  return <Glyph slug="ok" {...props} />;
}
export function IconWarning(props: IconProps) {
  return <Glyph slug="error" {...props} />;
}
export function IconFolderOpen(props: IconProps) {
  return <Glyph slug="opened-folder" {...props} />;
}
export function IconSignIn(props: IconProps) {
  return <Glyph slug="enter-2" {...props} />;
}
export function IconConfetti(props: IconProps) {
  return <Glyph slug="confetti" {...props} />;
}
export function IconNoResults(props: IconProps) {
  return <Glyph slug="nothing-found" {...props} />;
}

export type AppIcon = (props: IconProps) => React.JSX.Element;

export const ICON_GALLERY: { name: string; Icon: AppIcon }[] = [
  { name: "Menu", Icon: IconMenu },
  { name: "Home", Icon: IconHome },
  { name: "Search", Icon: IconSearch },
  { name: "Plus", Icon: IconPlus },
  { name: "Close", Icon: IconClose },
  { name: "Chevron", Icon: IconChevron },
  { name: "Chevron left", Icon: IconChevronLeft },
  { name: "Chevron up", Icon: IconChevronUp },
  { name: "Check", Icon: IconCheck },
  { name: "Play", Icon: IconPlay },
  { name: "Pause", Icon: IconPause },
  { name: "External", Icon: IconExternal },
  { name: "User", Icon: IconUser },
  { name: "Logout", Icon: IconLogout },
  { name: "Sun", Icon: IconSun },
  { name: "Moon", Icon: IconMoon },
  { name: "Eye", Icon: IconEye },
  { name: "Eye off", Icon: IconEyeOff },
  { name: "Bell", Icon: IconBell },
  { name: "Mail", Icon: IconMail },
  { name: "Pencil", Icon: IconPencil },
  { name: "Share", Icon: IconShare },
  { name: "Heart", Icon: IconHeart },
  { name: "Bookmark", Icon: IconBookmark },
  { name: "Star", Icon: IconStar },
  { name: "Thumb up", Icon: IconThumbUp },
  { name: "Thumb down", Icon: IconThumbDown },
  { name: "Download", Icon: IconDownload },
  { name: "Flag", Icon: IconFlag },
  { name: "Shield", Icon: IconShield },
  { name: "Info", Icon: IconInfo },
  { name: "Clock", Icon: IconClock },
  { name: "History", Icon: IconHistory },
  { name: "Expand", Icon: IconExpand },
  { name: "Shrink", Icon: IconShrink },
  { name: "Fullscreen", Icon: IconFullscreen },
  { name: "Exit fullscreen", Icon: IconFullscreenExit },
  { name: "Trophy", Icon: IconTrophy },
  { name: "Calendar", Icon: IconCalendar },
  { name: "Wallet", Icon: IconWallet },
  { name: "Coin", Icon: IconCoin },
  { name: "Doc", Icon: IconDoc },
  { name: "Megaphone", Icon: IconMegaphone },
  { name: "Grid", Icon: IconGrid },
  { name: "Spark", Icon: IconSpark },
  { name: "Flame", Icon: IconFlame },
  { name: "Rocket", Icon: IconRocket },
  { name: "Users", Icon: IconUsers },
  { name: "Book", Icon: IconBook },
  { name: "Compass", Icon: IconCompass },
  { name: "Ghost", Icon: IconGhost },
  { name: "Puzzle", Icon: IconPuzzle },
  { name: "Sliders", Icon: IconSliders },
  { name: "Arrow", Icon: IconArrow },
  { name: "Chart", Icon: IconLineGraph },
  { name: "Cloud off", Icon: IconCloudOff },
  { name: "Settings", Icon: IconSettings },
  { name: "Trash", Icon: IconTrash },
  { name: "Upload", Icon: IconUpload },
  { name: "Lock", Icon: IconLock },
  { name: "Gamepad", Icon: IconGamepad },
  { name: "Image", Icon: IconImage },
  { name: "Zip file", Icon: IconFileZip },
  { name: "Inbox", Icon: IconInbox },
  { name: "More", Icon: IconMore },
  { name: "Copy", Icon: IconCopy },
  { name: "Comment", Icon: IconComment },
  { name: "Alert", Icon: IconAlertCircle },
  { name: "Check circle", Icon: IconCheckCircle },
  { name: "Warning", Icon: IconWarning },
  { name: "Folder", Icon: IconFolderOpen },
  { name: "Sign in", Icon: IconSignIn },
  { name: "Confetti", Icon: IconConfetti },
  { name: "No results", Icon: IconNoResults },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M12 9.5v13l12-6.5z" fill="var(--on-accent)" />
    </svg>
  );
}
