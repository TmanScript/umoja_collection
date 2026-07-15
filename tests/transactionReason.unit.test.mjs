import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSACTION_REASON_MAX_LENGTH,
  normalizeTransactionReason,
  validateTransactionReason,
} from '../utils/transactionReason.js';

test('normalizes technician-entered reasons', () => {
  assert.equal(
    normalizeTransactionReason('  faulty   router\ncustomer waiting  '),
    'faulty router customer waiting',
  );
});

test('requires a visible reason', () => {
  const result = validateTransactionReason('   \n\t   ');

  assert.equal(result.valid, false);
  assert.equal(result.value, '');
  assert.match(result.error, /enter a reason/i);
});

test('accepts reasons at the configured limit', () => {
  const result = validateTransactionReason('a'.repeat(TRANSACTION_REASON_MAX_LENGTH));

  assert.equal(result.valid, true);
  assert.equal(result.value.length, TRANSACTION_REASON_MAX_LENGTH);
});
