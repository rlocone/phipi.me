export const GLORIA_BYLINE_NAME = 'Gloria';

/** Human display: Aug 27, 2026, 10:55 AM ET */
export function formatPublishedAtEt(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const formatted = d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${formatted} ET`;
}

/** <time datetime> value with America/New_York offset when possible */
export function publishedAtEtIso(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;

  const tz = parts.timeZoneName || 'GMT-00:00';
  let offset = tz.replace(/^GMT/i, '');
  if (!offset || offset === 'Z') offset = '+00:00';
  if (/^[+-]\d{1,2}$/.test(offset)) {
    const sign = offset[0];
    const hrs = offset.slice(1).padStart(2, '0');
    offset = `${sign}${hrs}:00`;
  } else if (/^[+-]\d{2}\d{2}$/.test(offset)) {
    offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/** Exact public credit. Only the timestamp changes. */
export function gloriaPublicByline(publishedAt: Date | string | null | undefined): string {
  const when = formatPublishedAtEt(publishedAt);
  if (!when) {
    return 'Posted by Gloria, publicist to James Ortega, Tallahassee FL';
  }
  return `Posted by Gloria, publicist to James Ortega, Tallahassee FL — ${when}`;
}
