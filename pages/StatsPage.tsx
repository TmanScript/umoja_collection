
import React, { useEffect, useState } from 'react';
import { getAllCollectionHistory } from '../services/supabaseClient';

export const StatsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>('Initializing...');

  useEffect(() => {
    const processData = async () => {
      try {
        setLoading(true);
        const records = await getAllCollectionHistory();
        setDebugMsg(`Loaded ${records.length} records.`);
        
        console.log("Raw Records:", records);

        // Map for aggregation: "Month Year" -> Counts
        const statsMap = new Map<string, { label: string, Gauteng: number, Limpopo: number, sortKey: number }>();

        records.forEach((record: any) => {
          // Handle Case Sensitivity from DB
          const dateVal = record.Date || record.date || record.created_at;
          const provinceVal = record.Province || record.province;

          if (!dateVal) return;

          // Normalize Date: "2025-12-05 06:57..." -> "2025-12-05T06:57..."
          // Fixes parsing issues on some browsers if DB sends SQL format
          const cleanDateVal = String(dateVal).replace(' ', 'T');
          const date = new Date(cleanDateVal);

          if (isNaN(date.getTime())) return;

          // Grouping Key
          const monthName = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear();
          const key = `${monthName} ${year}`;
          const sortKey = year * 100 + date.getMonth();

          if (!statsMap.has(key)) {
            statsMap.set(key, { label: key, Gauteng: 0, Limpopo: 0, sortKey });
          }

          const entry = statsMap.get(key)!;

          // Normalize Province
          const p = String(provinceVal || '').trim().toLowerCase();
          if (p.includes('gauteng')) {
            entry.Gauteng += 1;
          } else if (p.includes('limpopo')) {
            entry.Limpopo += 1;
          } else {
            // Default to Gauteng if unknown/empty as per business logic fallback
            entry.Gauteng += 1;
          }
        });

        // Convert to sorted array
        const chartData = Array.from(statsMap.values()).sort((a, b) => a.sortKey - b.sortKey);
        
        console.log("Chart Data:", chartData);
        setData(chartData);
      } catch (err: any) {
        console.error("Stats Error:", err);
        setError("Failed to load data.");
        setDebugMsg(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    processData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 max-w-2xl mx-auto mt-8">
        {error}
      </div>
    );
  }

  // Totals
  const totalGauteng = data.reduce((acc, curr) => acc + curr.Gauteng, 0);
  const totalLimpopo = data.reduce((acc, curr) => acc + curr.Limpopo, 0);
  const totalAll = totalGauteng + totalLimpopo;

  // Scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.Gauteng, d.Limpopo)), 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Collection Statistics</h2>
        <p className="text-gray-500">Monthly breakdown by province</p>
        <p className="text-xs text-gray-400 mt-2 font-mono bg-gray-100 inline-block px-2 py-1 rounded">{debugMsg}</p>
      </div>

      {/* CHART CONTAINER */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold text-gray-800">Collections per Month</h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-500 rounded"></div>
              <span>Gauteng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-500 rounded"></div>
              <span>Limpopo</span>
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
            <p>No data found.</p>
          </div>
        ) : (
          <div className="relative h-80 w-full border-b border-l border-gray-200 bg-gray-50/50">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[1, 0.75, 0.5, 0.25, 0].map((tick) => (
                <div key={tick} className="w-full border-t border-gray-200 relative h-0">
                  <span className="absolute -left-8 -top-2 text-xs text-gray-400 w-6 text-right">
                    {Math.round(maxValue * tick)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="absolute inset-0 flex items-end justify-around px-4 pt-4 pb-0">
              {data.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 w-24 h-full justify-end group">
                  
                  {/* The Bars Wrapper */}
                  <div className="flex gap-1 w-full justify-center items-end h-full">
                    
                    {/* Gauteng Bar */}
                    <div 
                      className="w-1/2 bg-pink-500 rounded-t shadow-sm transition-all duration-500 relative hover:bg-pink-400"
                      style={{ height: `${(item.Gauteng / maxValue) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        GP: {item.Gauteng}
                      </div>
                    </div>

                    {/* Limpopo Bar */}
                    <div 
                      className="w-1/2 bg-cyan-500 rounded-t shadow-sm transition-all duration-500 relative hover:bg-cyan-400"
                      style={{ height: `${(item.Limpopo / maxValue) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        LP: {item.Limpopo}
                      </div>
                    </div>

                  </div>

                  {/* X-Axis Label */}
                  <div className="mt-2 text-xs font-medium text-gray-600 text-center leading-tight">
                    {item.label.split(' ')[0]}
                    <span className="block text-[10px] text-gray-400">{item.label.split(' ')[1]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
          <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">Total Gauteng</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalGauteng}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
          <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Total Limpopo</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalLimpopo}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Grand Total</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalAll}</p>
        </div>
      </div>
    </div>
  );
};
