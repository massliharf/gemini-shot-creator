import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtMoney, type UsageModelRow } from "./usageData";

/* --------------------------------------------------------------------------
 * Stat tile — label, value, change vs previous period
 * ------------------------------------------------------------------------ */
interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  caption: string;
  /** Current and previous raw values; the delta chip is hidden when previous is undefined. */
  current?: number;
  previous?: number;
  previousLabel?: string;
  loading?: boolean;
}

const pctChange = (current: number, previous: number) => (previous === 0 ? null : ((current - previous) / previous) * 100);

export const StatTile = ({ label, value, icon: Icon, caption, current, previous, previousLabel, loading }: StatTileProps) => {
  const pct = current !== undefined && previous !== undefined ? pctChange(current, previous) : null;
  const flat = pct !== null && Math.abs(pct) < 0.5;
  const DeltaIcon = flat ? Minus : pct !== null && pct > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-label-md text-muted-foreground">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-control text-muted-foreground" aria-hidden="true">
          <Icon className="size-4" strokeWidth={1.5} />
        </span>
      </div>
      {loading ? (
        <Skeleton className="my-1 h-7 w-24 rounded-md" />
      ) : (
        <p className="truncate text-heading-lg text-foreground">{value}</p>
      )}
      <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
        {pct !== null && !loading ? (
          <>
            <span className="meta-chip gap-0.5 tabular-nums">
              <DeltaIcon className="size-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">{flat ? "No change" : pct > 0 ? "Up" : "Down"}</span>
              {flat ? "0%" : `${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`}
            </span>
            <span className="truncate text-caption text-tertiary-foreground">{previousLabel}</span>
          </>
        ) : (
          <span className="truncate text-caption text-tertiary-foreground">{caption}</span>
        )}
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
 * By model — share of spend as horizontal proportion bars
 * ------------------------------------------------------------------------ */
export const ModelBreakdown = ({ rows }: { rows: UsageModelRow[] }) => {
  const total = rows.reduce((s, r) => s + r.cost, 0);
  const images = rows.reduce((s, r) => s + r.images, 0);
  return (
    <div className="flex flex-1 flex-col gap-5">
      <ul className="m-0 list-none space-y-4 p-0">
        {rows.map((r) => {
          const share = total > 0 ? (r.cost / total) * 100 : 0;
          return (
            <li key={r.model} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-label-md text-foreground" title={r.model}>
                  {r.model}
                </span>
                <span className="shrink-0 text-label-md text-foreground tabular-nums">{fmtMoney(r.cost)}</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-control"
                role="meter"
                aria-label={`${r.model} share of spend`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share)}
                aria-valuetext={`${Math.round(share)}%`}
              >
                <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(share, 1)}%` }} />
              </div>
              <p className="text-caption text-tertiary-foreground tabular-nums">
                {Math.round(share)}% of spend · {r.images.toLocaleString()} images · {r.calls.toLocaleString()} calls
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-baseline justify-between gap-3 rounded-md bg-app px-3 py-2.5">
        <span className="text-label-md text-muted-foreground">
          Total <span className="text-tertiary-foreground tabular-nums">· {images.toLocaleString()} images</span>
        </span>
        <span className="text-label-md text-foreground tabular-nums">{fmtMoney(total)}</span>
      </div>
    </div>
  );
};
