// Donations and tips are not open yet (#53). Everything players can see about them follows the
// `donations` and `tip` site features: turn a feature on in the admin panel and its badge, notices
// and wording come back on the next page load, with no code change. The legal pages are the
// exception: they are dated text, so they change by hand (see BEFORE_TURNING_ON).
// Pure, so lib/money-features.test.mjs can check the rules.

export type MoneyFeatures = { donations: boolean; tip: boolean };

/** Both closed: what everyone sees until the features load, and while they are hidden. */
export const MONEY_CLOSED: MoneyFeatures = { donations: false, tip: false };

/** Supporter counts donations and tips, so it shows once either is open. */
export function badgeOpen(badge: string, money: MoneyFeatures): boolean {
  return badge !== "supporter" || money.donations || money.tip;
}

/** Donation and payout notices follow Donations; tip notices follow Tips. */
export function noticeKindOpen(kind: "donation" | "payout" | "tip", money: MoneyFeatures): boolean {
  return kind === "tip" ? money.tip : money.donations;
}

/** The empty notifications panel. */
export function noticesEmptyText(money: MoneyFeatures): string {
  return money.donations
    ? "Donations, comments, follows, and payouts show up here."
    : "Comments, follows, and badges show up here.";
}

/** The intro of the Claim this game dialog on a curated game. Tips go to PlayInWeb, so only Donations matters. */
export function claimIntro(money: MoneyFeatures): string {
  return money.donations
    ? "Made this game? We will move it to your account, with its plays and likes, and you can edit it, open comments and take donations."
    : "Made this game? We will move it to your account, with its plays and likes, and you can edit it and open comments.";
}

/** Shown on the admin feature list: what to do by hand before a money feature goes public. */
export const BEFORE_TURNING_ON: Record<string, string> = {
  donations:
    "Before turning on: restore the donations and Polar sections of the Privacy Policy and Terms (lib/legal.ts, see its history), update the date, and add a devlog entry.",
  tip: "Before turning on: restore the Tips and Polar sections of the Privacy Policy and Terms (lib/legal.ts, see its history), update the date, and add a devlog entry.",
};
