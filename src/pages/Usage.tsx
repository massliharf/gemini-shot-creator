import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Zap, Image as ImageIcon, BarChart3, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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

  return (
    <AppLayout>
      <ScrollArea className="h-full">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <BarChart3 className="w-6 h-6" /> Gemini Usage
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Token-based cost estimation. Logged directly from Gemini API responses (not Google billing).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="flex gap-2">
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={range === k ? "default" : "outline"}
                onClick={() => setRange(k)}
              >
                {RANGES[k].label}
              </Button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Estimated Cost
              </div>
              <div className="text-2xl font-semibold text-green-600 dark:text-green-500">
                {fmtUSD(totals.cost)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Zap className="w-3.5 h-3.5" /> Total Tokens
              </div>
              <div className="text-2xl font-semibold">{totals.tokens.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ImageIcon className="w-3.5 h-3.5" /> Images
              </div>
              <div className="text-2xl font-semibold">{totals.images.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BarChart3 className="w-3.5 h-3.5" /> API Calls
              </div>
              <div className="text-2xl font-semibold">{totals.calls.toLocaleString()}</div>
            </Card>
          </div>

          {/* By model */}
          <Card className="p-4">
            <h2 className="text-sm font-medium mb-3">By model</h2>
            {byModel.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage in this range yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Images</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModel.map(([model, v]) => (
                    <TableRow key={model}>
                      <TableCell className="font-mono text-xs">{model}</TableCell>
                      <TableCell className="text-right">{v.calls}</TableCell>
                      <TableCell className="text-right">{v.tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{v.images}</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(v.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Recent logs */}
          <Card className="p-4">
            <h2 className="text-sm font-medium mb-3">Recent calls</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Img</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 100).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(l.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs">{l.function_name}</TableCell>
                      <TableCell className="text-xs font-mono">{l.model}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === "success" ? "secondary" : "destructive"} className="text-[10px]">
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{l.prompt_tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs">{l.candidates_tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs">{l.image_count}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{fmtUSD(Number(l.estimated_cost_usd))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {logs.length > 100 && (
              <p className="text-xs text-muted-foreground mt-2">Showing 100 of {logs.length} entries.</p>
            )}
          </Card>

          <p className="text-xs text-muted-foreground">
            Pricing: Flash image $0.039/img + $0.30/1M input tokens. Pro image $0.134/img (1K-2K) or $0.24/img (4K) +
            $1.25/1M input + $10/1M output. Actual Google billing may differ slightly.
          </p>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
