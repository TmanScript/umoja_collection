import React, { useState } from 'react';
import { Customer, Device, SwapState } from '../types';
import { umojaService } from '../services/umojaService';
import { recordSwapTransaction } from '../services/supabaseClient';
import { MOCK_CUSTOMERS, MOCK_INVENTORY } from '../constants';
import { Button } from '../components/Button';
import { Scanner } from '../components/Scanner';

interface SwapPageProps {
  hasToken: boolean;
  adminId: string;
  adminName: string;
  onOpenSettings: () => void;
}

export const SwapPage: React.FC<SwapPageProps> = ({ hasToken, adminId, adminName, onOpenSettings }) => {
  // State for the wizard
  const [state, setState] = useState<SwapState>({
    step: 'select-customer',
    selectedCustomer: null,
    oldDevice: null,
    newDevice: null,
  });

  // Data Loading States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerDevices, setCustomerDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);

  // -------- Step 1: Customer Selection Logic --------

  const searchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Logic: Use API if token present, else use Mock for demo
      let allCustomers: Customer[] = [];
      if (hasToken) {
        allCustomers = await umojaService.getCustomers();
      } else {
        // Fallback to mock if no token, just to show UI
        await new Promise(r => setTimeout(r, 600)); // Fake latency
        allCustomers = MOCK_CUSTOMERS;
      }
      
      setCustomers(allCustomers);
      
      const term = searchTerm.toLowerCase();
      const results = allCustomers.filter(c => 
        (c.name?.toLowerCase().includes(term)) ||
        (c.first_name?.toLowerCase().includes(term)) || 
        (c.last_name?.toLowerCase().includes(term)) ||
        (c.email?.toLowerCase().includes(term))
      );
      setSearchResults(results);

    } catch (err: any) {
      setError(err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setLoading(true);
    try {
        let inventory: Device[] = [];
        if (hasToken) {
            inventory = await umojaService.getInventory();
        } else {
            inventory = MOCK_INVENTORY;
        }

        // Find devices assigned to this customer
        const owned = inventory.filter(d => d.customer_id === customer.id && d.status === 'assigned');
        
        setCustomerDevices(owned);
        setState(prev => ({ ...prev, selectedCustomer: customer, step: 'select-old-device' }));
    } catch (err: any) {
        setError("Could not fetch customer inventory");
    } finally {
        setLoading(false);
    }
  };

  // -------- Step 2: Old Device Selection Logic --------

  const selectOldDevice = (device: Device) => {
    setState(prev => ({ ...prev, oldDevice: device, step: 'scan-new-device' }));
  };

  // -------- Step 3: New Device Scanning Logic --------

  const handleScanNewDevice = async (scannedId: string) => {
    setLoading(true);
    setError(null);
    try {
        // We need to verify the new device exists and is available
        let inventory: Device[] = [];
        if (hasToken) {
             inventory = await umojaService.getInventory();
        } else {
             await new Promise(r => setTimeout(r, 800));
             const exists = MOCK_INVENTORY.find(i => i.deviceId === scannedId);
             if (exists) inventory = MOCK_INVENTORY;
             else inventory = [...MOCK_INVENTORY, { id: 'new_gen', deviceId: scannedId, status: 'in_stock', customer_id: undefined, model: 'Gen 3 Device' }];
        }

        // Robust search: Check all possible identifiers against the scan
        const cleanScan = scannedId.trim().toLowerCase();
        
        const device = inventory.find(d => 
            String(d.deviceId).trim().toLowerCase() === cleanScan || 
            String(d.id).trim().toLowerCase() === cleanScan ||
            (d.iccid && String(d.iccid).trim().toLowerCase() === cleanScan) ||
            (d.imei && String(d.imei).trim().toLowerCase() === cleanScan) ||
            (d.barcode && String(d.barcode).trim().toLowerCase() === cleanScan) ||
            (d.serialNumber && String(d.serialNumber).trim().toLowerCase() === cleanScan)
        );

        if (!device) {
            throw new Error(`Device with Barcode/ID ${scannedId} not found in inventory.`);
        }

        if (device.status === 'assigned' && device.customer_id) {
            throw new Error(`Device ${device.deviceId} is already assigned to another customer.`);
        }

        if (device.status === 'defective') {
            throw new Error(`Device ${device.deviceId} is marked as defective.`);
        }

        setState(prev => ({ ...prev, newDevice: device, step: 'confirm' }));

    } catch (err: any) {
        setError(err.message);
        
        // Log Validation Failure to Database
        if (state.selectedCustomer && state.oldDevice && adminId) {
            // Helper to safely get numeric admin ID (same as in executeSwap)
            const numericId = parseInt(adminId, 10);
            const finalAdminId = !isNaN(numericId) && numericId !== 0 ? numericId : adminId;

            recordSwapTransaction({
                Customer_ID: state.selectedCustomer.customer_Id || state.selectedCustomer.id,
                Customer_Name: `${state.selectedCustomer.first_name || ''} ${state.selectedCustomer.last_name || ''}`.trim() || (state.selectedCustomer.name || 'Unknown'),
                admin_id: finalAdminId,
                Admin_Name: adminName,
                Old_Device: state.oldDevice.barcode || state.oldDevice.deviceId, 
                New_Device: scannedId, // Log the scanned input that caused the error
                Date: new Date().toISOString(),
                status: err.message // e.g. "Device X is already assigned..."
            }).catch(dbErr => console.error("Failed to log validation error to history:", dbErr));
        }

    } finally {
        setLoading(false);
    }
  };

  // -------- Step 4: Execution Logic --------

  const executeSwap = async () => {
    if (!state.oldDevice || !state.newDevice || !state.selectedCustomer) return;
    
    // Critical Validation: Ensure we have the Admin ID for the database foreign key
    if (!adminId || adminId === 'undefined') {
        alert("Session Error: Admin ID missing. Please refresh the page or log out and log in again.");
        return;
    }

    setLoading(true);
    
    // Helper to safely get numeric admin ID
    const getAdminId = () => {
        const numericId = parseInt(adminId, 10);
        return !isNaN(numericId) && numericId !== 0 ? numericId : adminId;
    };
    const finalAdminId = getAdminId();

    try {
        if (!hasToken) {
            await new Promise(r => setTimeout(r, 2000)); // Simulate work
        } else {
            // 1. Return old device
            await umojaService.returnDevice(state.oldDevice.id);
            
            // 2. Assign new device
            const custId = state.selectedCustomer.customer_Id || state.selectedCustomer.id;
            await umojaService.assignDevice(state.newDevice.id, custId);

            // 3. Record History in Supabase (Success)
            await recordSwapTransaction({
                Customer_ID: custId,
                Customer_Name: `${state.selectedCustomer.first_name || ''} ${state.selectedCustomer.last_name || ''}`.trim() || (state.selectedCustomer.name || 'Unknown'),
                admin_id: finalAdminId, 
                Admin_Name: adminName,
                Old_Device: state.oldDevice.barcode || state.oldDevice.deviceId, 
                New_Device: state.newDevice.barcode || state.newDevice.deviceId, 
                Date: new Date().toISOString(),
                status: 'success'
            });
        }
        
        // Success state - Show alert
        alert(`Swap Successful!\nOld Device Returned: ${state.oldDevice.deviceId}\nNew Device Assigned: ${state.newDevice.deviceId}\n\nTransaction logged to history.`);
        
        // Reset Flow
        setState({
            step: 'select-customer',
            selectedCustomer: null,
            oldDevice: null,
            newDevice: null,
        });
        setSearchTerm('');
        setSearchResults([]);
        setCustomers([]); 

    } catch (err: any) {
        // Attempt to log the failure to database
        try {
            await recordSwapTransaction({
                Customer_ID: state.selectedCustomer.customer_Id || state.selectedCustomer.id,
                Customer_Name: `${state.selectedCustomer.first_name || ''} ${state.selectedCustomer.last_name || ''}`.trim() || (state.selectedCustomer.name || 'Unknown'),
                admin_id: finalAdminId, 
                Admin_Name: adminName,
                Old_Device: state.oldDevice.barcode || state.oldDevice.deviceId, 
                New_Device: state.newDevice.barcode || state.newDevice.deviceId, 
                Date: new Date().toISOString(),
                status: err.message || 'Unknown Error'
            });
        } catch (logErr) {
            console.error("Failed to log failure record to DB", logErr);
        }

        // Handle Foreign Key Error explicitly (in case logging failed due to auth, or if original error was auth)
        if (err.message && err.message.includes('foreign key constraint')) {
            setError(`Database Error: Your login session ID (${adminId}) does not match an active Admin record. Please Log Out and Sign In again.`);
        } else {
            setError(`Swap failed: ${err.message}`);
        }
    } finally {
        setLoading(false);
    }
  };

  // -------- Renders --------

  const renderBreadcrumbs = () => (
    <div className="flex items-center text-sm mb-8 overflow-x-auto pb-2">
      <div className={`flex items-center ${state.step === 'select-customer' ? 'text-pink-600 font-bold' : 'text-gray-500'}`}>
        <span className={`w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs ${state.step === 'select-customer' ? 'border-pink-600 bg-pink-50' : 'border-gray-300'}`}>1</span>
        Find Customer
      </div>
      <div className="mx-4 text-gray-300">/</div>
      <div className={`flex items-center ${state.step === 'select-old-device' ? 'text-pink-600 font-bold' : 'text-gray-500'}`}>
        <span className={`w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs ${state.step === 'select-old-device' ? 'border-pink-600 bg-pink-50' : 'border-gray-300'}`}>2</span>
        Select Old
      </div>
      <div className="mx-4 text-gray-300">/</div>
      <div className={`flex items-center ${state.step === 'scan-new-device' ? 'text-pink-600 font-bold' : 'text-gray-500'}`}>
        <span className={`w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs ${state.step === 'scan-new-device' ? 'border-pink-600 bg-pink-50' : 'border-gray-300'}`}>3</span>
        Scan New
      </div>
      <div className="mx-4 text-gray-300">/</div>
      <div className={`flex items-center ${state.step === 'confirm' ? 'text-pink-600 font-bold' : 'text-gray-500'}`}>
        <span className={`w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs ${state.step === 'confirm' ? 'border-pink-600 bg-pink-50' : 'border-gray-300'}`}>4</span>
        Confirm
      </div>
    </div>
  );

  return (
    <div>
      {renderBreadcrumbs()}
      
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex justify-between items-center">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* View: Select Customer */}
      {state.step === 'select-customer' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Customer</h2>
            <p className="text-gray-500 mb-6">Search by name, email, or customer ID to begin the swap process.</p>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
              />
              <Button onClick={searchCustomers} isLoading={loading}>Search</Button>
            </div>

            <div className="space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map(c => (
                  <div key={c.id} className="p-4 border rounded-lg hover:border-pink-500 hover:bg-pink-50 cursor-pointer transition-all flex justify-between items-center group" onClick={() => selectCustomer(c)}>
                    <div>
                      <p className="font-medium text-gray-900">{c.first_name} {c.last_name} {c.name}</p>
                      <p className="text-sm text-gray-500">{c.email}</p>
                    </div>
                    <div className="text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">Select →</div>
                  </div>
                ))
              ) : (
                searchTerm && !loading && <div className="text-center text-gray-500 py-8">No customers found.</div>
              )}
              
              {!hasToken && !loading && searchResults.length === 0 && (
                 <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">Using Mock Data Mode</p>
                    <Button variant="secondary" onClick={() => { setSearchTerm('John'); searchCustomers(); }}>Try Searching "John"</Button>
                    <p className="text-xs text-gray-400 mt-2 cursor-pointer hover:underline" onClick={onOpenSettings}>Or Configure API Token</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View: Select Old Device */}
      {state.step === 'select-old-device' && state.selectedCustomer && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Select Device to Return</h2>
                    <p className="text-gray-500">Which device is {state.selectedCustomer.first_name || state.selectedCustomer.name} returning?</p>
                </div>
                <Button variant="secondary" onClick={() => setState(prev => ({...prev, step: 'select-customer'}))}>Change Customer</Button>
            </div>

            {customerDevices.length === 0 ? (
                <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-yellow-800 font-medium mb-2">No assigned devices found</p>
                    <p className="text-sm text-yellow-600">This customer has no active inventory assigned.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {customerDevices.map(device => (
                        <div key={device.id} onClick={() => selectOldDevice(device)} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all group">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-white">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                                </div>
                                <div>
                                    {/* Primary Info: The Device ID / Barcode */}
                                    <p className="font-bold text-gray-900 text-lg">{device.deviceId || "No Barcode"}</p>
                                    {/* Secondary Info: Model */}
                                    {device.model && <p className="text-sm text-gray-500">{device.model}</p>}
                                    {/* Fallback for empty model is hidden to avoid 'Unknown Model' confusion unless needed */}
                                    {!device.model && <p className="text-xs text-gray-400">Standard Device</p>}
                                </div>
                             </div>
                             <div className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                Active
                             </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}

      {/* View: Scan New Device */}
      {state.step === 'scan-new-device' && state.oldDevice && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
             <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <span>Returning:</span>
                    <span className="font-mono bg-red-100 text-red-700 px-2 rounded">{state.oldDevice.deviceId}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Scan New Device</h2>
                <p className="text-gray-500">Scan the barcode (ICCID/IMEI/Serial) of the replacement unit.</p>
             </div>

             <Scanner onScan={handleScanNewDevice} />
             
             {loading && <p className="text-center text-pink-600 mt-4 animate-pulse">Verifying inventory...</p>}
             
             <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between">
                <Button variant="secondary" onClick={() => setState(prev => ({...prev, step: 'select-old-device'}))}>Back</Button>
             </div>
          </div>
        </div>
      )}

      {/* View: Confirm Swap */}
      {state.step === 'confirm' && state.oldDevice && state.newDevice && state.selectedCustomer && (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Swap Transaction</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Returning Card */}
                <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-red-600 font-bold uppercase tracking-wider text-sm mb-4">Inbound (Return)</h3>
                    <div className="space-y-3 relative z-10">
                        <div>
                            <label className="text-xs text-gray-500">Device Barcode</label>
                            <p className="text-xl font-mono font-bold text-gray-900">{state.oldDevice.deviceId}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Current Status</label>
                            <p className="text-gray-700">{state.oldDevice.status}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">New Status</label>
                            <p className="text-red-600 font-bold">Returned</p>
                        </div>
                    </div>
                </div>

                {/* Assigning Card */}
                <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-green-600 font-bold uppercase tracking-wider text-sm mb-4">Outbound (Assign)</h3>
                    <div className="space-y-3 relative z-10">
                        <div>
                            <label className="text-xs text-gray-500">Device Barcode</label>
                            <p className="text-xl font-mono font-bold text-gray-900">{state.newDevice.deviceId}</p>
                        </div>
                         <div>
                            <label className="text-xs text-gray-500">Customer</label>
                            <p className="text-gray-900 font-medium">{state.selectedCustomer.first_name} {state.selectedCustomer.last_name}</p>
                            <p className="text-xs text-gray-400">{state.selectedCustomer.id}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">New Status</label>
                            <p className="text-green-600 font-bold">Assigned</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-xl">
                <Button variant="secondary" onClick={() => setState(prev => ({...prev, step: 'scan-new-device'}))}>Back</Button>
                <div className="flex gap-4">
                     {!hasToken && <p className="text-xs text-orange-500 self-center max-w-[200px] text-right">Running in demo mode (simulated API calls).</p>}
                     <Button onClick={executeSwap} isLoading={loading} className="w-48 shadow-lg shadow-pink-200">
                        Confirm Swap
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};