export const ADMIN_EMAILS = ["aditseptha@gmail.com"] as const;

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}
