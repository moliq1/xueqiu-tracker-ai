import test from 'node:test';
import assert from 'node:assert/strict';
import { beijingDay, normalizeStocks, applyDailySnapshot } from '../scripts/update-xueqiu.mjs';

const stocks = [
  { symbol: 'sz000001', name: '平安银行', current: 12.3 },
  { symbol: 'SH600519', name: '贵州茅台' }
];

test('Beijing date is used for daily IDs (not runner timezone)', () => {
  assert.equal(beijingDay(new Date('2026-11-03T15:59:00Z')), '2026-11-03');
  assert.equal(beijingDay(new Date('2026-11-03T16:00:00Z')), '2026-11-04');
});

test('normalize preserves watchlist order, omits quote fields, deduplicates', () => {
  assert.deepEqual(normalizeStocks([...stocks, stocks[0]]), [
    { symbol: 'SZ000001', name: '平安银行' },
    { symbol: 'SH600519', name: '贵州茅台' }
  ]);
});

test('invalid/empty responses never create a snapshot', () => {
  assert.throws(() => normalizeStocks([]), /empty/);
  assert.throws(() => normalizeStocks([{ symbol: '', name: 'bad' }]), /invalid/);
  assert.throws(() => applyDailySnapshot({}, stocks, '9430706524', new Date()), /invalid/);
});

test('rerun on same Beijing date replaces rather than doubles a snapshot', () => {
  const first = new Date('2026-11-03T10:15:00Z');
  const second = new Date('2026-11-03T12:15:00Z');
  const initial = applyDailySnapshot([], normalizeStocks(stocks), '9430706524', first);
  const updated = applyDailySnapshot(initial, normalizeStocks([...stocks].reverse()), '9430706524', second);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].timestamp, second.getTime());
  assert.equal(updated[0].stocks[0].symbol, 'SH600519');
});

test('new day appends, and suspiciously large stock drops fail safely', () => {
  const prior = applyDailySnapshot([], Array.from({ length: 20 }, (_, i) => ({
    symbol: 'SH' + String(i).padStart(6, '0'), name: 'Test ' + i
  })), '9430706524', new Date('2026-11-01T10:00:00Z'));
  assert.throws(() => applyDailySnapshot(prior, normalizeStocks(stocks), '9430706524',
    new Date('2026-11-02T10:00:00Z')), /dropped/);
  const next = applyDailySnapshot(prior, normalizeStocks(stocks), '9430706524',
    new Date('2026-11-02T10:00:00Z'), true);
  assert.equal(next.length, 2);
});
