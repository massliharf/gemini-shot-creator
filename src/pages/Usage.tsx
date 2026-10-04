import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Zap, Image as ImageIcon, BarChart3, RefreshCw, CheckCircle2, XCircle, Info, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo";
import { SampleChip, SampleNotice } from "@/components/SampleNotice";
import { CostChart } from "@/components/usage/CostChart";
import { ModelBreakdown, StatTile } from "@/components/usage/UsageParts";
import {
  bucketLogs,
  buildSampleView,
  fmtCompact,
  fmtMoney,
  fmtUSD,
  usageRangeStart,
  type UsageView,
} from "@/components/usage/usageData";

interface UsageLog {
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

type RangeKey = "today" | "7d" | "30d" | "all";

const RANGES: Record<RangeKey, { label: string; short: string }> = {
  today: { label: "Today", short: "Today" },
  "7d": { label: "Last 7 days", short: "7 days" },
  "30d": { label: "Last 30 days", short: "30 days" },
  all: { label: "All time", short: "All time" },
};

export default function Usage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("7d");
  // Whether the account has any usage logs at all (null until known). Sample usage is
  // only for demo mode or an account with no logs yet, never for an empty range.
  const [hasAnyUsage, setHasAnyUsage] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);
  const loadSeq = useRef(0);

  const load = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (seq !== loadSeq.current) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    let q = supabase
      .from("gemini_usage_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    // Calendar days from local midnight — the same window the chart buckets.
    const since = usageRangeStart(range);
    if (since) q = q.gte("created_at", since.toISOString());

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      q,
      supabase.from("gemini_usage_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    // A newer range or refresh has started; its result wins.
    if (seq !== loadSeq.current) return;

    const rows = error ? [] : ((data ?? []) as UsageLog[]);
    setLogs(rows);
    setLoadError(Boolean(error));
    if (rows.length > 0) setHasAnyUsage(true);
    else if (!countError) setHasAnyUsage((count ?? 0) > 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [range]);

  const totals = useMemo(() => {
    const cost = logs.reduce((s, l) => s + Number(l.estimated_cost_usd), 0);
    const tokens = logs.reduce((s, l) => s + l.total_tokens, 0);
    const images = logs.reduce((s, l) => s + l.image_count, 0);
    return { cost, tokens, images, calls: logs.length };
  }, [logs]);

  const byModel = useMemo(() => {
    const m = new Map<string, { calls: number; cost: number; tokens: number; images: number }>();
    logs.forEach((l) => {
      const e = m.get(l.model) || { calls: 0, cost: 0, tokens: 0, images: 0 };
      e.calls++;
      e.cost += Number(l.estimated_cost_usd);
      e.tokens += l.total_tokens;
      e.images += l.image_count;
      m.set(l.model, e);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [logs]);

  // Demo mode, or an account with no logs at all → sample usage for the same range.
  // A real account with older logs sees real zeros for an empty range instead.
  const isSample = !loading && !loadError && (isDemoMode() || hasAnyUsage === false);

  const realView = useMemo<UsageView>(() => {
    const { granularity, series } = bucketLogs(logs, range);
    return {
      totals,
      previous: null,
      previousLabel: "",
      granularity,
      series,
      byModel: byModel.map(([model, v]) => ({ model, ...v })),
      recent: logs,
    };
  }, [logs, range, totals, byModel]);

  const sampleView = useMemo(() => buildSampleView(range), [range]);
  const view = isSample ? sampleView : realView;
  const prev = view.previous;

  const stats = [
    { key: "cost", label: "Estimated cost", value: fmtMoney(view.totals.cost), icon: DollarSign, caption: "Token-based estimate", current: view.totals.cost, previous: prev?.cost },
    { key: "images", label: "Images", value: view.totals.images.toLocaleString(), icon: ImageIcon, caption: "Generated in range", current: view.totals.images, previous: prev?.images },
    { key: "tokens", label: "Total tokens", value: fmtCompact(view.totals.tokens), icon: Zap, caption: "Input + output", current: view.totals.tokens, previous: prev?.tokens },
    { key: "calls", label: "API calls", value: view.totals.calls.toLocaleString(), icon: BarChart3, caption: RANGES[range].label, current: view.totals.calls, previous: prev?.calls },
  ];
  const peak = view.series.reduce((best, p) => (p.cost > best.cost ? p : best), view.series[0] ?? { cost: 0, fullLabel: "" });
  const recent = view.recent;

  return (
    <AppLayout>
      {/* Viewport child is display:table by default, which lets the wide table stretch the page on mobile */}
      <ScrollArea className="h-full [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="max-w-container-xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
          {/* Page header — list page pattern (§5) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-heading-md text-foreground">Usage & cost</h1>
              <p className="text-body-sm text-muted-foreground">
                Token-based estimates logged from Gemini API responses — not Google billing.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Range — segmented control */}
              <div role="group" aria-label="Date range" className="segmented max-w-full overflow-x-auto">
                {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={range === k}
                    onClick={() => setRange(k)}
                    className="segmented-item whitespace-nowrap px-3 sm:px-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <span className="sm:hidden">{RANGES[k].short}</span>
                    <span className="hidden sm:inline">{RANGES[k].label}</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn(loading && "animate-spin")} strokeWidth={1.5} aria-hidden="true" /> Refresh
              </Button>
            </div>
          </div>

          {isSample && <SampleNotice>Usage from your API calls will appear here.</SampleNotice>}

          {loadError && !loading ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4" role="alert">
              <AlertCircle className="size-5 text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="text-heading-md text-foreground mb-1">Couldn't load your usage</h2>
              <p className="text-body-sm text-muted-foreground">Check your connection, then refresh to try again.</p>
            </div>
          ) : (
            <>
              {/* KPI tiles */}
              <section aria-label="Summary" className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3">
                {stats.map((s) => (
                  <StatTile
                    key={s.key}
                    label={s.label}
                    value={s.value}
                    icon={s.icon}
                    caption={s.caption}
                    current={s.current}
                    previous={s.previous}
                    previousLabel={view.previousLabel}
                    loading={loading}
                  />
                ))}
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 md:gap-3">
                {/* Cost over time */}
                <Card className="p-4 md:p-6 xl:col-span-2 min-w-0">
                  <div className="flex items-start justify-between gap-3 pb-4">
                    <div className="min-w-0">
                      <h2 className="text-heading-sm text-foreground flex items-center gap-2">
                        {view.granularity === "hour" ? "Cost by hour" : "Daily cost"}
                        {isSample && <SampleChip />}
                      </h2>
                      <p className="text-caption text-muted-foreground">Estimated spend · {RANGES[range].label}</p>
                    </div>
                    {!loading && peak.cost > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-overline text-muted-foreground">Peak</p>
                        <p className="text-label-md text-foreground tabular-nums">{fmtMoney(peak.cost)}</p>
                        <p className="text-caption text-tertiary-foreground">{peak.fullLabel}</p>
                      </div>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-[220px] md:h-[248px] w-full rounded-md" />
                  ) : (
                    <CostChart series={view.series} granularity={view.granularity} rangeLabel={RANGES[range].label} />
                  )}
                </Card>

                {/* By model */}
                <Card className="p-4 md:p-6 min-w-0 flex flex-col">
                  <div className="pb-4">
                    <h2 className="text-heading-sm text-foreground flex items-center gap-2">
                      By model
                      {isSample && <SampleChip />}
                    </h2>
                    <p className="text-caption text-muted-foreground">Share of estimated spend</p>
                  </div>
                  {loading ? (
                    <div className="space-y-4" aria-busy="true">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="space-y-1.5">
                          <Skeleton className="h-3 w-2/3 rounded-xs" />
                          <Skeleton className="h-1.5 w-full rounded-full" />
                          <Skeleton className="h-3 w-1/2 rounded-xs" />
                        </div>
                      ))}
                    </div>
                  ) : view.byModel.length === 0 ? (
                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                      <Info className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                      No usage in this range yet.
                    </div>
                  ) : (
                    <ModelBreakdown rows={view.byModel} />
                  )}
                </Card>
              </div>

              {/* Recent calls */}
              <Card className="p-4 md:p-6">
                <div className="pb-3">
                  <h2 className="text-heading-sm text-foreground flex items-center gap-2">
                    Recent calls
                    {isSample && <SampleChip />}
                  </h2>
                  <p className="text-caption text-muted-foreground">Most recent first</p>
                </div>
                {loading ? (
                  <div className="space-y-2" aria-busy="true">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-9 w-full rounded-md" />
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                    <Info className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    No calls in this range yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 md:-mx-6">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="h-9 px-4 md:px-6 text-overline text-muted-foreground">Time</TableHead>
                          <TableHead className="h-9 text-overline text-muted-foreground">Function</TableHead>
                          <TableHead className="h-9 text-overline text-muted-foreground">Model</TableHead>
                          <TableHead className="h-9 text-overline text-muted-foreground">Status</TableHead>
                          <TableHead className="h-9 text-overline text-muted-foreground text-right">In</TableHead>
                          <TableHead className="h-9 text-overline text-muted-foreground text-right">Out</TableHead>
                          <TableHead className="h-9 text-overline text-muted-foreground text-right">Img</TableHead>
                          <TableHead className="h-9 px-4 md:px-6 text-overline text-muted-foreground text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recent.slice(0, 100).map((l) => (
                          <TableRow key={l.id} className="hover:bg-control/50 border-border-subtle">
                            <TableCell className="py-3 px-4 md:px-6 text-muted-foreground whitespace-nowrap tabular-nums">
                              {format(new Date(l.created_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell className="py-3 whitespace-nowrap text-label-md text-foreground">{l.function_name}</TableCell>
                            <TableCell className="py-3 text-code text-muted-foreground whitespace-nowrap">{l.model}</TableCell>
                            <TableCell className="py-3">
                              <Badge variant={l.status === "success" ? "success" : "danger"}>
                                {l.status === "success" ? (
                                  <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                                ) : (
                                  <XCircle strokeWidth={1.5} aria-hidden="true" />
                                )}
                                {l.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-right tabular-nums">{l.prompt_tokens.toLocaleString()}</TableCell>
                            <TableCell className="py-3 text-right tabular-nums">{l.candidates_tokens.toLocaleString()}</TableCell>
                            <TableCell className="py-3 text-right tabular-nums">{l.image_count}</TableCell>
                            <TableCell className="py-3 px-4 md:px-6 text-right tabular-nums text-label-md text-foreground">{fmtUSD(Number(l.estimated_cost_usd))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {recent.length > 100 && (
                  <p className="text-caption text-muted-foreground pt-3 tabular-nums">
                    Showing 100 of {recent.length} entries.
                  </p>
                )}
              </Card>
            </>
          )}

          <p className="text-caption text-tertiary-foreground">
            Pricing: Flash image $0.039/img + $0.30/1M input tokens. Pro image $0.134/img (1K-2K) or $0.24/img (4K) +
            $1.25/1M input + $10/1M output. Actual Google billing may differ slightly.
          </p>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
