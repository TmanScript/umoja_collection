import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTransactionReason } from '../utils/transactionReason.js';

test('confirm actions can proceed only when the reason is valid', () => {
  assert.equal(validateTransactionReason('').valid, false);
  assert.equal(validateTransactionReason('Faulty CPE replaced on site').valid, true);
});

test('technician typo whitespace does not block a real reason', () => {
  const result = validateTransactionReason('  Non-payment   collection  ');

  assert.equal(result.valid, true);
  assert.equal(result.value, 'Non-payment collection');
});
