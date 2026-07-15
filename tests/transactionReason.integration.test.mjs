import test from 'node:test';
import assert from 'node:assert/strict';
import { withTransactionReason } from '../utils/transactionReason.js';

test('adds normalized reason to swap history payloads', () => {
  const payload = withTransactionReason({
    Customer_ID: 'cust_1',
    Customer_Name: 'John Doe',
    admin_id: 7,
    Admin_Name: 'Technician',
    Old_Device: 'OLD-1',
    New_Device: 'NEW-1',
    Date: '2026-07-15T10:00:00.000Z',
    status: 'success',
  }, '  Router damaged during storm ');

  assert.equal(payload.Reason, 'Router damaged during storm');
  assert.equal(payload.Customer_ID, 'cust_1');
});

test('adds normalized reason to collection history payloads', () => {
  const payload = withTransactionReason({
    'Customer ID': 'cust_2',
    'Full Name': 'Jane Smith',
    Barcode: 'RTR-1',
    SIM: 'SIM-1',
    Agent: 'Neo',
    Province: 'Limpopo',
    Date: '2026-07-15T10:00:00.000Z',
  }, ' Customer cancelled service ');

  assert.equal(payload.Reason, 'Customer cancelled service');
  assert.equal(payload.Agent, 'Neo');
});
