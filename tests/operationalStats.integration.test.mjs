import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOperationalDrilldownRequest,
  buildCollectionMonthlyProvinceData,
  buildMonthlyProvinceDataFromAggregateRows,
  buildSuccessfulSwapMonthlyProvinceData,
} from '../utils/operationalStats.js';

test('supports combined operational graph data for swaps and collections', () => {
  const swaps = buildSuccessfulSwapMonthlyProvinceData([
    { Date: '2026-04-10T10:00:00Z', status: 'success', Province: 'Gauteng', Admin_Name: 'Agent A' },
    { Date: '2026-04-11T10:00:00Z', status: 'success', Province: 'Limpopo', Admin_Name: 'Neo' },
    { Date: '2026-04-12T10:00:00Z', status: 'failed', Province: 'Gauteng', Admin_Name: 'Agent A' },
  ]);
  const collections = buildCollectionMonthlyProvinceData([
    { Date: '2026-04-13T10:00:00Z', Province: 'Gauteng' },
    { Date: '2026-05-01T10:00:00Z', Province: 'Limpopo' },
  ]);

  assert.equal(swaps.length, 1);
  assert.equal(swaps[0].Gauteng, 1);
  assert.equal(swaps[0].Limpopo, 1);
  assert.equal(collections.length, 2);
  assert.equal(collections[0].label, 'Apr 2026');
  assert.equal(collections[1].label, 'May 2026');
});

test('uses stored swap province before falling back to agent inference', () => {
  const data = buildSuccessfulSwapMonthlyProvinceData([
    { Date: '2026-06-01T10:00:00Z', status: 'success', Province: 'Gauteng', Admin_Name: 'Neo' },
    { Date: '2026-06-02T10:00:00Z', status: 'success', Admin_Name: 'Neo' },
  ]);

  assert.deepEqual(data, [
    { label: 'Jun 2026', Gauteng: 1, Limpopo: 1, Other: 0, sortKey: 202605 },
  ]);
});

test('builds graph data from aggregate Supabase RPC rows', () => {
  const rows = [
    { transaction_type: 'swap', month_label: 'Jul 2026', sort_key: 202606, province: 'Gauteng', total: 2 },
    { transaction_type: 'swap', month_label: 'Jul 2026', sort_key: 202606, province: 'Limpopo', total: 1 },
    { transaction_type: 'collection', month_label: 'Jul 2026', sort_key: 202606, province: 'Limpopo', total: 3 },
  ];

  assert.deepEqual(buildMonthlyProvinceDataFromAggregateRows(rows, 'swap'), [
    { label: 'Jul 2026', Gauteng: 2, Limpopo: 1, Other: 0, sortKey: 202606 },
  ]);
  assert.deepEqual(buildMonthlyProvinceDataFromAggregateRows(rows, 'collection'), [
    { label: 'Jul 2026', Gauteng: 0, Limpopo: 3, Other: 0, sortKey: 202606 },
  ]);
});

test('folds legacy Other aggregate rows into Gauteng for operational charts', () => {
  const rows = [
    { transaction_type: 'swap', month_label: 'Jul 2026', sort_key: 202606, province: 'Other', total: 2 },
    { transaction_type: 'swap', month_label: 'Jul 2026', sort_key: 202606, province: 'Limpopo', total: 1 },
  ];

  assert.deepEqual(buildMonthlyProvinceDataFromAggregateRows(rows, 'swap'), [
    { label: 'Jul 2026', Gauteng: 2, Limpopo: 1, Other: 0, sortKey: 202606 },
  ]);
});

test('drilldown request keys match aggregate chart buckets', () => {
  const rows = [
    { transaction_type: 'swap', month_label: 'Jul 2026', sort_key: 202606, province: 'Gauteng', total: 2 },
    { transaction_type: 'swap', month_label: 'Jul 2026', sort_key: 202606, province: 'Limpopo', total: 1 },
  ];
  const [bucket] = buildMonthlyProvinceDataFromAggregateRows(rows, 'swap');

  assert.deepEqual(
    buildOperationalDrilldownRequest('swap', bucket.sortKey, 'Gauteng'),
    { transactionType: 'swap', sortKey: 202606, province: 'Gauteng' },
  );
  assert.equal(bucket.Gauteng, 2);
});
