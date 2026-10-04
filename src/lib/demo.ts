import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Demo mode — lets anyone tour Lumra without an account.
 *
 * Enabled with `?demo=1` (or the "Explore the demo" button on /auth) and kept in
 * localStorage. Each tab reads the flag once at boot, so toggling the demo in one
 * tab never switches another open tab mid-session. While active, the Supabase
 * client is shadowed so that:
 *  - auth returns a fake signed-in demo user,
 *  - reads resolve to empty results (pages then render their sample content),
 *  - writes / edge functions resolve to a friendly "sign in to save" error.
 * The generated client file is left untouched; the layer is installed at boot.
 */

const STORAGE_KEY = "lumra-demo";
export const DEMO_MESSAGE = "Demo mode — sign in to save and generate";

const safeGet = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Per-tab snapshot of the flag, taken at boot and changed only by enter/exit below. */
let demoActive = safeGet(STORAGE_KEY) === "1";

export const isDemoMode = () => demoActive;

export const enterDemoMode = () => {
  demoActive = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage unavailable — demo stays off */
  }
};

export const exitDemoMode = () => {
  demoActive = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const now = new Date().toISOString();

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-00000000d3e0",
  aud: "authenticated",
  role: "authenticated",
  email: "maya@lumra.studio",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Maya Demir" },
  created_at: now,
} as unknown as User;

const DEMO_SESSION = {
  access_token: "demo",
  refresh_token: "demo",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: DEMO_USER,
} as unknown as Session;

/* ---------------------------------------------------------------------------
 * Chainable query stub: every builder method returns the stub, awaiting it
 * yields the result. Reads are empty, writes fail softly.
 * ------------------------------------------------------------------------- */
type StubResult = { data: unknown; error: Error | null; count?: number };

/** A real Error (like Supabase's own errors) so `instanceof Error` checks show the message. */
const demoError = () => new Error(DEMO_MESSAGE);

const READ_RESULT: StubResult = { data: [], error: null, count: 0 };
const WRITE_RESULT: StubResult = { data: null, error: demoError() };
const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);

const queryStub = (result: StubResult = READ_RESULT): unknown => {
  const proxy: unknown = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: StubResult) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject);
      }
      if (prop === "single" || prop === "maybeSingle") {
        return () => queryStub(result.error ? result : { data: null, error: null });
      }
      if (typeof prop === "string" && WRITE_METHODS.has(prop)) {
        return () => queryStub(WRITE_RESULT);
      }
      return () => proxy;
    },
  });
  return proxy;
};

const storageBucketStub = {
  list: async () => ({ data: [], error: null }),
  download: async () => ({ data: null, error: demoError() }),
  upload: async () => ({ data: null, error: demoError() }),
  remove: async () => ({ data: null, error: demoError() }),
  move: async () => ({ data: null, error: demoError() }),
  createSignedUrl: async () => ({ data: null, error: demoError() }),
  createSignedUrls: async () => ({ data: [], error: null }),
  getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
};

const channelStub = (): unknown => {
  const ch: Record<string, unknown> = {};
  ch.on = () => ch;
  ch.subscribe = () => ch;
  ch.unsubscribe = async () => "ok";
  return ch;
};

let installed = false;

/** Shadows the shared Supabase client while demo mode is on. Call once at boot. */
export const installDemoLayer = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // `?demo=1` turns the tour on, `?demo=0` turns it off.
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") enterDemoMode();
  if (params.get("demo") === "0") exitDemoMode();

  const client = supabase as unknown as Record<string, unknown>;
  const auth = supabase.auth as unknown as Record<string, unknown>;

  const realGetSession = supabase.auth.getSession.bind(supabase.auth);
  const realGetUser = supabase.auth.getUser.bind(supabase.auth);
  const realOnChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
  const realSignOut = supabase.auth.signOut.bind(supabase.auth);

  auth.getSession = () =>
    isDemoMode() ? Promise.resolve({ data: { session: DEMO_SESSION }, error: null }) : realGetSession();
  auth.getUser = (jwt?: string) =>
    isDemoMode() ? Promise.resolve({ data: { user: DEMO_USER }, error: null }) : realGetUser(jwt);
  auth.onAuthStateChange = (cb: Parameters<typeof realOnChange>[0]) =>
    isDemoMode()
      ? { data: { subscription: { id: "demo", callback: cb, unsubscribe: () => {} } } }
      : realOnChange(cb);
  // Leaving the demo also clears any real session stored alongside it; with no
  // stored session the real signOut just resolves `{ error: null }`.
  auth.signOut = (opts?: Parameters<typeof realSignOut>[0]) => {
    if (isDemoMode()) exitDemoMode();
    return realSignOut(opts);
  };

  const realFrom = supabase.from.bind(supabase);
  client.from = (table: string) => (isDemoMode() ? queryStub() : realFrom(table as never));
  const realRpc = supabase.rpc.bind(supabase);
  client.rpc = (...args: Parameters<typeof realRpc>) => (isDemoMode() ? queryStub() : realRpc(...args));
  const realChannel = supabase.channel.bind(supabase);
  client.channel = (...args: Parameters<typeof realChannel>) => (isDemoMode() ? channelStub() : realChannel(...args));
  const realRemove = supabase.removeChannel.bind(supabase);
  client.removeChannel = (...args: Parameters<typeof realRemove>) =>
    isDemoMode() ? Promise.resolve("ok") : realRemove(...args);

  // `storage` is an instance field and `functions` a prototype getter — shadow both.
  const realStorage = supabase.storage;
  Object.defineProperty(supabase, "storage", {
    configurable: true,
    get: () => (isDemoMode() ? { from: () => storageBucketStub } : realStorage),
  });
  const functionsGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(supabase), "functions")?.get;
  if (functionsGetter) {
    Object.defineProperty(supabase, "functions", {
      configurable: true,
      get: () =>
        isDemoMode()
          ? {
              // Error for callers that read `error`, a failed body for those that read `data`.
              invoke: async () => ({
                data: { success: false, message: DEMO_MESSAGE, error: DEMO_MESSAGE },
                error: demoError(),
              }),
            }
          : functionsGetter.call(supabase),
    });
  }
};
