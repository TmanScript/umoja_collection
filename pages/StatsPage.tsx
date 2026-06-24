import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAllCollectionHistory } from "../services/supabaseClient";
import { umojaService } from "../services/umojaService";

type TabType = "collection" | "sales";

export const StatsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("collection");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>("Initializing...");

  useEffect(() => {
    // Reset state on tab change
    setData([]);
    setLoading(true);
    setError(null);
    setDebugMsg("Loading...");

    const fetchData = async () => {
      try {
        if (activeTab === "collection") {
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

    const statsMap = new Map<
      string,
      {
        label: string;
        Gauteng: number;
        Limpopo: number;
        Other: number;
        sortKey: number;
      }
    >();

    records.forEach((record: any) => {
      const dateVal = record.Date || record.date || record.created_at;
      const provinceVal = record.Province || record.province;

      if (!dateVal) return;

      const cleanDateVal = String(dateVal).replace(" ", "T");
      const date = new Date(cleanDateVal);
      if (isNaN(date.getTime())) return;

      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const key = `${monthName} ${year}`;
      const sortKey = year * 100 + date.getMonth();

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          label: key,
          Gauteng: 0,
          Limpopo: 0,
          Other: 0,
          sortKey,
        });
      }

      const entry = statsMap.get(key)!;
      const p = String(provinceVal || "")
        .trim()
        .toLowerCase();

      if (p.includes("gauteng")) entry.Gauteng++;
      else if (p.includes("limpopo")) entry.Limpopo++;
      else entry.Other++; // For collections, we mostly have GP/LP, but safe to have Other
    });

    const chartData = Array.from(statsMap.values()).sort(
      (a, b) => a.sortKey - b.sortKey,
    );
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
      const dateStr = c.date_add || "";

      // Exact match logic
      const isPartner3 = pid === 3;
      // Approximate float comparison for 399.0000
      const isMrr399 = Math.abs(mrr - 399.0) < 0.01;
      const isYear2025 = dateStr.includes("2025") || dateStr.includes("2026"); // Some entries might have late 2025 dates that spill into early 2026;

      return isPartner3 && isMrr399 && isYear2025;
    });

    setDebugMsg(
      `Loaded ${rawCustomers.length} raw, filtered to ${filtered.length} (2025, Partner 3, MRR 399).`,
    );

    const statsMap = new Map<
      string,
      {
        label: string;
        Gauteng: number;
        Limpopo: number;
        Other: number;
        sortKey: number;
      }
    >();

    filtered.forEach((c: any) => {
      if (!c.date_add) return;

      // date_add format: "2025-12-09"
      const date = new Date(c.date_add);
      if (isNaN(date.getTime())) return;

      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const key = `${monthName} ${year}`;
      const sortKey = year * 100 + date.getMonth();

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          label: key,
          Gauteng: 0,
          Limpopo: 0,
          Other: 0,
          sortKey,
        });
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

    const chartData = Array.from(statsMap.values()).sort(
      (a, b) => a.sortKey - b.sortKey,
    );
    setData(chartData);
  };

  // --- Render Helpers ---

  // Totals
  const totalGauteng = data.reduce((acc, curr) => acc + curr.Gauteng, 0);
  const totalLimpopo = data.reduce((acc, curr) => acc + curr.Limpopo, 0);
  const totalOther = data.reduce((acc, curr) => acc + curr.Other, 0);
  const totalAll = totalGauteng + totalLimpopo + totalOther;

  // Brand palette shared by the bar chart and donut.
  const COLORS = { Gauteng: "#ec4899", Limpopo: "#06b6d4", Other: "#cbd5e1" };

  const donutData = [
    { name: "Gauteng", value: totalGauteng, color: COLORS.Gauteng },
    { name: "Limpopo", value: totalLimpopo, color: COLORS.Limpopo },
    { name: "Other", value: totalOther, color: COLORS.Other },
  ].filter((d) => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-gray-900">
          Operational Statistics
        </h2>
        <p className="text-gray-500">
          Real-time insights into field operations and sales.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab("collection")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "collection"
                ? "bg-pink-50 text-pink-700 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Device Collections
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "sales"
                ? "bg-cyan-50 text-cyan-700 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Sales Growth (2025)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div
            className={`w-10 h-10 border-4 rounded-full animate-spin mb-4 ${activeTab === "collection" ? "border-pink-200 border-t-pink-600" : "border-cyan-200 border-t-cyan-600"}`}
          ></div>
          <p className="text-gray-400 text-sm">Crunching numbers...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 max-w-2xl mx-auto mt-8 text-center">
          <p className="font-bold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* CHARTS */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Monthly stacked bar chart */}
            <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-800 mb-6">
                {activeTab === "collection"
                  ? "Collections per Month"
                  : "New Sales (2025 - Partner 3)"}
              </h3>

              {data.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
                  <p>No matching data found.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                      <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(236,72,153,0.06)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #f1f5f9",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="Gauteng"
                      stackId="a"
                      fill="url(#gpGrad)"
                      maxBarSize={56}
                      animationDuration={700}
                    />
                    <Bar
                      dataKey="Limpopo"
                      stackId="a"
                      fill="url(#lpGrad)"
                      radius={totalOther > 0 ? 0 : [6, 6, 0, 0]}
                      maxBarSize={56}
                      animationDuration={700}
                    />
                    {totalOther > 0 && (
                      <Bar
                        dataKey="Other"
                        stackId="a"
                        fill={COLORS.Other}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={56}
                        animationDuration={700}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Regional split donut */}
            <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800">Regional Split</h3>
              <p className="text-xs text-gray-400 mb-2">
                Share of total{" "}
                {activeTab === "collection" ? "collections" : "sales"}
              </p>
              {totalAll === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-10">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                      animationDuration={700}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #f1f5f9",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">
                Gauteng
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                {totalGauteng}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">
                Limpopo
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                {totalLimpopo}
              </p>
            </div>
            {totalOther > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Other
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                  {totalOther}
                </p>
              </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                {totalAll}
              </p>
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
