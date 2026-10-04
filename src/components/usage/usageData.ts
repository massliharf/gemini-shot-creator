import { format, startOfDay } from "date-fns";
import { sampleUsage, sampleUsageByModel, type UsagePoint } from "@/data/mock";

/* --------------------------------------------------------------------------
 * Shapes shared by the Usage page for real and sample data
 * ------------------------------------------------------------------------ */
export type UsageRangeKey = "today" | "7d" | "30d" | "all";

export interface UsageTotals {
  cost: number;
  tokens: number;
  images: number;
  calls: number;
}

export interface UsageSeriesPoint {
  /** Bucket key (YYYY-MM-DD or hour). */
  key: string;
  /** Axis label. */
  label: string;
  /** Long label for the tooltip / table. */
  fullLabel: string;
  cost: number;
  images: number;
}

export interface UsageModelRow {
  model: string;
  calls: number;
  tokens: number;
  images: number;
  cost: number;
}

/** Same shape as a `gemini_usage_logs` row. */
export interface UsageLogRow {
  id: string;
  function_name: string;
  model: string;
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  image_count: number;
  resolution: string | null;
  estimated_cost_usd: number;
  status: string;
  created_at: string;
}

export type UsageGranularity = "hour" | "day";

export interface UsageView {
  totals: UsageTotals;
  /** Totals for the previous period of equal length, when known. */
  previous: UsageTotals | null;
  /** e.g. "vs previous 7 days". */
  previousLabel: string;
  granularity: UsageGranularity;
  series: UsageSeriesPoint[];
  byModel: UsageModelRow[];
  recent: UsageLogRow[];
}

export const EMPTY_TOTALS: UsageTotals = { cost: 0, tokens: 0, images: 0, calls: 0 };

export const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n > 0 && n < 1 ? 4 : 2 }).format(n);

/** Aggregates (totals, model rows): two decimals unless the amount is below a cent. */
export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n > 0 && n < 0.01 ? 4 : 2,
    maximumFractionDigits: n > 0 && n < 0.01 ? 4 : 2,
  }).format(n);

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: n >= 100_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

/* --------------------------------------------------------------------------
 * Bucketing helpers (used for real logs too)
 * ------------------------------------------------------------------------ */
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

const dayPoint = (d: Date, cost = 0, images = 0): UsageSeriesPoint => ({
  key: dayKey(d),
  label: format(d, "MMM d"),
  // All time can span years; name the year for days outside the current one.
  fullLabel: format(d, d.getFullYear() === new Date().getFullYear() ? "EEE, MMM d" : "EEE, MMM d, yyyy"),
  cost,
  images,
});

const hourPoint = (h: number, cost = 0, images = 0): UsageSeriesPoint => ({
  key: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
  fullLabel: `Today, ${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`,
  cost,
  images,
});

/** Calendar days before today that each bounded range also covers. */
const PAST_DAYS: Record<Exclude<UsageRangeKey, "all">, number> = { today: 0, "7d": 6, "30d": 29 };

/**
 * Local midnight at the start of a range (null for all time): today, or the last
 * 7 / 30 calendar days including today. The Usage page fetches from here and
 * `bucketLogs` charts from here, so the chart covers exactly the fetched logs.
 */
export const usageRangeStart = (range: UsageRangeKey, now = new Date()): Date | null =>
  range === "all" ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() - PAST_DAYS[range]);

/** Buckets real logs into hours (today) or days, filling empty buckets with zero. */
export const bucketLogs = (logs: UsageLogRow[], range: UsageRangeKey): { granularity: UsageGranularity; series: UsageSeriesPoint[] } => {
  const now = new Date();
  if (range === "today") {
    const series = Array.from({ length: now.getHours() + 1 }, (_, h) => hourPoint(h));
    logs.forEach((l) => {
      const d = new Date(l.created_at);
      const p = series[d.getHours()];
      if (p && dayKey(d) === dayKey(now)) {
        p.cost += Number(l.estimated_cost_usd);
        p.images += l.image_count;
      }
    });
    return { granularity: "hour", series };
  }

  // Same window as the fetch; all time starts at the oldest fetched log (no cap).
  const start =
    usageRangeStart(range, now) ??
    startOfDay(logs.reduce((min, l) => Math.min(min, new Date(l.created_at).getTime()), now.getTime()));

  // Step by calendar day, not a fixed 24h, so every bucket stays on local midnight across DST changes.
  const dayAt = (i: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  const series: UsageSeriesPoint[] = [];
  const index = new Map<string, UsageSeriesPoint>();
  for (let i = 0, d = dayAt(0); d <= now; d = dayAt(++i)) {
    const p = dayPoint(d);
    series.push(p);
    index.set(p.key, p);
  }
  logs.forEach((l) => {
    const p = index.get(dayKey(new Date(l.created_at)));
    if (p) {
      p.cost += Number(l.estimated_cost_usd);
      p.images += l.image_count;
    }
  });
  return { granularity: "day", series };
};

/* --------------------------------------------------------------------------
 * Sample view — built from `sampleUsage` (30 days) for the selected range
 * ------------------------------------------------------------------------ */
const callsFor = (images: number) => Math.max(1, Math.round(images / 1.6));

const sum = (points: UsagePoint[]): UsageTotals =>
  points.reduce(
    (t, p) => ({ cost: t.cost + p.cost, tokens: t.tokens + p.tokens, images: t.images + p.images, calls: t.calls + callsFor(p.images) }),
    { ...EMPTY_TOTALS },
  );

const toDate = (iso: string) => new Date(`${iso}T12:00:00`);

/** Today's sample usage spread over the hours so far (studio hours weighted). */
const hourlyToday = (today: UsagePoint): UsageSeriesPoint[] => {
  const nowHour = new Date().getHours();
  const weight = (h: number) => (h >= 8 && h <= 22 ? Math.sin((Math.PI * (h - 7)) / 16) + (h % 3) * 0.12 : 0);
  let weights = Array.from({ length: nowHour + 1 }, (_, h) => weight(h));
  let total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) {
    weights = weights.map(() => 1);
    total = weights.length;
  }
  return weights.map((w, h) => hourPoint(h, (today.cost * w) / total, Math.round((today.images * w) / total)));
};

