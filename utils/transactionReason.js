// @ts-check

export const TRANSACTION_REASON_MAX_LENGTH = 500;

/**
 * @param {unknown} reason
 * @returns {string}
 */
export const normalizeTransactionReason = (reason) =>
  String(reason ?? '').replace(/\s+/g, ' ').trim();

/**
 * @typedef {{ valid: true, value: string, error: null } | { valid: false, value: string, error: string }} TransactionReasonValidation
 */

/**
 * @param {unknown} reason
 * @returns {TransactionReasonValidation}
 */
export const validateTransactionReason = (reason) => {
  const value = normalizeTransactionReason(reason);

  if (!value) {
    return {
      valid: false,
      value,
      error: 'Please enter a reason for this transaction.',
    };
  }

  if (value.length > TRANSACTION_REASON_MAX_LENGTH) {
    return {
      valid: false,
      value,
      error: `Reason must be ${TRANSACTION_REASON_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { valid: true, value, error: null };
};

/**
 * @template {Record<string, unknown>} T
 * @param {T} record
 * @param {unknown} reason
 * @returns {T & { Reason: string }}
 */
export const withTransactionReason = (record, reason) => {
  const validation = validateTransactionReason(reason);

  if (!validation.valid) {
    throw new Error(validation.error || 'Please enter a reason for this transaction.');
  }

  return {
    ...record,
    Reason: validation.value,
  };
};
