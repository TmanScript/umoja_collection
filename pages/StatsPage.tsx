import React, { useEffect, useState } from "react";
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

  // --- COLLECTION DATA ---
  const processCollectionData = async () => {
    const records = await getAllCollectionHistory();
    setDebugMsg(`Loaded ${records.length} collection records.`);

    const statsMap = new Map<string, any>();

    records.forEach((record: any) => {
      const dateVal = record.Date || record.date || record.created_at;
      const provinceVal = record.Province || record.province;

      if (!dateVal) return;

      const date = new Date(String(dateVal).replace(" ", "T"));
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

      const entry = statsMap.get(key);
      const p = String(provinceVal || "").toLowerCase();

      if (p.includes("gauteng")) entry.Gauteng++;
      else if (p.includes("limpopo")) entry.Limpopo++;
      else entry.Other++;
    });

    const chartData = Array.from(statsMap.values()).sort(
      (a, b) => a.sortKey - b.sortKey,
    );

    setData(chartData);
  };

  // --- SALES DATA (FIXED) ---
  const processSalesData = async () => {
    const rawCustomers = await umojaService.getSalesData();

    const GAUTENG_IDS = [3, 5, 6, 7, 8, 9, 10];
    const LIMPOPO_IDS = [2, 11];

    const filtered = rawCustomers.filter((c: any) => {
      const pid = parseInt(c.partner_id, 10);
      const mrr = parseFloat(c.mrr_total);
      const dateStr = c.date_add;

      if (!dateStr) return false;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;

      const year = date.getFullYear();

      const isPartner3 = pid === 3;
      const isMrr399 = Math.abs(mrr - 399.0) < 0.01;
      const isValidYear = year === 2025 || year === 2026;

      return isPartner3 && isMrr399 && isValidYear;
    });

    setDebugMsg(
      `Loaded ${rawCustomers.length} raw, filtered to ${filtered.length}`,
    );

    const statsMap = new Map<string, any>();

    filtered.forEach((c: any) => {
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

      const entry = statsMap.get(key);
      const locId = parseInt(c.location_id, 10);

      if (GAUTENG_IDS.includes(locId)) entry.Gauteng++;
      else if (LIMPOPO_IDS.includes(locId)) entry.Limpopo++;
      else entry.Other++;
    });

    const chartData = Array.from(statsMap.values()).sort(
      (a, b) => a.sortKey - b.sortKey,
    );

    setData(chartData);
  };

  // --- TOTALS ---
  const totalGauteng = data.reduce((a, c) => a + c.Gauteng, 0);
  const totalLimpopo = data.reduce((a, c) => a + c.Limpopo, 0);
  const totalOther = data.reduce((a, c) => a + c.Other, 0);
  const totalAll = totalGauteng + totalLimpopo + totalOther;

  const maxValue =
    data.length > 0
      ? Math.max(...data.map((d) => d.Gauteng + d.Limpopo + d.Other))
      : 10;

  const chartMax = Math.ceil(maxValue * 1.2);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-gray-900">
          Operational Statistics
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-xl shadow-sm border inline-flex">
          <button
            onClick={() => setActiveTab("collection")}
            className={`px-6 py-2 rounded-lg ${
              activeTab === "collection" ? "bg-pink-50 text-pink-700" : ""
            }`}
          >
            Device Collections
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-6 py-2 rounded-lg ${
              activeTab === "sales" ? "bg-cyan-50 text-cyan-700" : ""
            }`}
          >
            Sales Growth
          </button>
        </div>
      </div>

      {/* CHART */}
      {data.length === 0 ? (
        <div className="text-center text-gray-400">No data</div>
      ) : (
        <div className="h-80 flex items-end justify-around bg-gray-50 border p-4">
          {data.map((item) => {
            const totalHeight = item.Gauteng + item.Limpopo + item.Other;

            const heightPct =
              chartMax > 0
                ? Math.max((totalHeight / chartMax) * 100, 2) // FIX: always visible
                : 2;

            const gpPct =
              totalHeight > 0 ? (item.Gauteng / totalHeight) * 100 : 0;
            const lpPct =
              totalHeight > 0 ? (item.Limpopo / totalHeight) * 100 : 0;
            const otherPct =
              totalHeight > 0 ? (item.Other / totalHeight) * 100 : 0;

            return (
              <div key={item.label} className="flex flex-col items-center">
                <div
                  className="w-10 flex flex-col-reverse overflow-hidden"
                  style={{ height: `${heightPct}%` }}
                >
                  <div
                    style={{ height: `${gpPct}%` }}
                    className="bg-pink-500"
                  />
                  <div
                    style={{ height: `${lpPct}%` }}
                    className="bg-cyan-500"
                  />
                  <div
                    style={{ height: `${otherPct}%` }}
                    className="bg-gray-400"
                  />
                </div>
                <div className="text-xs mt-2">{item.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* TOTALS */}
      <div className="grid grid-cols-4 gap-4">
        <div>GP: {totalGauteng}</div>
        <div>LP: {totalLimpopo}</div>
        <div>Other: {totalOther}</div>
        <div>Total: {totalAll}</div>
      </div>

      <div className="text-center text-xs text-gray-400">{debugMsg}</div>
    </div>
  );
};
