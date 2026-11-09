# Auth email templates

Generated from `lib/email-templates.ts` by `npm run emails`. Don't edit the HTML by hand; CI checks they match.

## Installing (Supabase dashboard, needs project access)

Supabase → **Authentication → Emails → Templates**. For each row, set the subject and paste the HTML file:

| Template | Subject | File |
|---|---|---|
| Confirm signup | Confirm your email for PlayInWeb | `confirm-signup.html` |
| Reset Password | Reset your PlayInWeb password | `reset-password.html` |
| Reauthentication | Your PlayInWeb verification code | `reauthentication.html` |

The templates load the logo from `{{ .SiteURL }}`, so **Authentication → URL Configuration → Site URL** must be
`https://playinweb.com`. Send yourself a test (sign up with a new address, request a password reset) after saving.
