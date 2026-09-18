const DUMMY_USER_IDS = new Set([
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
]);

const DUMMY_PROJECT_IDS = new Set([
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
]);

const DUMMY_HANDLES = new Set(["pixelbarn", "mayaok", "riocode"]);

export function isDummyDonation(row: {
  user_id?: string | null;
  project_id?: string | null;
  donor_email?: string | null;
  donor_handle?: string | null;
  creator_handle?: string | null;
}) {
  if (row.user_id && DUMMY_USER_IDS.has(row.user_id)) return true;
  if (row.project_id && DUMMY_PROJECT_IDS.has(row.project_id)) return true;
  if (row.donor_email?.includes("-dummy@example.com")) return true;
  if (row.donor_handle && DUMMY_HANDLES.has(row.donor_handle)) return true;
  if (row.creator_handle && DUMMY_HANDLES.has(row.creator_handle)) return true;
  return false;
}

export function isDummyProjectId(id: string | null | undefined) {
  return Boolean(id && DUMMY_PROJECT_IDS.has(id));
}

export function isDummyPayout(row: { amount: number; created_at: string }) {
  const at = Date.parse(row.created_at);
  if (!Number.isFinite(at) || at >= Date.parse("2026-09-18T00:00:00+07:00")) return false;
  const amount = Number(row.amount);
  return amount === 12 || amount === 8.5;
}

export function isDummyUser(row: { id?: string | null; email?: string | null; handle?: string | null }) {
  if (row.id && DUMMY_USER_IDS.has(row.id)) return true;
  if (row.email?.includes("-dummy@example.com")) return true;
  if (row.handle && DUMMY_HANDLES.has(row.handle)) return true;
  return false;
}
