export function claimSessionStat(kind: "viewed" | "played", projectId: string) {
  const key = statKey(kind, projectId);
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function releaseSessionStat(kind: "viewed" | "played", projectId: string) {
  try {
    sessionStorage.removeItem(statKey(kind, projectId));
  } catch {
    /* ignore */
  }
}

function statKey(kind: "viewed" | "played", projectId: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `showcase.${kind}.${day}.${projectId}`;
}
