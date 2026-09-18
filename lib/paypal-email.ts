export function isPaypalEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function samePaypalEmail(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  const keep = name.slice(0, Math.min(2, name.length));
  return `${keep}•••@${domain}`;
}
