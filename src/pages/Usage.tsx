import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Zap, Image as ImageIcon, BarChart3, RefreshCw, CheckCircle2, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

const RANGES: Record<RangeKey, { label: string; days: number | null }> = {
  today: { label: "Today", days: 0 },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  all: { label: "All time", days: null },
};

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n < 1 ? 4 : 2 }).format(n);

export default function Usage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("7d");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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

    const days = RANGES[range].days;
    if (days !== null) {
      const since = new Date();
      if (days === 0) since.setHours(0, 0, 0, 0);
      else since.setDate(since.getDate() - days);
      q = q.gte("created_at", since.toISOString());
    }

    const { data, error } = await q;
    if (!error && data) setLogs(data as UsageLog[]);
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

  const stats = [
    { label: "Estimated cost", value: fmtUSD(totals.cost), icon: DollarSign, caption: "Token-based estimate" },
    { label: "Total tokens", value: totals.tokens.toLocaleString(), icon: Zap, caption: "Input + output" },
    { label: "Images", value: totals.images.toLocaleString(), icon: ImageIcon, caption: "Generated in range" },
    { label: "API calls", value: totals.calls.toLocaleString(), icon: BarChart3, caption: `${RANGES[range].label}` },
  ];

  return (
    <AppLayout>
      <ScrollArea className="h-full">
        <div className="max-w-container-xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
          {/* Page header — list page pattern (§5) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-heading-md text-foreground">Gemini usage</h1>
              <p className="text-body-sm text-muted-foreground">
                Token-based cost estimation. Logged directly from Gemini API responses (not Google billing).
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
                    className="segmented-item whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {RANGES[k].label}
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn(loading && "animate-spin")} strokeWidth={1.5} aria-hidden="true" /> Refresh
              </Button>
            </div>
          </div>

          {/* KPI cards */}
          <section aria-label="Summary" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-4 md:p-7 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-overline text-muted-foreground">{s.label}</span>
                  <s.icon className="size-4 text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                </div>
                {loading ? (
                  <Skeleton className="h-[30px] w-24 rounded-md" />
                ) : (
                  <div className="text-heading-md text-foreground tabular-nums truncate">{s.value}</div>
                )}
                <span className="text-caption text-muted-foreground">{s.caption}</span>
              </Card>
            ))}
          </section>

          {/* By model */}
          <Card className="p-4 md:p-7">
            <div className="pb-3">
              <h2 className="text-heading-sm text-foreground">By model</h2>
              <p className="text-caption text-muted-foreground">Sorted by estimated cost</p>
            </div>
            {byModel.length === 0 ? (
              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Info className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                No usage in this range yet.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:-mx-7">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 md:px-7 text-overline">Model</TableHead>
                      <TableHead className="h-9 text-overline text-right">Calls</TableHead>
                      <TableHead className="h-9 text-overline text-right">Tokens</TableHead>
                      <TableHead className="h-9 text-overline text-right">Images</TableHead>
                      <TableHead className="h-9 px-4 md:px-7 text-overline text-right">Est. cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byModel.map(([model, v]) => (
                      <TableRow key={model} className="hover:bg-control/50">
                        <TableCell className="py-3 px-4 md:px-7 text-code text-foreground">{model}</TableCell>
                        <TableCell className="py-3 text-right tabular-nums">{v.calls}</TableCell>
                        <TableCell className="py-3 text-right tabular-nums">{v.tokens.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-right tabular-nums">{v.images}</TableCell>
                        <TableCell className="py-3 px-4 md:px-7 text-right tabular-nums font-medium">{fmtUSD(v.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Recent logs */}
          <Card className="p-4 md:p-7">
            <div className="pb-3">
              <h2 className="text-heading-sm text-foreground">Recent calls</h2>
              <p className="text-caption text-muted-foreground">Most recent first</p>
            </div>
            {logs.length === 0 ? (
              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Info className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                No logs yet.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:-mx-7">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 md:px-7 text-overline">Time</TableHead>
                      <TableHead className="h-9 text-overline">Function</TableHead>
                      <TableHead className="h-9 text-overline">Model</TableHead>
                      <TableHead className="h-9 text-overline">Status</TableHead>
                      <TableHead className="h-9 text-overline text-right">In</TableHead>
                      <TableHead className="h-9 text-overline text-right">Out</TableHead>
                      <TableHead className="h-9 text-overline text-right">Img</TableHead>
                      <TableHead className="h-9 px-4 md:px-7 text-overline text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 100).map((l) => (
                      <TableRow key={l.id} className="hover:bg-control/50">
                        <TableCell className="py-3 px-4 md:px-7 text-muted-foreground whitespace-nowrap tabular-nums">
                          {format(new Date(l.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">{l.function_name}</TableCell>
                        <TableCell className="py-3 text-code whitespace-nowrap">{l.model}</TableCell>
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
                        <TableCell className="py-3 px-4 md:px-7 text-right tabular-nums font-medium">{fmtUSD(Number(l.estimated_cost_usd))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {logs.length > 100 && (
              <p className="text-caption text-muted-foreground pt-3 tabular-nums">
                Showing 100 of {logs.length} entries.
              </p>
            )}
          </Card>

          <p className="text-caption text-tertiary-foreground">
            Pricing: Flash image $0.039/img + $0.30/1M input tokens. Pro image $0.134/img (1K-2K) or $0.24/img (4K) +
            $1.25/1M input + $10/1M output. Actual Google billing may differ slightly.
          </p>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
