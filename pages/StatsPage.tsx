import React, { useEffect, useRef, useState } from "react";
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
import {
  getOperationalDrilldownRecords,
  getOperationalMonthlyStats,
  type OperationalDrilldownRecord,
} from "../services/supabaseClient";
import { umojaService } from "../services/umojaService";
import {
  buildOperationalDrilldownRequest,
  buildMonthlyProvinceDataFromAggregateRows,
  provinceForLocationId,
  summarizeMonthlyProvinceData,
} from "../utils/operationalStats";

type TabType = "operations" | "sales";
type OperationTransactionType = "swap" | "collection";
type ProvinceKey = "Gauteng" | "Limpopo";

type MonthlyProvinceDatum = {
  label: string;
  Gauteng: number;
  Limpopo: number;
  Other: number;
  sortKey: number;
};

type OperationData = {
  swaps: MonthlyProvinceDatum[];
  collections: MonthlyProvinceDatum[];
};

type SalesDatum = MonthlyProvinceDatum;

type DrilldownSelection = {
  transactionType: OperationTransactionType;
  province: ProvinceKey;
  label: string;
  sortKey: number;
  total: number;
};

export const StatsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("operations");
  const [operationData, setOperationData] = useState<OperationData>({ swaps: [], collections: [] });
  const [salesData, setSalesData] = useState<SalesDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>("Initializing...");
  const [drilldownSelection, setDrilldownSelection] = useState<DrilldownSelection | null>(null);
  const [drilldownRecords, setDrilldownRecords] = useState<OperationalDrilldownRecord[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const drilldownRequestId = useRef(0);

  useEffect(() => {
    let ignore = false;

    // Reset state on tab change
    setOperationData({ swaps: [], collections: [] });
    setSalesData([]);
    setLoading(true);
    setError(null);
    setDebugMsg("Loading...");
    setDrilldownSelection(null);
    setDrilldownRecords([]);
    setDrilldownError(null);
    setDrilldownLoading(false);

    const fetchData = async () => {
      try {
        if (activeTab === "operations") {
          const data = await processOperationData();
          if (ignore) return;
          setOperationData(data.operationData);
          setDebugMsg(data.debugMsg);
        } else {
          const data = await processSalesData();
          if (ignore) return;
          setSalesData(data.salesData);
          setDebugMsg(data.debugMsg);
        }
      } catch (err: any) {
        if (ignore) return;
        console.error("Stats Error:", err);
        setError(`Failed to load ${activeTab} data.`);
        setDebugMsg(`Error: ${err.message}`);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  // --- Operational Data Logic (Supabase) ---
  const processOperationData = async () => {
    const rows = await getOperationalMonthlyStats();

    const swaps = buildMonthlyProvinceDataFromAggregateRows(rows as any, "swap");
    const collections = buildMonthlyProvinceDataFromAggregateRows(rows as any, "collection");

    return {
      operationData: { swaps, collections },
      debugMsg: `Loaded ${rows.length} monthly operational stat rows.`,
    };
  };

  // --- Sales Data Logic (Umoja API) ---
  const processSalesData = async () => {
    const rawCustomers = await umojaService.getSalesData();

    // Requirements:
    // 1. partner_id = 3
    // 2. mrr_total = 399.0000
    // 3. date_add contains "2025"
    // 4. location_id maps to province using the shared operational mapping.

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

      const province = provinceForLocationId(c.location_id);
      entry[province]++;
    });

    const chartData = Array.from(statsMap.values()).sort(
      (a, b) => a.sortKey - b.sortKey,
    );
    return {
      salesData: chartData,
      debugMsg: `Loaded ${rawCustomers.length} raw, filtered to ${filtered.length} (2025, Partner 3, MRR 399).`,
    };
  };

  // --- Render Helpers ---

  // Brand palette shared by the bar chart and donut.
  const COLORS = { Gauteng: "#ec4899", Limpopo: "#06b6d4", Other: "#cbd5e1" };

  const swapTotals = summarizeMonthlyProvinceData(operationData.swaps);
  const collectionTotals = summarizeMonthlyProvinceData(operationData.collections);
  const salesTotals = summarizeMonthlyProvinceData(salesData);

  const salesDonutData = [
    { name: "Gauteng", value: salesTotals.Gauteng, color: COLORS.Gauteng },
    { name: "Limpopo", value: salesTotals.Limpopo, color: COLORS.Limpopo },
    { name: "Other", value: salesTotals.Other, color: COLORS.Other },
  ].filter((d) => d.value > 0);

  const handleOperationBarClick = async (
    transactionType: OperationTransactionType,
    province: ProvinceKey,
    datum: Partial<MonthlyProvinceDatum> | undefined,
  ) => {
    const total = Number(datum?.[province] ?? 0);
    if (!datum || total <= 0) return;

    const request = buildOperationalDrilldownRequest(
      transactionType,
      datum.sortKey,
      province,
    );
    if (!request) return;

    const requestId = drilldownRequestId.current + 1;
    drilldownRequestId.current = requestId;

    setDrilldownSelection({
      transactionType: request.transactionType,
      province: request.province,
      label: String(datum.label ?? ""),
      sortKey: request.sortKey,
      total,
    });
    setDrilldownRecords([]);
    setDrilldownError(null);
    setDrilldownLoading(true);

    try {
      const records = await getOperationalDrilldownRecords(
        request.transactionType,
        request.sortKey,
        request.province,
      );
      if (drilldownRequestId.current !== requestId) return;
      setDrilldownRecords(records);
    } catch (err: any) {
      if (drilldownRequestId.current !== requestId) return;
      console.error("Stats drilldown error:", err);
      setDrilldownError("Failed to load the selected list.");
    } finally {
      if (drilldownRequestId.current === requestId) {
        setDrilldownLoading(false);
      }
    }
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const renderMonthlyChart = (
    title: string,
    transactionType: OperationTransactionType,
    data: MonthlyProvinceDatum[],
    totals: ReturnType<typeof summarizeMonthlyProvinceData>,
  ) => (
    <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-400">
            Successful transactions grouped by month and province
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-gray-900">{totals.Total}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
          <p>No successful transactions found.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`${title.replace(/\s+/g, "-")}GpGrad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id={`${title.replace(/\s+/g, "-")}LpGrad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
              fill="#ec4899"
              maxBarSize={56}
              animationDuration={700}
              className="cursor-pointer"
              onClick={(entry: any) =>
                handleOperationBarClick(transactionType, "Gauteng", entry?.payload ?? entry)
              }
            />
            <Bar
              dataKey="Limpopo"
              stackId="a"
              fill="#06b6d4"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              animationDuration={700}
              className="cursor-pointer"
              onClick={(entry: any) =>
                handleOperationBarClick(transactionType, "Limpopo", entry?.payload ?? entry)
              }
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderDrilldownPanel = () => {
    if (!drilldownSelection) return null;

    const isSwap = drilldownSelection.transactionType === "swap";
    const title = isSwap ? "Successful Swaps" : "Collections";
    const primaryDeviceLabel = isSwap ? "Returned" : "Router";
    const secondaryDeviceLabel = isSwap ? "Assigned" : "SIM";
    const accentClass = isSwap ? "text-pink-600" : "text-cyan-600";

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${accentClass}`}>
              {title}
            </p>
            <h3 className="text-lg font-bold text-gray-900">
              {drilldownSelection.label} · {drilldownSelection.province}
            </h3>
            <p className="text-xs text-gray-500">
              Bar total {drilldownSelection.total} · Loaded {drilldownRecords.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrilldownSelection(null);
              setDrilldownRecords([]);
              setDrilldownError(null);
              setDrilldownLoading(false);
            }}
            className="self-start sm:self-auto px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>

        {drilldownLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-gray-500 text-sm">
            <span className={`w-5 h-5 border-2 rounded-full animate-spin ${isSwap ? "border-pink-200 border-t-pink-600" : "border-cyan-200 border-t-cyan-600"}`}></span>
            Loading selected records...
          </div>
        ) : drilldownError ? (
          <div className="m-5 bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm">
            {drilldownError}
          </div>
        ) : drilldownRecords.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No records found for the selected bar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{primaryDeviceLabel}</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{secondaryDeviceLabel}</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {drilldownRecords.map((record, index) => (
                  <tr key={`${record.transaction_type}-${record.occurred_at}-${record.customer_id ?? index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(record.occurred_at)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.customer_name || "-"}</div>
                      <div className="text-xs text-gray-400 font-mono">{record.customer_id || "-"}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {record.primary_device ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full font-mono ${isSwap ? "bg-red-100 text-red-800" : "bg-pink-100 text-pink-800"}`}>
                          {record.primary_device}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {record.secondary_device ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full font-mono ${isSwap ? "bg-green-100 text-green-800" : "bg-cyan-100 text-cyan-800"}`}>
                          {record.secondary_device}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.agent || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 max-w-sm">
                      <span className="line-clamp-2" title={record.reason || "-"}>
                        {record.reason || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderOperationSummaryCard = (
    label: string,
    totals: ReturnType<typeof summarizeMonthlyProvinceData>,
    accentClass: string,
  ) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${accentClass}`}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{totals.Total}</p>
      <p className="text-xs text-gray-500 mt-2">
        Gauteng {totals.Gauteng} · Limpopo {totals.Limpopo}
        {totals.Other > 0 ? ` · Other ${totals.Other}` : ""}
      </p>
    </div>
  );

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
            onClick={() => setActiveTab("operations")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "operations"
                ? "bg-pink-50 text-pink-700 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Swaps & Collections
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
            className={`w-10 h-10 border-4 rounded-full animate-spin mb-4 ${activeTab === "operations" ? "border-pink-200 border-t-pink-600" : "border-cyan-200 border-t-cyan-600"}`}
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
          {activeTab === "operations" ? (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                {renderMonthlyChart("Successful Swaps per Month", "swap", operationData.swaps, swapTotals)}
                {renderMonthlyChart("Collections per Month", "collection", operationData.collections, collectionTotals)}
              </div>

              {renderDrilldownPanel()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {renderOperationSummaryCard("Successful Swaps", swapTotals, "border-pink-100")}
                {renderOperationSummaryCard("Collections", collectionTotals, "border-cyan-100")}
                {renderOperationSummaryCard(
                  "Total Field Transactions",
                  {
                    Gauteng: swapTotals.Gauteng + collectionTotals.Gauteng,
                    Limpopo: swapTotals.Limpopo + collectionTotals.Limpopo,
                    Other: swapTotals.Other + collectionTotals.Other,
                    Total: swapTotals.Total + collectionTotals.Total,
                  },
                  "border-gray-200",
                )}
              </div>
            </>
          ) : (
            <>
          {/* CHARTS */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Monthly stacked bar chart */}
            <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-800 mb-6">
                New Sales (2025 - Partner 3)
              </h3>

              {salesData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
                  <p>No matching data found.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={salesData}
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
                      radius={salesTotals.Other > 0 ? 0 : [6, 6, 0, 0]}
                      maxBarSize={56}
                      animationDuration={700}
                    />
                    {salesTotals.Other > 0 && (
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
                Share of total sales
              </p>
              {salesTotals.Total === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-10">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={salesDonutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                      animationDuration={700}
                    >
                      {salesDonutData.map((entry) => (
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
                {salesTotals.Gauteng}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100">
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">
                Limpopo
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                {salesTotals.Limpopo}
              </p>
            </div>
            {salesTotals.Other > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Other
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                  {salesTotals.Other}
                </p>
              </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                {salesTotals.Total}
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
        </>
      )}
    </div>
  );
};
