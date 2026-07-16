import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildOperationalDrilldownRequest,
  buildMonthlyProvinceDataFromAggregateRows,
  buildCollectionMonthlyProvinceData,
  buildSuccessfulSwapMonthlyProvinceData,
  provinceForLocationId,
} from '../utils/operationalStats.js';

test('ignores malformed dates instead of creating unsafe chart buckets', () => {
  const data = buildCollectionMonthlyProvinceData([
    { Date: '<script>alert(1)</script>', Province: 'Gauteng' },
    { Date: '2026-07-01T10:00:00Z', Province: 'Gauteng' },
  ]);

  assert.deepEqual(data, [
    { label: 'Jul 2026', Gauteng: 1, Limpopo: 0, Other: 0, sortKey: 202606 },
  ]);
});

test('does not treat arbitrary location ids as trusted province labels', () => {
  assert.equal(provinceForLocationId('__proto__'), 'Other');
  assert.equal(provinceForLocationId('constructor'), 'Other');
});

test('filters failed swaps out of successful swap graph data', () => {
  const data = buildSuccessfulSwapMonthlyProvinceData([
    { Date: '2026-08-01T10:00:00Z', status: 'success', Province: 'Gauteng' },
    { Date: '2026-08-01T10:00:00Z', status: 'History logging failed', Province: 'Limpopo' },
  ]);

  assert.deepEqual(data, [
    { label: 'Aug 2026', Gauteng: 1, Limpopo: 0, Other: 0, sortKey: 202607 },
  ]);
});

test('rejects malformed aggregate RPC rows before charting', () => {
  const data = buildMonthlyProvinceDataFromAggregateRows([
    { transaction_type: 'swap', month_label: 'Sep 2026', sort_key: 202608, province: 'Gauteng', total: 1 },
    { transaction_type: 'swap', month_label: '<img src=x>', sort_key: 'bad', province: 'Limpopo', total: 5 },
    { transaction_type: 'swap', month_label: 'Sep 2026', sort_key: 202608, province: 'Limpopo', total: -1 },
  ], 'swap');

  assert.deepEqual(data, [
    { label: 'Sep 2026', Gauteng: 1, Limpopo: 0, Other: 0, sortKey: 202608 },
  ]);
});

test('does not expose an Other bucket from aggregate operational rows', () => {
  const data = buildMonthlyProvinceDataFromAggregateRows([
    { transaction_type: 'collection', month_label: 'Oct 2026', sort_key: 202609, province: 'Unexpected', total: 4 },
  ], 'collection');

  assert.deepEqual(data, [
    { label: 'Oct 2026', Gauteng: 4, Limpopo: 0, Other: 0, sortKey: 202609 },
  ]);
});

test('rejects malformed drilldown requests before calling Supabase', () => {
  assert.equal(buildOperationalDrilldownRequest('swap; drop table x', 202606, 'Gauteng'), null);
  assert.equal(buildOperationalDrilldownRequest('swap', 202612, 'Gauteng'), null);
  assert.equal(buildOperationalDrilldownRequest('collection', 202606, 'Other'), null);
  assert.equal(buildOperationalDrilldownRequest('collection', '<script>', 'Limpopo'), null);
});

test('operational drilldown RPC uses fixed projection and no dynamic SQL', () => {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/20260716110000_add_operational_drilldown_records.sql', import.meta.url),
    'utf8',
  ).toLowerCase();

  assert.match(sql, /create or replace function public\.get_operational_drilldown_records/);
  assert.match(sql, /returns table/);
  assert.doesNotMatch(sql, /select\s+\*/);
  assert.doesNotMatch(sql, /\bexecute\s+immediate\b/);
  assert.doesNotMatch(sql, /\bformat\s*\(/);
  assert.doesNotMatch(sql, /\|\|/);
});
