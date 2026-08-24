import assert from 'node:assert/strict';
import { etYmd, etYesterdayYmd } from './et-date';

function utc(iso: string) {
  return new Date(iso);
}

// Mon 24 Aug 2026. EDT = UTC-4.
const beforeNoon = utc('2026-08-24T12:23:00.000Z'); // 8:23 AM ET
const midMorning = utc('2026-08-24T14:19:00.000Z'); // 10:19 AM ET
const afterNoon = utc('2026-08-24T18:00:00.000Z'); // 2:00 PM ET
const lateEvening = utc('2026-08-25T03:30:00.000Z'); // 11:30 PM ET

assert.equal(etYmd(beforeNoon), '2026-08-24');
assert.equal(etYesterdayYmd(beforeNoon), '2026-08-23', '8:23 AM ET must be calendar yesterday');
assert.equal(etYesterdayYmd(midMorning), '2026-08-23', '10:19 AM ET must be calendar yesterday');
assert.equal(etYesterdayYmd(afterNoon), '2026-08-23', 'after-noon ET must be calendar yesterday');
assert.equal(etYesterdayYmd(lateEvening), '2026-08-23', 'late evening ET must be calendar yesterday');

const newYears = utc('2026-01-01T10:00:00.000Z'); // 5:00 AM ET Jan 1 (EST)
assert.equal(etYmd(newYears), '2026-01-01');
assert.equal(etYesterdayYmd(newYears), '2025-12-31');

console.log('et-date tests ok');
