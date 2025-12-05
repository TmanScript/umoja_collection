
import React, { useState } from 'react';
import { Device, Customer } from '../types';
import { umojaService } from '../services/umojaService';
import { recordCollectionTransaction } from '../services/supabaseClient';
import { MOCK_INVENTORY, MOCK_CUSTOMERS } from '../constants';
import { Button } from '../components/Button';
import { Scanner } from '../components/Scanner';

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'success' | 'error' | 'info';
  details?: string;
}

interface CollectionPageProps {
  hasToken: boolean;
  adminName: string;
}

export const CollectionPage: React.FC<CollectionPageProps> = ({ hasToken, adminName }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Staging state for the paired items
  const [routerItem, setRouterItem] = useState<Device | null>(null);
  const [simItem, setSimItem] = useState<Device | null>(null);

  const addLog = (message: string, type: 'success' | 'error' | 'info', details?: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type,
      details
    }, ...prev]);
  };

  const findDeviceInInventory = async (scannedId: string): Promise<Device> => {
    let inventory: Device[] = [];
    if (hasToken) {
      inventory = await umojaService.getInventory();
    } else {
      await new Promise(r => setTimeout(r, 600)); // Fake latency
      inventory = MOCK_INVENTORY;
    }

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
      throw new Error(`Device ${scannedId} not found in inventory.`);
    }
    return device;
  };

  const handleScanRouter = async (scannedId: string) => {
    setLoading(true);
    try {
      const device = await findDeviceInInventory(scannedId);
      
      // Validation: Ensure it's not a SIM
      const isSim = !!device.iccid || (device.model && device.model.toLowerCase().includes('sim'));
      if (isSim) {
        throw new Error(`Scanned item (${device.deviceId}) appears to be a SIM, not a Router.`);
      }

      setRouterItem(device);
    } catch (err: any) {
      addLog(`Router Scan Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanSim = async (scannedId: string) => {
    setLoading(true);
    try {
      const device = await findDeviceInInventory(scannedId);

      // Relaxed validation: Allow scanning any device into the SIM slot.
      setSimItem(device);
    } catch (err: any) {
      addLog(`SIM Scan Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const processCollection = async () => {
    if (!routerItem && !simItem) return;
    setLoading(true);

    // Variables for History Logging
    let customerId = '';
    let customerName = 'Unknown';
    let routerBarcode = routerItem ? (routerItem.barcode || routerItem.deviceId) : '';
    let simBarcode = simItem ? (simItem.barcode || simItem.deviceId) : '';
    
    // Determine Customer ID from router (preferred) or sim
    if (routerItem && routerItem.customer_id) customerId = routerItem.customer_id;
    else if (simItem && simItem.customer_id) customerId = simItem.customer_id;
    
    try {
      // 0. Fetch Customer Name if we have an ID
      if (customerId) {
         if (hasToken) {
             const customer = await umojaService.getCustomer(customerId);
             if (customer) {
                 customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.name || 'Unknown';
             }
         } else {
             const mockCust = MOCK_CUSTOMERS.find(c => c.id === customerId);
             if (mockCust) customerName = `${mockCust.first_name} ${mockCust.last_name}`;
         }
      }

      // 1. Process Router
      if (routerItem) {
        addLog(`Processing Router: ${routerItem.deviceId}...`, 'info');
        if (hasToken) {
          await umojaService.returnDevice(routerItem.id);
        }
        addLog(`Router (${routerItem.deviceId}) marked as RETURNED.`, 'success');

        if (routerItem.customer_id) {
          if (hasToken) {
            await umojaService.disableCustomer(routerItem.customer_id);
          }
          addLog(`Customer (ID: ${routerItem.customer_id}) status set to DISABLED.`, 'success');
        } else {
          addLog(`No customer linked to Router ${routerItem.deviceId}.`, 'info');
        }
      }

      // 2. Process SIM
      if (simItem) {
        addLog(`Processing SIM: ${simItem.deviceId}...`, 'info');
        if (hasToken) {
          await umojaService.returnDevice(simItem.id);
        }
        addLog(`SIM (${simItem.deviceId}) marked as RETURNED.`, 'success');
        
        // Per requirement: SIMs only get returned. No customer disabling logic for SIMs.
      }

      // 3. Record History to Supabase
      const agent = adminName;
      let province = 'Gauteng';
      if (agent === 'Neo' || agent === 'Ngoako David Railo') {
          province = 'Limpopo';
      }

      await recordCollectionTransaction({
          "Customer ID": customerId || "N/A",
          "Full Name": customerName,
          "Barcode": routerBarcode,
          "SIM": simBarcode,
          "Agent": agent,
          "Province": province,
          "Date": new Date().toISOString()
      });
      addLog('Transaction logged to Collection History.', 'success');

      // Clear form on success
      setRouterItem(null);
      setSimItem(null);
      addLog('Collection transaction completed successfully.', 'success');

    } catch (err: any) {
      addLog('Transaction Failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-pink-100 rounded-full text-pink-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Device Collection</h2>
          <p className="text-gray-500">Scan items to return them to inventory and disable associated customer accounts.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Input Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Router Section */}
          <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${routerItem ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs flex items-center justify-center">1</span>
              Router / CPE
            </h3>
            
            {!routerItem ? (
               <Scanner 
                 onScan={handleScanRouter} 
                 label="Scan Router Barcode" 
                 placeholder="Focus here to scan router..."
               />
            ) : (
               <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-700 font-bold mb-1">✓ Router Identified</p>
                    <p className="text-xl font-mono text-gray-900">{routerItem.deviceId}</p>
                    <p className="text-sm text-gray-500">{routerItem.model || "Unknown Model"}</p>
                    {routerItem.customer_id && (
                        <p className="text-xs text-orange-600 mt-1">Customer ID: {routerItem.customer_id} (Will be disabled)</p>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => setRouterItem(null)} className="text-sm">Remove</Button>
               </div>
            )}
          </div>

          {/* SIM Section */}
          <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${simItem ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-xs flex items-center justify-center">2</span>
              SIM Card
            </h3>
            
            {!simItem ? (
               <Scanner 
                 onScan={handleScanSim} 
                 label="Scan SIM Barcode" 
                 placeholder="Focus here to scan SIM..."
               />
            ) : (
               <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-700 font-bold mb-1">✓ SIM Identified</p>
                    <p className="text-xl font-mono text-gray-900">{simItem.deviceId}</p>
                    <p className="text-sm text-gray-500">ICCID: {simItem.iccid || "N/A"}</p>
                  </div>
                  <Button variant="secondary" onClick={() => setSimItem(null)} className="text-sm">Remove</Button>
               </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex justify-between items-center">
             <div className="text-sm text-gray-500">
                {(!routerItem && !simItem) ? 'Scan at least one item to proceed.' : 'Ready to process collection.'}
             </div>
             <Button 
                onClick={processCollection} 
                disabled={(!routerItem && !simItem) || loading}
                isLoading={loading}
                className="w-48 shadow-lg shadow-pink-200"
             >
                Confirm Collection
             </Button>
          </div>
        </div>

        {/* Right Column: Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:h-[600px] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Activity Log</h3>
                <Button variant="ghost" onClick={() => setLogs([])} disabled={logs.length === 0} className="text-xs">Clear</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
                {logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm mt-12">
                        <div className="mb-2">📋</div>
                        No activity yet.<br/>Scan a device to begin.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {logs.map(log => (
                            <div key={log.id} className="p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                                <div className="flex-shrink-0 mt-1.5">
                                    {log.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100"></div>}
                                    {log.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100"></div>}
                                    {log.type === 'info' && <div className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-100"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium break-words ${log.type === 'error' ? 'text-red-700' : 'text-gray-900'}`}>
                                        {log.message}
                                    </p>
                                    {log.details && <p className="text-xs text-gray-500 mt-1 break-words">{log.details}</p>}
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {log.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
