// Supabase auth email templates, drawn with the design system. `npm run emails` writes them to
// supabase/templates/*.html; Adit pastes each into Supabase → Authentication → Email Templates
// (see supabase/templates/README.md). CI fails if the HTML files drift from this source.
//
// Emails use a light card: many mail apps force-invert dark emails and break the palette.
// Tables and inline styles because mail clients ignore most modern CSS.

import { primitives as p } from "./tokens.ts";

export type EmailTemplate = {
  /** File name in supabase/templates/. */
  file: string;
  /** Name of the template in the Supabase dashboard. */
  dashboardName: string;
  subject: string;
  html: string;
};

const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function layout({
  preheader,
  title,
  body,
  cta,
  footnote,
}: {
  preheader: string;
  title: string;
  body: string;
  cta: string;
  footnote: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${p["day-50"]};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${p["day-50"]};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
        <tr>
          <td style="padding:0 8px 20px;">
            <a href="{{ .SiteURL }}" style="text-decoration:none;">
              <img src="{{ .SiteURL }}/playinweb-icon.png" width="40" height="40" alt="" style="vertical-align:middle;border-radius:10px;border:0;">
              <img src="{{ .SiteURL }}/playinweb-lettermark-black.png" width="109" height="20" alt="PlayInWeb" style="vertical-align:middle;margin-left:10px;border:0;">
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:${p["day-0"]};border:1px solid ${p["day-200"]};border-radius:22px;padding:36px 32px;font-family:${FONT};color:${p.navy};">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;color:${p.navy};">${title}</h1>
            ${body}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;">
              <tr><td style="border-radius:999px;background:${p.primary};">${cta}</td></tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${p["ink-500"]};">${footnote}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${p["ink-500"]};">
            PlayInWeb · Indie games you play right in your browser.<br>
            You got this email because someone used {{ .Email }} on PlayInWeb.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

const paragraph = (text: string) =>
  `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${p["ink-700"]};">${text}</p>`;

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:${p.white};text-decoration:none;border-radius:999px;">${label}</a>`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    file: "confirm-signup.html",
    dashboardName: "Confirm signup",
    subject: "Confirm your email for PlayInWeb",
    html: layout({
      preheader: "One click and your PlayInWeb account is ready.",
      title: "Confirm your email",
      body: paragraph("Welcome to PlayInWeb! Confirm this email address to finish creating your account."),
      cta: button("{{ .ConfirmationURL }}", "Confirm email"),
      footnote: "Didn’t sign up? You can ignore this email; no account is created until you confirm.",
    }),
  },
  {
    file: "reset-password.html",
    dashboardName: "Reset Password",
    subject: "Reset your PlayInWeb password",
    html: layout({
      preheader: "Choose a new password for your PlayInWeb account.",
      title: "Reset your password",
      body: paragraph("Someone asked to reset the password for this account. Choose a new one with the button below."),
      cta: button("{{ .ConfirmationURL }}", "Choose a new password"),
      footnote: "Didn’t ask for this? Ignore this email and your password stays the same. The link expires in 1 hour.",
    }),
  },
  {
    file: "reauthentication.html",
    dashboardName: "Reauthentication",
    subject: "Your PlayInWeb verification code",
    html: layout({
      preheader: "Use this code to confirm it’s you.",
      title: "Confirm it’s you",
      body:
        paragraph("Enter this code on PlayInWeb to continue. We ask for it before changes like connecting PayPal.") +
        `<p style="margin:20px 0 0;font-family:'Courier New',monospace;font-size:34px;letter-spacing:8px;font-weight:700;color:${p.navy};">{{ .Token }}</p>`,
      cta: button("{{ .SiteURL }}", "Back to PlayInWeb"),
      footnote: "Didn’t try to make a change? Ignore this email and consider changing your password.",
    }),
  },
];

/** Fills the Supabase placeholders with sample values, for previews. */
export function previewEmail(html: string) {
  return html
    .replaceAll("{{ .SiteURL }}", "")
    .replaceAll("{{ .ConfirmationURL }}", "#")
    .replaceAll("{{ .Email }}", "kikiew@example.com")
    .replaceAll("{{ .Token }}", "482913");
}
