// Ethiopia is on East Africa Time (UTC+3). We compute the local civil date in
// EAT regardless of the host (server/PM2 process or browser) timezone so the
// attendance `date` key is always the same for a given Ethiopian calendar day.
// This keeps clock-in/out records aligned with the admin dashboard and with
// real Ethiopian wall-clock time (e.g. a UTC/VPS host no longer off-by-a-day).
export function localDateStr(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
