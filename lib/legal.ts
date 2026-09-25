export type LegalKind = "privacy" | "terms";

export type LegalSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export const LEGAL_UPDATED = "September 20, 2026";

export const LEGAL_DOCS: Record<LegalKind, { title: string; intro: string; sections: LegalSection[] }> = {
  privacy: {
    title: "Privacy",
    intro:
      "PlayInWeb is a public catalogue of indie web games operated at PlayInWeb. This notice covers how we handle personal data when you browse, play, create an account, publish, donate, tip, or cash out. It applies to the website and playable HTML games we host.",
    sections: [
      {
        heading: "Who we are",
        body: "PlayInWeb is the data controller for information we store to run the site. Payment card data is handled by Polar, not by us. PayPal handles PayPal accounts. Hosting, auth, files, and analytics are provided by vendors listed below. Questions go through Report an issue on the site.",
      },
      {
        heading: "What we collect",
        body: "We collect only what we need to operate accounts, listings, social features, and payments. Depending on how you use PlayInWeb, that can include:",
        bullets: [
          "Account: email address, password hash and session tokens (via Supabase Auth), and optional reauthentication codes when you confirm a PayPal email.",
          "Profile: handle, display name, bio, avatar image, public channel URL, follower count, and PayPal email if you connect payouts.",
          "Games: title, slug, tagline, description, tags, cover art, screenshots, trailer URL, play URL, store links, published state, and uploaded HTML or other game files.",
          "Activity: play counts, view counts, likes, comments (including comment text and likes on comments), follows, collections and library saves, and download records for files you attach.",
          "Money: Polar checkout IDs, donation and tip amounts, platform commission rate, donor handle or email when provided, payout amounts and status.",
          "Reports: subject and details you send through Report an issue, plus timestamps.",
          "Technical: pages you open (Vercel Analytics), cookies for sign-in, and the local items listed under On your device.",
        ],
      },
      {
        heading: "What is public",
        body: "Anyone who opens PlayInWeb can see public profiles, published games, play and view totals, likes, comments, follower counts, and channel pages. Do not put secrets in bios, comments, or game listings. Unpublished games stay visible only to you (and site operators as needed to run the service).",
      },
      {
        heading: "How we use data",
        body: "We use this information to provide and improve the service:",
        bullets: [
          "Create and secure your account, and show your channel.",
          "Host, list, and serve games, covers, screenshots, and files.",
          "Count plays and views, and show popularity, history, and notifications.",
          "Run likes, comments, follows, library, collections, and downloads.",
          "Process donations and tips through Polar, apply the platform fee shown at checkout, and record payouts to a confirmed PayPal email.",
          "Handle reports, hide or remove content that breaks the terms, and operate admin tools.",
          "Measure traffic with Vercel Analytics so we know which pages are used.",
        ],
      },
      {
        heading: "Processors and vendors",
        body: "We do not sell your profile. We share data with vendors only to run PlayInWeb. Their own policies apply to data they process:",
        bullets: [
          "Supabase: authentication, database, and file storage (including HTML games and media).",
          "Vercel: hosting the site and Vercel Analytics for aggregate page traffic. We do not run third-party ad networks.",
          "Polar: checkout and payment processing for donations and tips. Polar may collect billing details we never see, such as card numbers.",
          "PayPal: if you connect a payout email, PayPal processes that account. We store the email you confirm so we can pay you. We do not store PayPal passwords.",
        ],
      },
      {
        heading: "Cookies and your device",
        body: "Sign-in uses cookies so you stay logged in. Your browser may also store:",
        bullets: [
          "Theme (light or dark).",
          "Whether the sidebar is minimized.",
          "When you last opened notifications.",
          "Local play history and related library data.",
          "A short cache of the game catalogue.",
          "Local follow or Game showcase bid drafts, where those features use the browser only.",
          "Session flags so we do not double-count a play or view in the same tab session.",
        ],
      },
      {
        heading: "Retention",
        body: "Account, profile, games, comments, follows, likes, donations, tips, payouts, and reports stay until you delete them or we remove them under the terms (for example abuse). Cached catalogue data expires after a few minutes. Local browser data lasts until you clear site data. Analytics is kept in aggregate form by Vercel under their retention rules.",
      },
      {
        heading: "Your choices",
        body: "You can edit your profile, unpublish or delete games you own, unlike, unfollow, and remove comments you wrote where the product allows it. You can disconnect payouts by changing or clearing the PayPal email in Donations after the confirmation flow. You can sign out and clear cookies and site data. For a full account deletion, use Report an issue and we will erase or anonymize personal data we control, except records we must keep for fraud, tax, or dispute reasons (for example paid checkouts).",
      },
      {
        heading: "Security and transfers",
        body: "We use HTTPS and vendor access controls. No method is perfectly secure. Supabase, Vercel, Polar, and PayPal may process data in the United States or other countries. By using PlayInWeb you understand that your data may leave your home country.",
      },
      {
        heading: "Children",
        body: "PlayInWeb is not directed at children under 13 (or the higher age required in your country). Do not create an account or publish if you are under that age. If we learn we have collected data from a child, we will delete the account.",
      },
      {
        heading: "Changes",
        body: "We will update this notice when the product changes how data is collected or used. The date at the top is the latest version. Continued use after an update means you accept the new notice.",
      },
    ],
  },
  terms: {
    title: "Terms",
    intro:
      "These terms are a contract between you and PlayInWeb. By browsing, playing, signing up, publishing, donating, tipping, or cashing out, you agree to them. If you do not agree, do not use the site.",
    sections: [
      {
        heading: "The service",
        body: "PlayInWeb is a catalogue of indie web games. We may list games, host HTML builds you upload, show trailers and store links, and provide accounts, comments, likes, follows, library, collections, downloads, donations, tips, and payouts. Some items in the navigation may be marked Soon or hidden. We can add, change, or remove features without notice. We do not guarantee uptime, that a game will keep working, or that a checkout will succeed.",
      },
      {
        heading: "Eligibility",
        body: "You must be old enough to form a contract in your country (and at least 13). If you use Polar or PayPal you must also meet their age and identity rules. You are responsible for keeping your email and password secret and for everything done under your handle.",
      },
      {
        heading: "Accounts",
        body: "One person should use one account. Handles must follow the format we allow and must not impersonate others or use reserved names. We may refuse, suspend, or delete an account that is abusive, fraudulent, inactive, or in breach of these terms. If your account is removed, public comments and listings may be hidden; payment records may be retained.",
      },
      {
        heading: "License to use PlayInWeb",
        body: "We grant you a limited, revocable, non-exclusive license to use the site for personal play and, if you have an account, to publish games you have the right to share. You may not scrape the site in a way that harms the service, copy another creator's files without permission, bypass pay or commission flows, or probe the site for security holes except through Report an issue.",
      },
      {
        heading: "Publishing games",
        body: "You keep ownership of games, art, audio, and code you upload. You grant PlayInWeb a worldwide license to host, cache, display, embed, and stream that material so people can browse and play on PlayInWeb, including covers, screenshots, trailers, and HTML files. You promise that you have the rights needed, that the build is not malware, and that it does not include sexual content involving minors, illegal content, or material that exploits anyone. File size and format limits we show in the publisher apply. Keep your own backups. We are not a long-term archive.",
      },
      {
        heading: "Comments and social features",
        body: "Comments, likes, follows, and collection names are your content. Do not harass, spam, or post illegal material. We may remove or hide social content and may limit who can comment. Public social data can be seen by anyone on the site.",
      },
      {
        heading: "Donations and tips",
        body: "Donations to a game and tips to PlayInWeb are processed by Polar. Amounts, currency, taxes, and refunds follow Polar's terms and the checkout screen. PlayInWeb keeps a platform commission on donations at the rate shown when you pay (set in site settings, typically around 10%). That cut stays with the site. The remainder is what the creator can cash out, subject to payout rules. Tips to the site are not donations to a game listing. We do not store card numbers.",
      },
      {
        heading: "Payouts",
        body: "Creators may connect a PayPal email after proving they control the PlayInWeb account (including email confirmation codes we send). Payouts are sent only to that confirmed email, subject to a minimum balance we display (currently the amount shown on the Donations page). Polar must have paid the checkout before we treat funds as available. We may delay, reverse, or refuse a payout if we suspect fraud, chargebacks, or terms violations. PayPal's terms apply to the receiving account. You are responsible for any tax on amounts you receive.",
      },
      {
        heading: "Downloads and third-party links",
        body: "Files attached to a listing are provided by the creator. Play at your own risk. Store links, trailers, and off-site play URLs are third-party services. Their terms and privacy rules apply. PlayInWeb is not responsible for those sites or for damage caused by a downloaded file.",
      },
      {
        heading: "Prohibited use",
        body: "You may not:",
        bullets: [
          "Upload malware, exploits, or games designed to steal accounts or data.",
          "Infringe copyrights, trademarks, or other rights.",
          "Post sexual content involving anyone 17 or under, or any exploitative sexual content.",
          "Harass users, scrape personal data, or spam comments and follows.",
          "Interfere with Polar, PayPal, or our billing and commission.",
          "Impersonate PlayInWeb, another creator, or a payment provider.",
        ],
      },
      {
        heading: "Moderation",
        body: "We may hide, unpublish, or delete listings, files, comments, or accounts that break these terms or the law, or that harm the service. Report an issue is the way to flag problems. We may not discuss every action we take. Repeat or severe abuse can lead to a permanent ban.",
      },
      {
        heading: "Intellectual property of PlayInWeb",
        body: "The PlayInWeb name, logo, and site design are ours. You may not use them to suggest we endorse a game unless we say so in writing. Games remain their creators' property as described above.",
      },
      {
        heading: "Disclaimer",
        body: "THE SITE AND ALL GAMES ARE PROVIDED AS-IS, WITHOUT WARRANTIES OF ANY KIND, INCLUDING MERCHANTABILITY, FITNESS FOR A PURPOSE, OR NON-INFRINGEMENT. Games can crash, contain bugs, or be taken down. Play sessions, counts, and rankings may be wrong or reset.",
      },
      {
        heading: "Limitation of liability",
        body: "To the fullest extent allowed by law, PlayInWeb and its operators are not liable for lost profits, lost data, lost game files, or indirect or consequential damages, or for amounts greater than the fees you paid to PlayInWeb in the three months before a claim (or, if you paid nothing, a small nominal amount). Some places do not allow these limits; in those places our liability is limited as much as the law allows.",
      },
      {
        heading: "Indemnity",
        body: "If your content or conduct causes a claim against PlayInWeb (including a Polar or PayPal dispute we did not cause), you will cover reasonable costs we incur, including legal fees, except where we are solely at fault.",
      },
      {
        heading: "Changes and contact",
        body: "We may update these terms. The date at the top is the latest version. If a change is material we may note it on the site. Continued use after an update is acceptance. Questions go through Report an issue. These terms are the whole agreement for use of PlayInWeb and sit alongside Polar and PayPal terms for payments.",
      },
    ],
  },
};
