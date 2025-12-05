
export const API_BASE_URL = "https://portal.umoja.network/api/2.0/admin";

// Hardcoded default token for "Always Connected" mode
export const DEFAULT_TOKEN = "MWY3M2M4ODUzY2FiYzg3ZTI0MjIyOWE5NDU1NDg4MDE6MWU2MTM4NzAwMjA0MjlmNjM3NzRjYmYwZjU5ZGIxMTY=";

// Mock data for demonstration purposes if API fails or for initial state
export const MOCK_CUSTOMERS = [
  { id: "cust_1", first_name: "John", last_name: "Doe", email: "john@example.com", phone: "555-0101" },
  { id: "cust_2", first_name: "Jane", last_name: "Smith", email: "jane@test.com", phone: "555-0102" },
  { id: "cust_3", first_name: "Alice", last_name: "Johnson", email: "alice@company.net", phone: "555-0103" },
];

export const MOCK_INVENTORY = [
  { id: "inv_1", deviceId: "DEV-001", status: "assigned", customer_id: "cust_1", model: "Router X1" },
  { id: "inv_2", deviceId: "DEV-002", status: "in_stock", customer_id: null, model: "Router X1" },
  { id: "inv_3", deviceId: "DEV-003", status: "assigned", customer_id: "cust_2", model: "Modem Z2" },
  { id: "inv_4", deviceId: "DEV-004", status: "returned", customer_id: null, model: "Modem Z2" },
  { id: "inv_5", deviceId: "DEV-005", status: "in_stock", customer_id: null, model: "Router X1" },
];
