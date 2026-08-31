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

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Clock-in/out times are stored as UTC ISO strings. Render them in Ethiopia
// local time (UTC+3) so they display correctly regardless of the browser or
// device timezone. Returns e.g. "08:30 AM" / "1:05 PM".
export function formatEATTime(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return "—";
  const eat = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  let h = eat.getUTCHours();
  const min = eat.getUTCMinutes();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = min < 10 ? `0${min}` : `${min}`;
  return `${h}:${mm} ${period}`;
}
