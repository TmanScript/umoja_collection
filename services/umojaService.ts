import { API_BASE_URL, DEFAULT_TOKEN } from '../constants';
import { ENV } from '../env';
import { Customer, Device } from '../types';

class UmojaService {
  // Initialize with the hardcoded default token
  private token: string = DEFAULT_TOKEN;

  setToken(token: string) {
    this.token = token;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    // Some endpoints (e.g. DELETE) return "204 No Content" with an empty body.
    // Calling response.json() on an empty body throws, so guard against it.
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async getCustomers(): Promise<Customer[]> {
    try {
      if (!this.token) throw new Error("No token provided");
      const response = await this.fetch('/customers/customer');
      const rawData = Array.isArray(response) ? response : response.data || [];

      // Robust mapping
      return rawData.map((c: any) => ({
        ...c,
        id: c.id,
        // Ensure we capture the specific ID field required for the PUT request later
        customer_Id: c.customer_Id || c.customerId || c.id,
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || ''
      }));
    } catch (error) {
      console.warn("Failed to fetch customers (likely auth), falling back to empty/mock", error);
      throw error;
    }
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      if (!this.token) throw new Error("No token provided");
      const response = await this.fetch(`/customers/customer/${id}`);
      const c = response.data || response;

      if (!c) return null;

      return {
        id: c.id,
        customer_Id: c.customer_Id || c.customerId || c.id,
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || ''
      };
    } catch (error) {
      console.warn(`Failed to fetch customer ${id}`, error);
      return null;
    }
  }

  async getInventory(): Promise<Device[]> {
    try {
      if (!this.token) throw new Error("No token provided");
      const response = await this.fetch('/inventory/items');
      const rawData = Array.isArray(response) ? response : response.data || [];

      // Map API fields to our Device interface with fallbacks
      return rawData.map((item: any) => {
        // Capture all possible identifiers
        const iccid = item.iccid || item.ICCID || item.Iccid;
        const imei = item.imei || item.IMEI || item.Imei;
        const barcode = item.barcode || item.Barcode || item.bar_code;
        const serialNumber = item.serial_number || item.serialNumber || item.sn || item.SN || item.serial;
        
        // Determine the best display identifier (The "deviceId" used for UI)
        // We prioritize human-readable hardware IDs over internal UUIDs if possible
        const displayId = iccid || barcode || serialNumber || imei || item.deviceId || item.device_id || item.id;
        
        return {
          id: item.id || displayId,
          deviceId: displayId, // This is what shows on the UI
          status: item.status,
          customer_id: item.customer_id || item.customerId || item.customer_Id,
          model: item.model || item.type || item.description,
          type: item.type,
          iccid: iccid,
          imei: imei,
          barcode: barcode,
          serialNumber: serialNumber
        };
      });
    } catch (error) {
      console.warn("Failed to fetch inventory", error);
      throw error;
    }
  }

  // Updated to expect the Internal Database ID, not the barcode
  async returnDevice(id: string): Promise<void> {
    if (!this.token) throw new Error("Token required for transaction");
    // PUT https://portal.umoja.network/api/2.0/admin/inventory/items/{id}
    await this.fetch(`/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'returned'
      }),
    });
  }

  // Updated to expect the Internal Database ID, not the barcode
  async assignDevice(id: string, customerId: string): Promise<void> {
    if (!this.token) throw new Error("Token required for transaction");
    // PUT https://portal.umoja.network/api/2.0/admin/inventory/items/{id}
    await this.fetch(`/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        customer_id: customerId, // Fixed: Using standard snake_case
        status: 'assigned'
      }),
    });
  }

  // New method to disable a customer account
  async disableCustomer(customerId: string): Promise<void> {
    if (!this.token) throw new Error("Token required for transaction");
    // PUT https://portal.umoja.network/api/2.0/admin/customers/customer/{customer_id}
    await this.fetch(`/customers/customer/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'disabled'
      }),
    });
  }

  // Fetch all invoices belonging to a specific customer.
  // Uses Splynx's main_attributes filter to avoid pulling the entire invoice ledger.
  async getCustomerInvoices(customerId: string): Promise<any[]> {
    if (!this.token) throw new Error("No token provided");
    // GET https://portal.umoja.network/api/2.0/admin/finance/invoices
    const query = `?main_attributes[customer_id]=${encodeURIComponent(customerId)}`;
    const response = await this.fetch(`/finance/invoices${query}`);
    const rawData = Array.isArray(response) ? response : response?.data || [];
    // Defensive: filter by customer_id in case the server ignores the query filter.
    return rawData.filter((inv: any) => String(inv.customer_id) === String(customerId));
  }

  // Delete a single invoice by its internal ID.
  async deleteInvoice(id: string | number): Promise<void> {
    if (!this.token) throw new Error("Token required for transaction");
    // DELETE https://portal.umoja.network/api/2.0/admin/finance/invoices/{id}
    await this.fetch(`/finance/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Delete the customer's most recent (last) invoice.
  // Returns the invoice number/id that was deleted, or null if the customer has none.
  async deleteLastInvoiceForCustomer(customerId: string): Promise<string | null> {
    const invoices = await this.getCustomerInvoices(customerId);
    if (!invoices || invoices.length === 0) return null;

    // The "last" invoice is the most recently created one, i.e. the highest ID.
    const lastInvoice = invoices.reduce((latest: any, current: any) =>
      Number(current.id) > Number(latest.id) ? current : latest
    );

    await this.deleteInvoice(lastInvoice.id);
    return String(lastInvoice.number || lastInvoice.id);
  }

  // Specialized method for Sales Statistics
  // Fetches raw customer data with specific reporting credentials
  async getSalesData(): Promise<any[]> {
    // Specific token used for this reporting task, sourced from the environment.
    const SALES_TOKEN = ENV.UMOJA_SALES_TOKEN;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${SALES_TOKEN}`,
    };

    const response = await fetch(`${API_BASE_URL}/customers/customer`, {
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sales API Error ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    return Array.isArray(json) ? json : json.data || [];
  }
}

export const umojaService = new UmojaService();