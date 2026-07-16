// @ts-check

export const PROVINCES = ["Gauteng", "Limpopo", "Other"];

const LIMPOPO_AGENTS = new Set(["neo", "ngoako david railo"]);
const GAUTENG_LOCATION_IDS = new Set([3, 5, 6, 7, 8, 9, 10]);
const LIMPOPO_LOCATION_IDS = new Set([2, 11]);

/**
 * @param {unknown} value
 * @returns {"Gauteng" | "Limpopo" | "Other"}
 */
export const normalizeProvince = (value) => {
  const province = String(value ?? "").trim().toLowerCase();

  if (province.includes("gauteng")) return "Gauteng";
  if (province.includes("limpopo")) return "Limpopo";
  return "Other";
};

/**
 * Operational reporting only uses the active field provinces.
 *
 * @param {unknown} value
 * @returns {"Gauteng" | "Limpopo"}
 */
export const normalizeOperationalProvince = (value) => {
  const province = normalizeProvince(value);
  return province === "Limpopo" ? "Limpopo" : "Gauteng";
};

/**
 * @param {unknown} value
 * @returns {"Gauteng" | "Limpopo" | null}
 */
export const normalizeOperationalDrilldownProvince = (value) => {
  const province = normalizeProvince(value);
  return province === "Gauteng" || province === "Limpopo" ? province : null;
};

/**
 * @param {unknown} value
 * @returns {"swap" | "collection" | null}
 */
export const normalizeOperationalTransactionType = (value) => {
  const transactionType = String(value ?? "").trim().toLowerCase();
  return transactionType === "swap" || transactionType === "collection"
    ? transactionType
    : null;
};

/**
 * @param {unknown} transactionType
 * @param {unknown} sortKey
 * @param {unknown} province
 * @returns {{ transactionType: "swap" | "collection", sortKey: number, province: "Gauteng" | "Limpopo" } | null}
 */
