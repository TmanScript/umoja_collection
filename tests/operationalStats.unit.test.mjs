import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOperationalDrilldownRequest,
  normalizeProvince,
  normalizeOperationalDrilldownProvince,
  normalizeOperationalProvince,
  normalizeOperationalTransactionType,
  parseMonthBucket,
  provinceForAgent,
  provinceForLocationId,
} from '../utils/operationalStats.js';

test('normalizes supported province names', () => {
  assert.equal(normalizeProvince(' Gauteng Province '), 'Gauteng');
  assert.equal(normalizeProvince('limpopo'), 'Limpopo');
  assert.equal(normalizeProvince('Mpumalanga'), 'Other');
});

test('normalizes operational provinces without Other buckets', () => {
  assert.equal(normalizeOperationalProvince('Gauteng'), 'Gauteng');
  assert.equal(normalizeOperationalProvince('Limpopo'), 'Limpopo');
  assert.equal(normalizeOperationalProvince('Other'), 'Gauteng');
  assert.equal(normalizeOperationalProvince(undefined), 'Gauteng');
});

test('normalizes drilldown inputs to explicit supported values', () => {
  assert.equal(normalizeOperationalTransactionType(' SWAP '), 'swap');
  assert.equal(normalizeOperationalTransactionType('collection'), 'collection');
  assert.equal(normalizeOperationalTransactionType('sales'), null);

  assert.equal(normalizeOperationalDrilldownProvince('Gauteng'), 'Gauteng');
  assert.equal(normalizeOperationalDrilldownProvince('Limpopo Province'), 'Limpopo');
  assert.equal(normalizeOperationalDrilldownProvince('Other'), null);
});

test('builds validated operational drilldown requests', () => {
  assert.deepEqual(buildOperationalDrilldownRequest('swap', 202606, 'Gauteng'), {
    transactionType: 'swap',
    sortKey: 202606,
    province: 'Gauteng',
  });
  assert.deepEqual(buildOperationalDrilldownRequest('collection', '202607', 'Limpopo'), {
    transactionType: 'collection',
    sortKey: 202607,
    province: 'Limpopo',
  });
});

test('maps known Umoja location ids to provinces', () => {
  assert.equal(provinceForLocationId('3'), 'Gauteng');
  assert.equal(provinceForLocationId(11), 'Limpopo');
  assert.equal(provinceForLocationId('999'), 'Other');
});

test('maps known Limpopo agents and defaults other agents to Gauteng', () => {
  assert.equal(provinceForAgent('Neo'), 'Limpopo');
  assert.equal(provinceForAgent('Ngoako David Railo'), 'Limpopo');
  assert.equal(provinceForAgent('Another Agent'), 'Gauteng');
});

test('parses month buckets and rejects invalid dates', () => {
  assert.deepEqual(parseMonthBucket('not-a-date'), null);
  assert.equal(parseMonthBucket('2026-07-16T08:00:00.000Z')?.label, 'Jul 2026');
});
