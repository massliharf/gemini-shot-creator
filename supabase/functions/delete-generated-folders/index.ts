// Supabase Edge Function: delete-generated-folders
// Deletes folders from the 'generated-images' bucket using service role, while enforcing user ownership via public.packs.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

type Body = {
  folderNames: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...init.headers,
    },
    ...init,
  });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error("delete-generated-folders: missing env", {
      hasUrl: !!SUPABASE_URL,
      hasAnon: !!SUPABASE_ANON_KEY,
      hasService: !!SERVICE_ROLE_KEY,
    });
    return json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const folderNames = Array.isArray(body.folderNames) ? body.folderNames : [];
  if (folderNames.length === 0) {
    return json({ error: "folderNames is required" }, { status: 400 });
  }

  // Client for auth verification (uses the caller JWT)
  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await authed.auth.getUser();
  if (userErr || !userData?.user) {
    console.warn("delete-generated-folders: auth.getUser failed", userErr);
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;

  // Service client (bypasses RLS) for storage + db checks
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify ownership for each folderName
  const unique = Array.from(
    new Set(folderNames.map((s) => String(s || "").trim()).filter(Boolean)),
  );

  const allowed: string[] = [];
  const denied: string[] = [];

  for (const folder of unique) {
    if (folder === "reference") {
      allowed.push(folder);
      continue;
    }

    // 1) Preferred: folder corresponds to a pack row.
    // NOTE: legacy rows may have user_id = null (older bug). If so, we "claim" it for the current user.
    // Fetch ALL packs with this pack_id to check if ANY belong to the user
    const { data: packs, error: packErr } = await admin
      .from("packs")
      .select("id, user_id")
      .eq("pack_id", folder);

    if (packErr) {
      console.warn("delete-generated-folders: pack lookup error", { folder, packErr });
    }

    // Check if ANY pack with this pack_id belongs to the user or has null user_id
    const userPack = packs?.find(p => p.user_id === userId);
    const nullPack = packs?.find(p => p.user_id === null);
    const pack = userPack || nullPack;

    if (pack) {
      if (pack.user_id === null) {
        // Claim all null user_id packs with this pack_id for the current user
        const { error: claimErr } = await admin
          .from("packs")
          .update({ user_id: userId })
          .eq("pack_id", folder)
          .is("user_id", null);
        if (claimErr) console.warn("delete-generated-folders: failed to claim packs", { folder, claimErr });
      }
      allowed.push(folder);
      continue;
    }

    // If there are packs but none belong to user or have null user_id, deny
    if (packs && packs.length > 0) {
      denied.push(folder);
      continue;
    }

    // 2) Fallback: some folders may only exist via queue items (also may have user_id null).
    const { data: qRow, error: qErr } = await admin
      .from("generation_queue")
      .select("id, user_id")
      .like("image_path", `${folder}/%`)
      .limit(1)
      .maybeSingle();

    if (qErr) {
      console.warn("delete-generated-folders: generation_queue lookup error", { folder, qErr });
    }

    if (qRow && (qRow.user_id === userId || qRow.user_id === null)) {
      if (qRow.user_id === null) {
        const { error: claimQErr } = await admin
          .from("generation_queue")
          .update({ user_id: userId })
          .like("image_path", `${folder}/%`);
        if (claimQErr) console.warn("delete-generated-folders: failed to claim queue rows", { folder, claimQErr });
      }
      allowed.push(folder);
    } else {
      denied.push(folder);
    }
  }

  const deleted: Record<string, { removed: number; errors: string[] }> = {};

  for (const folder of allowed) {
    const errors: string[] = [];
    let removedCount = 0;

    // list+remove loop (handles pagination)
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { data: files, error: listErr } = await admin.storage
        .from("generated-images")
        .list(folder, {
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (listErr) {
        errors.push(`list: ${listErr.message}`);
        break;
      }

      const paths = (files || [])
        .filter((f) => f.name)
        .map((f) => `${folder}/${f.name}`);

      if (paths.length === 0) break;

      const { error: removeErr } = await admin.storage.from("generated-images")
        .remove(paths);
      if (removeErr) {
        errors.push(`remove: ${removeErr.message}`);
        break;
      }

      removedCount += paths.length;
      offset += (files || []).length;

      if (!files || files.length < pageSize) break;
    }

    deleted[folder] = { removed: removedCount, errors };
  }

  console.log("delete-generated-folders: finished", {
    userId,
    allowedCount: allowed.length,
    deniedCount: denied.length,
    deleted,
  });

  return json({
    ok: denied.length === 0 && Object.values(deleted).every((r) => r.errors.length === 0),
    userId,
    allowed,
    denied,
    deleted,
  });
});
