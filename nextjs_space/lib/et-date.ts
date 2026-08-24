const ET = 'America/New_York';

export const ET_TIMEZONE = ET;

export function etYmd(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: ET });
}

/** Calendar yesterday in America/New_York, at any hour (including 8:23 AM ET). */
export function etYesterdayYmd(now = new Date()) {
  const today = etYmd(now);
  const [year, month, day] = today.split('-').map(Number);
  const prev = new Date(Date.UTC(year, month - 1, day));
  prev.setUTCDate(prev.getUTCDate() - 1);
  return prev.toISOString().slice(0, 10);
}
