import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSACTION_REASON_MAX_LENGTH,
  validateTransactionReason,
  withTransactionReason,
} from '../utils/transactionReason.js';

test('rejects oversized reason input before persistence', () => {
  const result = validateTransactionReason('x'.repeat(TRANSACTION_REASON_MAX_LENGTH + 1));

  assert.equal(result.valid, false);
  assert.match(result.error, /characters or fewer/i);
});

test('stores HTML-like input as plain text payload data', () => {
  const reason = '<script>alert("x")</script> damaged router';
  const payload = withTransactionReason({ status: 'success' }, reason);

  assert.equal(payload.Reason, reason);
});

test('throws before creating a persistence payload without a reason', () => {
  assert.throws(
    () => withTransactionReason({ status: 'success' }, ' \n '),
    /enter a reason/i,
  );
});
