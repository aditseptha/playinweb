/** viewed and played feed the public counters; recorded feeds the badge play log (#30). */
type StatKind = "viewed" | "played" | "recorded";

export function claimSessionStat(kind: StatKind, projectId: string) {
  const key = statKey(kind, projectId);
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function releaseSessionStat(kind: StatKind, projectId: string) {
  try {
    sessionStorage.removeItem(statKey(kind, projectId));
  } catch {
    /* ignore */
  }
}

function statKey(kind: StatKind, projectId: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `showcase.${kind}.${day}.${projectId}`;
}