const SAMPLE_FUNCTIONS = [
  { fn: "generate-text-image", model: "gemini-3-pro-image-preview", res: "2K", images: 1, inTok: 1_284, outTok: 1_120, cost: 0.1387 },
  { fn: "generate-pack-scene", model: "gemini-3.1-flash-image-preview", res: "1K", images: 4, inTok: 2_310, outTok: 5_160, cost: 0.1567 },
  { fn: "analyze-style", model: "gemini-2.5-flash", res: null, images: 0, inTok: 6_842, outTok: 1_406, cost: 0.0056 },
  { fn: "generate-quote-image", model: "gemini-3-pro-image-preview", res: "1K", images: 1, inTok: 412, outTok: 1_120, cost: 0.1351 },
  { fn: "generate-glasses-image", model: "gemini-2.5-flash-image", res: "1K", images: 1, inTok: 1_906, outTok: 1_290, cost: 0.0396 },
  { fn: "generate-text-image", model: "gemini-3-pro-image-preview", res: "4K", images: 0, inTok: 1_198, outTok: 0, cost: 0.0015, error: true },
] as const;

const sampleRecent = (): UsageLogRow[] => {
  const minutes = [3, 11, 26, 58, 95, 160];
  return SAMPLE_FUNCTIONS.map((s, i) => ({
    id: `sample-${i}`,
    function_name: s.fn,
    model: s.model,
    prompt_tokens: s.inTok,
    candidates_tokens: s.outTok,
    total_tokens: s.inTok + s.outTok,
    image_count: s.images,
    resolution: s.res,
    estimated_cost_usd: s.cost,
    status: "error" in s && s.error ? "error" : "success",
    created_at: new Date(Date.now() - minutes[i] * 60_000).toISOString(),
  }));
};

export const buildSampleView = (range: UsageRangeKey): UsageView => {
  const n = sampleUsage.length;
  // The sample only covers 30 days, so the "previous period" is a fixed,
  // plausible share of the current one rather than a slice of the series.
  const growth: Record<UsageRangeKey, number> = { today: 0.93, "7d": 0.89, "30d": 0.84, all: 1 };
  const current: UsagePoint[] = range === "today" ? sampleUsage.slice(n - 1) : range === "7d" ? sampleUsage.slice(n - 7) : sampleUsage;
  const previousLabel = { today: "vs yesterday", "7d": "vs previous 7 days", "30d": "vs previous 30 days", all: "" }[range];

  const totals = sum(current);
  const f = growth[range];
  const previous: UsageTotals | null =
    range === "all"
      ? null
      : {
          cost: totals.cost * f,
          images: Math.round(totals.images * f * 1.02),
          tokens: Math.round(totals.tokens * f * 0.96),
          calls: Math.round(totals.calls * f * 0.97),
        };

  // Scale the per-model split so it adds up to this range's totals.
  const modelCost = sampleUsageByModel.reduce((s, m) => s + m.cost, 0);
  const modelImages = sampleUsageByModel.reduce((s, m) => s + m.images, 0);
  const byModel: UsageModelRow[] = sampleUsageByModel
    .map((m) => {
      const images = Math.round((m.images / modelImages) * totals.images);
      return {
        model: m.model,
        cost: (m.cost / modelCost) * totals.cost,
        images,
        calls: callsFor(images),
        tokens: Math.round((m.images / modelImages) * totals.tokens),
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const series =
    range === "today"
      ? hourlyToday(current[0])
      : current.map((p) => dayPoint(toDate(p.date), p.cost, p.images));

  return {
    totals,
    previous,
    previousLabel,
    granularity: range === "today" ? "hour" : "day",
    series,
    byModel,
    recent: sampleRecent(),
  };
};
