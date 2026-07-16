import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCollectionMonthlyProvinceData,
  buildSuccessfulSwapMonthlyProvinceData,
  summarizeMonthlyProvinceData,
} from '../utils/operationalStats.js';

test('builds successful swap graph data per month and province', () => {
  const data = buildSuccessfulSwapMonthlyProvinceData([
    { Date: '2026-01-05T10:00:00Z', status: 'success', Province: 'Gauteng', Admin_Name: 'Agent A' },
    { Date: '2026-01-08T10:00:00Z', status: 'success', Province: 'Limpopo', Admin_Name: 'Neo' },
    { Date: '2026-01-09T10:00:00Z', status: 'Device already assigned', Province: 'Gauteng', Admin_Name: 'Agent A' },
    { Date: '2026-02-01T10:00:00Z', status: 'success', Admin_Name: 'Neo' },
  ]);

  assert.deepEqual(data, [
    { label: 'Jan 2026', Gauteng: 1, Limpopo: 1, Other: 0, sortKey: 202600 },
    { label: 'Feb 2026', Gauteng: 0, Limpopo: 1, Other: 0, sortKey: 202601 },
  ]);
});

test('builds collection graph data per month and province', () => {
  const data = buildCollectionMonthlyProvinceData([
    { Date: '2026-03-01T10:00:00Z', Province: 'Gauteng' },
    { Date: '2026-03-02T10:00:00Z', Province: 'Limpopo' },
    { Date: '2026-03-03T10:00:00Z', Province: 'Unknown' },
  ]);

  assert.deepEqual(data, [
    { label: 'Mar 2026', Gauteng: 1, Limpopo: 1, Other: 1, sortKey: 202602 },
  ]);
});

test('summarizes graph totals for dashboard cards', () => {
  const totals = summarizeMonthlyProvinceData([
    { label: 'Jan 2026', Gauteng: 1, Limpopo: 2, Other: 0, sortKey: 202600 },
    { label: 'Feb 2026', Gauteng: 3, Limpopo: 0, Other: 1, sortKey: 202601 },
  ]);

  assert.deepEqual(totals, { Gauteng: 4, Limpopo: 2, Other: 1, Total: 7 });
});
