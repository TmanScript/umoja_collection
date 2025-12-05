
export interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  customer_Id?: string; // Handling potential inconsistency in API naming
}

export interface Device {
  id: string; // Internal DB ID
  deviceId: string; // The primary display ID (could be serial, barcode, or UUID)
  status: 'assigned' | 'returned' | 'in_stock' | 'defective' | string;
  customer_id?: string;
  model?: string;
  type?: string;
  iccid?: string;
  imei?: string;
  barcode?: string;
  serialNumber?: string;
}

export interface SwapState {
  step: 'select-customer' | 'select-old-device' | 'scan-new-device' | 'confirm';
  selectedCustomer: Customer | null;
  oldDevice: Device | null;
  newDevice: Device | null;
}

export interface ApiConfig {
  baseUrl: string;
  token: string;
}
