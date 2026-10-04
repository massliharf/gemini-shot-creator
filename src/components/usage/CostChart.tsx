import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { fmtMoney, type UsageGranularity, type UsageSeriesPoint } from "./usageData";

interface CostChartProps {
  series: UsageSeriesPoint[];
  granularity: UsageGranularity;
  /** Range caption used in the accessible summary, e.g. "Last 7 days". */
  rangeLabel: string;
}

const INK = "hsl(var(--foreground))";
const GRID = "hsl(var(--border))";
const TICK = { fill: "hsl(var(--tertiary-foreground))", fontSize: 11 };

const axisMoney = (v: number) => {
  if (v === 0) return "$0";
  if (v >= 10) return `$${Math.round(v)}`;
  if (v >= 1) return `$${v.toFixed(1).replace(/\.0$/, "")}`;
  return `$${v.toFixed(2)}`;
};

/** Evenly spaced y ticks from 0 that just clear the peak (3 or 4 intervals, "nice" steps). */
const niceTicks = (peak: number): number[] => {
  const target = peak > 0 ? peak * 1.08 : 1;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  let best: number[] = [0, target];
  for (const intervals of [3, 4]) {
    const raw = target / intervals;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = (steps.find((n) => n * mag >= raw) ?? 10) * mag;
    const ticks = Array.from({ length: intervals + 1 }, (_, i) => +(i * step).toFixed(6));
    if (best.length === 2 || ticks[ticks.length - 1] < best[best.length - 1]) best = ticks;
  }
  return best;
};

const ChartTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as UsageSeriesPoint;
  return (
    <div className="rounded-md bg-popover px-3 py-2 shadow-overlay">
      <p className="text-caption text-muted-foreground">{p.fullLabel}</p>
      <p className="text-label-md text-foreground tabular-nums">{fmtMoney(p.cost)}</p>
      <p className="text-caption text-tertiary-foreground tabular-nums">
        {p.images.toLocaleString()} {p.images === 1 ? "image" : "images"}
      </p>
    </div>
  );
};

/**
 * Single-series estimated-cost chart: an area for daily ranges, thin columns
 * for today's hours. Ink-coloured marks, hairline grid, hover tooltip and a
 * screen-reader table twin.
 */
export const CostChart = ({ series, granularity, rangeLabel }: CostChartProps) => {
  const gradientId = useId().replace(/:/g, "");
  const [width, setWidth] = useState(0);
  const total = series.reduce((s, p) => s + p.cost, 0);
  const peak = series.reduce<UsageSeriesPoint | null>((best, p) => (!best || p.cost > best.cost ? p : best), null);
  const asBars = granularity === "hour" || series.length < 3;
  const yTicks = niceTicks(peak?.cost ?? 0);
  // Roughly one x label per 64px of plot width, evenly spaced.
  const maxLabels = width > 0 ? Math.max(2, Math.floor((width - 56) / 64)) : 8;
  const labelEvery = Math.max(0, Math.ceil(series.length / maxLabels) - 1);

  const common = {
    data: series,
    margin: { top: 8, right: 16, bottom: 0, left: 0 },
  };
  const xAxis = (
    <XAxis
      dataKey="label"
      tickLine={false}
      axisLine={false}
      tick={TICK}
      tickMargin={8}
      interval={labelEvery}
    />
  );
  const yAxis = (
    <YAxis
      tickLine={false}
      axisLine={false}
      tick={TICK}
      width={44}
      ticks={yTicks}
      domain={[0, yTicks[yTicks.length - 1]]}
      tickFormatter={axisMoney}
    />
  );
  const grid = <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />;

  return (
    <figure className="m-0">
      <div
        className="h-[220px] w-full md:h-[248px]"
        role="img"
        aria-label={`Estimated cost, ${rangeLabel}: ${fmtMoney(total)} in total${peak && peak.cost > 0 ? `, peak ${fmtMoney(peak.cost)} on ${peak.fullLabel}` : ""}.`}
      >
        <ResponsiveContainer width="100%" height="100%" onResize={(w) => setWidth(w)}>
          {asBars ? (
            <BarChart {...common} barCategoryGap="30%">
              {grid}
              {xAxis}
              {yAxis}
              <Tooltip cursor={{ fill: "hsl(var(--control))" }} content={<ChartTooltip />} isAnimationActive={false} />
              <Bar dataKey="cost" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={granularity === "hour" ? 14 : 24} isAnimationActive={false} />
            </BarChart>
          ) : (
            <AreaChart {...common}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={INK} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={INK} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {grid}
              {xAxis}
              {yAxis}
              <Tooltip
                cursor={{ stroke: "hsl(var(--border-strong))", strokeWidth: 1 }}
                content={<ChartTooltip />}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke={INK}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: INK, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Table twin for assistive tech */}
      <table className="sr-only">
        <caption>Estimated cost per {granularity === "hour" ? "hour" : "day"}, {rangeLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{granularity === "hour" ? "Hour" : "Day"}</th>
            <th scope="col">Cost</th>
            <th scope="col">Images</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.fullLabel}</th>
              <td>{fmtMoney(p.cost)}</td>
              <td>{p.images}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
