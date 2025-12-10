
import React, { useEffect, useState } from 'react';
import { getAllCollectionHistory } from '../services/supabaseClient';
import { umojaService } from '../services/umojaService';

type TabType = 'collection' | 'sales';

export const StatsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('collection');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>('Initializing...');

  useEffect(() => {
    // Reset state on tab change
    setData([]);
    setLoading(true);
    setError(null);
    setDebugMsg('Loading...');

    const fetchData = async () => {
      try {
        if (activeTab === 'collection') {
            await processCollectionData();
        } else {
            await processSalesData();
        }
      } catch (err: any) {
        console.error("Stats Error:", err);
        setError(`Failed to load ${activeTab} data.`);
        setDebugMsg(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // --- Collection Data Logic (Supabase) ---
  const processCollectionData = async () => {
    const records = await getAllCollectionHistory();
    setDebugMsg(`Loaded ${records.length} collection records.`);
    
    const statsMap = new Map<string, { label: string, Gauteng: number, Limpopo: number, Other: number, sortKey: number }>();

    records.forEach((record: any) => {
      const dateVal = record.Date || record.date || record.created_at;
      const provinceVal = record.Province || record.province;

      if (!dateVal) return;
      
      const cleanDateVal = String(dateVal).replace(' ', 'T');
      const date = new Date(cleanDateVal);
      if (isNaN(date.getTime())) return;

      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${monthName} ${year}`;
      const sortKey = year * 100 + date.getMonth();

      if (!statsMap.has(key)) {
        statsMap.set(key, { label: key, Gauteng: 0, Limpopo: 0, Other: 0, sortKey });
      }

      const entry = statsMap.get(key)!;
      const p = String(provinceVal || '').trim().toLowerCase();
      
      if (p.includes('gauteng')) entry.Gauteng++;
      else if (p.includes('limpopo')) entry.Limpopo++;
      else entry.Other++; // For collections, we mostly have GP/LP, but safe to have Other
    });

    const chartData = Array.from(statsMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    setData(chartData);
  };

  // --- Sales Data Logic (Umoja API) ---
  const processSalesData = async () => {
    const rawCustomers = await umojaService.getSalesData();
    
    // Requirements:
    // 1. partner_id = 3
    // 2. mrr_total = 399.0000
    // 3. date_add contains "2025"
    // 4. location_id mapping:
    //    Gauteng: 3, 5, 6, 7, 8, 9, 10
    //    Limpopo: 2, 11
    
    const GAUTENG_IDS = [3, 5, 6, 7, 8, 9, 10];
    const LIMPOPO_IDS = [2, 11];

    const filtered = rawCustomers.filter((c: any) => {
        const pid = parseInt(c.partner_id, 10);
        const mrr = parseFloat(c.mrr_total);
        const dateStr = c.date_add || '';
        
        // Exact match logic
        const isPartner3 = pid === 3;
        // Approximate float comparison for 399.0000
        const isMrr399 = Math.abs(mrr - 399.0) < 0.01;
        const isYear2025 = dateStr.includes('2025');

        return isPartner3 && isMrr399 && isYear2025;
    });

    setDebugMsg(`Loaded ${rawCustomers.length} raw, filtered to ${filtered.length} (2025, Partner 3, MRR 399).`);

    const statsMap = new Map<string, { label: string, Gauteng: number, Limpopo: number, Other: number, sortKey: number }>();

    filtered.forEach((c: any) => {
        if (!c.date_add) return;

        // date_add format: "2025-12-09"
        const date = new Date(c.date_add);
        if (isNaN(date.getTime())) return;

        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const key = `${monthName} ${year}`;
        const sortKey = year * 100 + date.getMonth();

        if (!statsMap.has(key)) {
            statsMap.set(key, { label: key, Gauteng: 0, Limpopo: 0, Other: 0, sortKey });
        }

        const entry = statsMap.get(key)!;
        
        // Use location_id for mapping
        const locId = parseInt(c.location_id, 10);

        if (GAUTENG_IDS.includes(locId)) {
            entry.Gauteng++;
        } else if (LIMPOPO_IDS.includes(locId)) {
            entry.Limpopo++;
        } else {
            entry.Other++;
        }
    });

    const chartData = Array.from(statsMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    setData(chartData);
  };

  // --- Render Helpers ---

  // Totals
  const totalGauteng = data.reduce((acc, curr) => acc + curr.Gauteng, 0);
  const totalLimpopo = data.reduce((acc, curr) => acc + curr.Limpopo, 0);
  const totalOther = data.reduce((acc, curr) => acc + curr.Other, 0);
  const totalAll = totalGauteng + totalLimpopo + totalOther;

  // Scaling
  const maxValue = data.length > 0 
    ? Math.max(...data.map(d => d.Gauteng + d.Limpopo + d.Other)) 
    : 10;
  
  // Chart Height Scaling (add 20% buffer)
  const chartMax = Math.ceil(maxValue * 1.2);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-gray-900">Operational Statistics</h2>
        <p className="text-gray-500">Real-time insights into field operations and sales.</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
            <button 
                onClick={() => setActiveTab('collection')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'collection' 
                    ? 'bg-pink-50 text-pink-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
            >
                Device Collections
            </button>
            <button 
                onClick={() => setActiveTab('sales')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'sales' 
                    ? 'bg-cyan-50 text-cyan-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
            >
                Sales Growth (2025)
            </button>
        </div>
      </div>

      {loading ? (
         <div className="flex flex-col items-center justify-center h-64">
           <div className={`w-10 h-10 border-4 rounded-full animate-spin mb-4 ${activeTab === 'collection' ? 'border-pink-200 border-t-pink-600' : 'border-cyan-200 border-t-cyan-600'}`}></div>
           <p className="text-gray-400 text-sm">Crunching numbers...</p>
         </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 max-w-2xl mx-auto mt-8 text-center">
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
            {/* CHART CONTAINER */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-gray-800">
                    {activeTab === 'collection' ? 'Collections per Month' : 'New Sales (2025 - Partner 3)'}
                </h3>
                <div className="flex gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-500 rounded"></div>
                    <span>Gauteng</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                    <span>Limpopo</span>
                    </div>
                    {totalOther > 0 && (
                        <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-400 rounded"></div>
                        <span>Other</span>
                        </div>
                    )}
                </div>
                </div>

                {data.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
                    <p>No matching data found.</p>
                </div>
                ) : (
                <div className="relative h-80 w-full border-b border-l border-gray-200 bg-gray-50/50">
                    {/* Horizontal Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 0.75, 0.5, 0.25, 0].map((tick) => (
                        <div key={tick} className="w-full border-t border-gray-200 relative h-0">
                        <span className="absolute -left-8 -top-2 text-xs text-gray-400 w-6 text-right">
                            {Math.round(chartMax * tick)}
                        </span>
                        </div>
                    ))}
                    </div>

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-around px-4 pt-4 pb-0">
                    {data.map((item) => {
                        // Calculate percentage heights relative to chartMax
                        const totalHeight = item.Gauteng + item.Limpopo + item.Other;
                        const heightPct = chartMax > 0 ? (totalHeight / chartMax) * 100 : 0;
                        
                        // Internal distribution
                        const gpPct = totalHeight > 0 ? (item.Gauteng / totalHeight) * 100 : 0;
                        const lpPct = totalHeight > 0 ? (item.Limpopo / totalHeight) * 100 : 0;
                        const otherPct = totalHeight > 0 ? (item.Other / totalHeight) * 100 : 0;

                        return (
                            <div key={item.label} className="flex flex-col items-center w-16 sm:w-24 h-full justify-end group relative z-10 hover:z-20">
                            
                            {/* Bar Wrapper */}
                            <div 
                                className="w-full max-w-[40px] sm:max-w-[50px] relative flex flex-col-reverse"
                                style={{ height: `${heightPct}%`, minHeight: '4px' }}
                            >
                                {/* Tooltip - Moved outside overflow-hidden container */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-gray-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl z-50">
                                    <div className="font-bold border-b border-gray-600 mb-1 pb-1 text-center">{item.label}</div>
                                    <div className="space-y-0.5">
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>GP</span>
                                            <span className="font-mono">{item.Gauteng}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>LP</span>
                                            <span className="font-mono">{item.Limpopo}</span>
                                        </div>
                                        {item.Other > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>Other</span>
                                                <span className="font-mono">{item.Other}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold text-gray-200">
                                            <span>Total</span>
                                            <span>{totalHeight}</span>
                                        </div>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                </div>

                                {/* The Bar Segments - This has the clipping */}
                                <div className="w-full h-full flex flex-col-reverse rounded-t-sm overflow-hidden shadow-sm hover:brightness-110 transition-all cursor-pointer">
                                     {item.Gauteng > 0 && (
                                        <div style={{ height: `${gpPct}%` }} className="bg-pink-500 w-full"></div>
                                    )}
                                    {item.Limpopo > 0 && (
                                        <div style={{ height: `${lpPct}%` }} className="bg-cyan-500 w-full"></div>
                                    )}
                                    {item.Other > 0 && (
                                        <div style={{ height: `${otherPct}%` }} className="bg-gray-400 w-full"></div>
                                    )}
                                </div>
                            </div>

                            {/* X-Axis Label */}
                            <div className="mt-2 text-xs font-medium text-gray-600 text-center leading-tight">
                                {item.label.split(' ')[0]}
                                <span className="block text-[10px] text-gray-400">{item.label.split(' ')[1]}</span>
                            </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
                <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">Gauteng</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{totalGauteng}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
                <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Limpopo</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{totalLimpopo}</p>
                </div>
                {totalOther > 0 && (
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Other</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{totalOther}</p>
                    </div>
                )}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{totalAll}</p>
                </div>
            </div>

            {/* Debug/Info Footer */}
            <div className="text-center">
                <p className="text-[10px] text-gray-400 font-mono bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
                    System Status: {debugMsg}
                </p>
            </div>
        </>
      )}
    </div>
  );
};
