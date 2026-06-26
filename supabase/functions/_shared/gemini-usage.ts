// Shared helper: estimate Gemini API cost from usageMetadata and log it
// Prices are USD per 1M tokens (text) and per image (output image).
// Source: ai.google.dev/pricing (Dec 2025 published rates).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

type Pricing = {
  inputPer1M: number;
  outputPer1M: number;
  imageOut?: number; // per image at 1K/2K
  imageOut4K?: number;
};

const PRICING: Record<string, Pricing> = {
  "gemini-2.5-flash-image": { inputPer1M: 0.30, outputPer1M: 2.50, imageOut: 0.039 },
  "gemini-3.1-flash-image-preview": { inputPer1M: 0.30, outputPer1M: 2.50, imageOut: 0.039 },
  "gemini-3-pro-image-preview": { inputPer1M: 1.25, outputPer1M: 10.0, imageOut: 0.134, imageOut4K: 0.24 },
  "gemini-3-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.0-flash-exp-image-generation": { inputPer1M: 0.30, outputPer1M: 2.50, imageOut: 0.039 },
};

const DEFAULT: Pricing = { inputPer1M: 1.25, outputPer1M: 10.0, imageOut: 0.134 };

export function estimateCostUSD(opts: {
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  imageCount?: number;
  resolution?: string;
}): number {
  const p = PRICING[opts.model] || DEFAULT;
  const inputCost = (opts.promptTokens / 1_000_000) * p.inputPer1M;
  const outputTextCost = (opts.candidatesTokens / 1_000_000) * p.outputPer1M;
  const perImage = opts.resolution === "4K" && p.imageOut4K ? p.imageOut4K : (p.imageOut || 0);
  const imageCost = (opts.imageCount || 0) * perImage;
  return Number((inputCost + outputTextCost + imageCost).toFixed(6));
}

export async function logGeminiUsage(opts: {
  userId: string;
  functionName: string;
  model: string;
  usageMetadata: any;
  imageCount?: number;
  resolution?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const promptTokens = opts.usageMetadata?.promptTokenCount || 0;
    const candidatesTokens = opts.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = opts.usageMetadata?.totalTokenCount || (promptTokens + candidatesTokens);

    const cost = estimateCostUSD({
      model: opts.model,
      promptTokens,
      candidatesTokens,
      imageCount: opts.imageCount,
      resolution: opts.resolution,
    });

    await supabase.from("gemini_usage_logs").insert({
      user_id: opts.userId,
      function_name: opts.functionName,
      model: opts.model,
      prompt_tokens: promptTokens,
      candidates_tokens: candidatesTokens,
      total_tokens: totalTokens,
      image_count: opts.imageCount || 0,
      resolution: opts.resolution || null,
      estimated_cost_usd: cost,
      status: opts.status || "success",
      metadata: opts.metadata || null,
    });
  } catch (err) {
    console.error("logGeminiUsage failed:", err);
  }
}
