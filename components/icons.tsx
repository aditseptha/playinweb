"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowsIn,
  ArrowsOut,
  Bell,
  Book,
  Bookmark,
  Calendar,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ChartLine,
  ChatCircle,
  DeviceMobile,
  Check,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  CloudSlash,
  Coins,
  Compass,
  Confetti,
  Copy,
  CornersIn,
  CornersOut,
  DotsThree,
  DownloadSimple,
  Envelope,
  Eye,
  EyeSlash,
  FileText,
  FileZip,
  Fire,
  Flag,
  FolderOpen,
  GameController,
  Gear,
  Ghost,
  GridFour,
  Heart,
  House,
  Image as ImageIcon,
  Info,
  List,
  Lock,
  MagnifyingGlass,
  Megaphone,
  Moon,
  Pause,
  PencilSimple,
  Play,
  Plus,
  PuzzlePiece,
  Question,
  Rocket,
  ShareNetwork,
  Shield,
  SignIn,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Star,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trash,
  Tray,
  Trophy,
  UploadSimple,
  User,
  Users,
  Wallet,
  Warning,
  WarningCircle,
  X,
  Keyboard,
} from "@phosphor-icons/react";
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

/** 16, 20, and 24 are the sizes the set is drawn for. 24 is the master. */
export const ICON_SIZES = [16, 20, 24] as const;

type WrapOpts = { filled?: boolean };

/**
 * Phosphor Icons, Fill weight (MIT). https://phosphoricons.com
 * `filled={false}` uses the regular weight at reduced opacity for toggle states.
 */
function wrap(Phosphor: PhosphorIcon, defaults?: WrapOpts) {
  return function Wrapped({ active, filled, opacity, ...props }: IconProps & { filled?: boolean }) {
    void active;
    const on = filled ?? defaults?.filled ?? true;
    const weight = on ? "fill" : "regular";
    return (
      <Phosphor
        weight={weight}
        opacity={on ? opacity : (opacity ?? 0.45)}
        aria-hidden={props["aria-hidden"] ?? true}
        {...props}
      />
    );
  };
}

export const IconMenu = wrap(List);
export const IconHome = wrap(House);
export const IconSearch = wrap(MagnifyingGlass);
export const IconPlus = wrap(Plus);
export const IconClose = wrap(X);
export const IconChevron = wrap(CaretRight);
export const IconChevronLeft = wrap(CaretLeft);
export const IconChevronRight = wrap(CaretRight);
export const IconChevronUp = wrap(CaretUp);
export const IconChevronDown = wrap(CaretDown);
export const IconCheck = wrap(Check);
export const IconPlay = wrap(Play);
export const IconPause = wrap(Pause);
export const IconExternal = wrap(ArrowSquareOut);

export const IconUser = wrap(User);
export const IconLogout = wrap(SignOut);
export const IconSun = wrap(Sun);
export const IconMoon = wrap(Moon);
export const IconEye = wrap(Eye);
export const IconEyeOff = wrap(EyeSlash);
export const IconBell = wrap(Bell);
export const IconMail = wrap(Envelope);
export const IconPencil = wrap(PencilSimple);
export const IconShare = wrap(ShareNetwork);
export const IconHeart = wrap(Heart);
export const IconBookmark = wrap(Bookmark, { filled: true });
export const IconStar = wrap(Star);
export const IconThumbUp = wrap(ThumbsUp, { filled: false });
export const IconThumbDown = wrap(ThumbsDown, { filled: false });
export const IconDownload = wrap(DownloadSimple);
export const IconFlag = wrap(Flag);
export const IconShield = wrap(Shield);
export const IconInfo = wrap(Info);
export const IconClock = wrap(Clock);
export const IconHistory = wrap(ClockCounterClockwise);
export const IconExpand = wrap(ArrowsOut);
export const IconShrink = wrap(ArrowsIn);
export const IconFullscreen = wrap(CornersOut);
export const IconFullscreenExit = wrap(CornersIn);
export const IconTrophy = wrap(Trophy);
export const IconCalendar = wrap(Calendar);
export const IconWallet = wrap(Wallet);
export const IconCoin = wrap(Coins);
export const IconDoc = wrap(FileText);
export const IconMegaphone = wrap(Megaphone);
export const IconGrid = wrap(GridFour);
export const IconSpark = wrap(Sparkle);
export const IconFlame = wrap(Fire);
export const IconRocket = wrap(Rocket);
export const IconUsers = wrap(Users);
export const IconBook = wrap(Book);
export const IconCompass = wrap(Compass);
export const IconGhost = wrap(Ghost);
export const IconPuzzle = wrap(PuzzlePiece);
export const IconSliders = wrap(SlidersHorizontal);
export const IconArrow = wrap(ArrowRight);
export const IconArrowLeft = wrap(ArrowLeft);
export const IconLineGraph = wrap(ChartLine);
export const IconCloudOff = wrap(CloudSlash);
export const IconSettings = wrap(Gear);
export const IconTrash = wrap(Trash);
export const IconUpload = wrap(UploadSimple);
export const IconLock = wrap(Lock);
export const IconGamepad = wrap(GameController);
export const IconKeyboard = wrap(Keyboard);
export const IconPhone = wrap(DeviceMobile);
export const IconImage = wrap(ImageIcon);
export const IconFileZip = wrap(FileZip);
export const IconInbox = wrap(Tray);
export const IconMore = wrap(DotsThree);
export const IconCopy = wrap(Copy);
export const IconComment = wrap(ChatCircle);
export const IconAlertCircle = wrap(WarningCircle);
export const IconCheckCircle = wrap(CheckCircle);
export const IconWarning = wrap(Warning);
export const IconFolderOpen = wrap(FolderOpen);
export const IconSignIn = wrap(SignIn);
export const IconConfetti = wrap(Confetti);
export const IconNoResults = wrap(Question);

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
  { name: "Keyboard", Icon: IconKeyboard },
  { name: "Phone", Icon: IconPhone },
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
