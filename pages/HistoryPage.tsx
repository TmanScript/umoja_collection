import React, { useEffect, useState } from 'react';
import { getSwapHistory, SwapHistoryRecord, getCollectionHistory, CollectionTransactionRecord } from '../services/supabaseClient';
import { Link } from 'react-router-dom';

interface HistoryPageProps {
  adminId: string;
  adminName: string;
}

type Tab = 'swap' | 'collection';

export const HistoryPage: React.FC<HistoryPageProps> = ({ adminId, adminName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('swap');
  
  const [swapHistory, setSwapHistory] = useState<SwapHistoryRecord[]>([]);
  const [collectionHistory, setCollectionHistory] = useState<CollectionTransactionRecord[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Swap History
  useEffect(() => {
    const fetchSwap = async () => {
      if (activeTab !== 'swap') return;
      try {
        setLoading(true);
        setError(null);
        // Ensure we pass the ID in the format the query expects (number if it's digits)
        const numericId = parseInt(adminId, 10);
        const finalId = !isNaN(numericId) && numericId !== 0 ? numericId : adminId;
        
        const data = await getSwapHistory(finalId);
        setSwapHistory(data);
      } catch (err: any) {
        setError("Failed to load swap history.");
      } finally {
        setLoading(false);
      }
    };

    if (adminId) fetchSwap();
  }, [adminId, activeTab]);

  // Fetch Collection History
  useEffect(() => {
    const fetchCollection = async () => {
      if (activeTab !== 'collection') return;
      try {
        setLoading(true);
        setError(null);
        const data = await getCollectionHistory(adminName);
        setCollectionHistory(data);
      } catch (err: any) {
        setError("Failed to load collection history.");
      } finally {
        setLoading(false);
      }
    };

    if (adminName) fetchCollection();
  }, [adminName, activeTab]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
          <p className="text-gray-500">View records of your device swaps and collections.</p>
        </div>
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('swap')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'swap' 
                ? 'border-pink-500 text-pink-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Swap History
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'collection' 
                ? 'border-cyan-500 text-cyan-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Collection History
          </button>
        </nav>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className={`w-8 h-8 border-4 rounded-full animate-spin ${activeTab === 'swap' ? 'border-pink-200 border-t-pink-600' : 'border-cyan-200 border-t-cyan-600'}`}></span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            
            {/* SWAP TABLE */}
            {activeTab === 'swap' && (
              <>
                {swapHistory.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No swap records found.</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returned</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {swapHistory.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.Date).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record.Customer_Name}</div>
                            <div className="text-xs text-gray-400 font-mono">{record.Customer_ID}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 font-mono">
                                {record.Old_Device}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 font-mono">
                                {record.New_Device}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            {record.status === 'success' ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Success
                                </span>
                            ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 max-w-[200px] truncate" title={record.status}>
                                Failed
                                </span>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
              </>
            )}

            {/* COLLECTION TABLE */}
            {activeTab === 'collection' && (
              <>
                 {collectionHistory.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No collection records found.</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Router</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIM</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {collectionHistory.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.Date).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record["Full Name"]}</div>
                            <div className="text-xs text-gray-400 font-mono">{record["Customer ID"] || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {record.Barcode ? (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-100 text-pink-800 font-mono">
                                        {record.Barcode}
                                    </span>
                                ) : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {record.SIM ? (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-cyan-100 text-cyan-800 font-mono">
                                        {record.SIM}
                                    </span>
                                ) : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {record.Province}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};