export const buildOperationalDrilldownRequest = (transactionType, sortKey, province) => {
  const normalizedType = normalizeOperationalTransactionType(transactionType);
  const normalizedProvince = normalizeOperationalDrilldownProvince(province);
  const normalizedSortKey = Number(sortKey);

  if (!normalizedType || !normalizedProvince || !Number.isInteger(normalizedSortKey)) {
    return null;
  }

  const year = Math.floor(normalizedSortKey / 100);
  const monthIndex = normalizedSortKey % 100;
  if (year < 2000 || year > 2100 || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  return {
    transactionType: normalizedType,
    sortKey: normalizedSortKey,
    province: normalizedProvince,
  };
};

/**
 * @param {unknown} agentName
 * @returns {"Gauteng" | "Limpopo"}
 */
export const provinceForAgent = (agentName) => {
  const normalized = String(agentName ?? "").trim().toLowerCase();
  return LIMPOPO_AGENTS.has(normalized) ? "Limpopo" : "Gauteng";
};

/**
 * @param {unknown} locationId
 * @returns {"Gauteng" | "Limpopo" | "Other"}
 */
export const provinceForLocationId = (locationId) => {
  const numericId = Number.parseInt(String(locationId ?? ""), 10);

  if (GAUTENG_LOCATION_IDS.has(numericId)) return "Gauteng";
  if (LIMPOPO_LOCATION_IDS.has(numericId)) return "Limpopo";
  return "Other";
};

/**
 * @param {unknown} value
 * @returns {{ date: Date, label: string, sortKey: number } | null}
 */
export const parseMonthBucket = (value) => {
  if (!value) return null;

  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;

  const monthName = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return {
    date,
    label: `${monthName} ${year}`,
    sortKey: year * 100 + date.getMonth(),
  };
};

/**
 * @typedef {{ label: string, Gauteng: number, Limpopo: number, Other: number, sortKey: number }} MonthlyProvinceDatum
 */

/**
 * @typedef {{ transaction_type?: unknown, month_label?: unknown, sort_key?: unknown, province?: unknown, total?: unknown }} OperationalMonthlyStatsRow
 */

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {{ date: (record: Record<string, unknown>) => unknown, province: (record: Record<string, unknown>) => unknown, include?: (record: Record<string, unknown>) => boolean }} options
 * @returns {MonthlyProvinceDatum[]}
 */
export const buildMonthlyProvinceData = (records, options) => {
  const statsMap = new Map();

  for (const record of records) {
    if (options.include && !options.include(record)) continue;

    const bucket = parseMonthBucket(options.date(record));
    if (!bucket) continue;

    if (!statsMap.has(bucket.label)) {
      statsMap.set(bucket.label, {
        label: bucket.label,
        Gauteng: 0,
        Limpopo: 0,
        Other: 0,
        sortKey: bucket.sortKey,
      });
    }

    const province = normalizeProvince(options.province(record));
    const entry = statsMap.get(bucket.label);
    entry[province] += 1;
  }

  return Array.from(statsMap.values()).sort((a, b) => a.sortKey - b.sortKey);
};

/**
 * @param {Array<Record<string, unknown>>} swapRecords
 * @returns {MonthlyProvinceDatum[]}
 */
export const buildSuccessfulSwapMonthlyProvinceData = (swapRecords) =>
  buildMonthlyProvinceData(swapRecords, {
    date: (record) => record.Date || record.date || record.created_at,
    province: (record) =>
      record.Province ||
      record.province ||
      provinceForAgent(record.Admin_Name || record.admin_name),
    include: (record) => String(record.status ?? "").trim().toLowerCase() === "success",
  });

/**
 * @param {Array<Record<string, unknown>>} collectionRecords
 * @returns {MonthlyProvinceDatum[]}
 */
export const buildCollectionMonthlyProvinceData = (collectionRecords) =>
  buildMonthlyProvinceData(collectionRecords, {
    date: (record) => record.Date || record.date || record.created_at,
    province: (record) => record.Province || record.province,
  });

/**
 * @param {MonthlyProvinceDatum[]} data
 * @returns {{ Gauteng: number, Limpopo: number, Other: number, Total: number }}
 */
export const summarizeMonthlyProvinceData = (data) => {
  const totals = data.reduce(
    (acc, item) => ({
      Gauteng: acc.Gauteng + item.Gauteng,
      Limpopo: acc.Limpopo + item.Limpopo,
      Other: acc.Other + item.Other,
      Total: acc.Total + item.Gauteng + item.Limpopo + item.Other,
    }),
    { Gauteng: 0, Limpopo: 0, Other: 0, Total: 0 },
  );

  return totals;
};

/**
 * @param {OperationalMonthlyStatsRow[]} rows
 * @param {unknown} transactionType
 * @returns {MonthlyProvinceDatum[]}
 */
export const buildMonthlyProvinceDataFromAggregateRows = (rows, transactionType) => {
  const targetType = String(transactionType ?? "").trim().toLowerCase();
  const statsMap = new Map();

  for (const row of rows) {
    if (String(row.transaction_type ?? "").trim().toLowerCase() !== targetType) continue;

    const label = String(row.month_label ?? "").trim();
    const sortKey = Number.parseInt(String(row.sort_key ?? ""), 10);
    const total = Number.parseInt(String(row.total ?? ""), 10);
    if (!label || Number.isNaN(sortKey) || Number.isNaN(total) || total < 0) continue;

    if (!statsMap.has(label)) {
      statsMap.set(label, {
        label,
        Gauteng: 0,
        Limpopo: 0,
        Other: 0,
        sortKey,
      });
    }

    const province = normalizeOperationalProvince(row.province);
    const entry = statsMap.get(label);
    entry[province] += total;
  }

  return Array.from(statsMap.values()).sort((a, b) => a.sortKey - b.sortKey);
};
