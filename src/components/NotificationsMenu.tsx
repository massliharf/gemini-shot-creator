import { useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCheck, Coins, Share2, Sparkles, Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { mockImage, relativeTime, sampleNotifications, type SampleNotification } from "@/data/mock";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo";

const kindIcon: Record<SampleNotification["kind"], typeof Bell> = {
  done: Sparkles,
  shared: Share2,
  tip: Lightbulb,
  credits: Coins,
};

/* ---------------------------------------------------------------------------
 * Read state lives outside the component: every page mounts its own AppLayout
 * (and the rail + mobile header each render a bell), so it must survive remounts
 * and stay in sync. Persisted to localStorage so it also survives reloads.
 * ------------------------------------------------------------------------- */
const READ_KEY = "lumra-notifications-read";
const listeners = new Set<() => void>();
let readIds: ReadonlySet<string> | null = null;

const loadReadIds = (): ReadonlySet<string> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
};

const getReadIds = () => {
  if (!readIds) readIds = loadReadIds();
  return readIds;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const markRead = (ids: string[]) => {
  const current = getReadIds();
  if (ids.every((id) => current.has(id))) return;
  readIds = new Set([...current, ...ids]);
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
  } catch {
    /* storage unavailable — read state lasts for this session only */
  }
  listeners.forEach((l) => l());
};

/**
 * Notifications (Magnific rail footer): bell with a pink counter, 320px popover
 * listing generation results, shares and product news.
 */
export const NotificationsMenu = ({
  side = "right",
  align = "end",
  variant = "rail",
}: {
  side?: "right" | "bottom";
  align?: "start" | "center" | "end";
  variant?: "rail" | "header";
}) => {
  const navigate = useNavigate();
  const read = useSyncExternalStore(subscribe, getReadIds);
  // Real accounts have no notification feed yet — only the demo workspace shows samples.
  const items = (isDemoMode() ? sampleNotifications : []).map((n) => (n.unread && read.has(n.id) ? { ...n, unread: false } : n));
  const unread = items.filter((n) => n.unread).length;

  const markAllRead = () => markRead(items.filter((n) => n.unread).map((n) => n.id));

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              className={cn(variant === "rail" ? "rail-item" : "relative inline-flex size-8 items-center justify-center rounded-md text-foreground hover:bg-control transition-colors duration-fast", "relative")}
            >
              <Bell className={variant === "rail" ? "size-5" : "size-4"} strokeWidth={1.5} aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex min-w-3.5 h-3.5 items-center justify-center rounded-full bg-brand px-1 text-[8px] font-bold leading-none text-white ring-2 ring-card">
                  {unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side={side}>Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent side={side} align={align} sideOffset={10} className="w-80 p-0 rounded-lg shadow-overlay">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-heading-xs text-foreground">Notifications</p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 h-7 text-label-md text-muted-foreground hover:bg-control hover:text-foreground disabled:text-tertiary-foreground disabled:hover:bg-transparent transition-colors duration-fast"
            >
              <CheckCheck className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-md bg-control text-muted-foreground" aria-hidden="true">
              <BellOff className="size-4" strokeWidth={1.5} />
            </span>
            <p className="text-label-md text-foreground">You're all caught up</p>
            <p className="text-caption text-muted-foreground">Finished generations and updates will show up here.</p>
          </div>
        ) : (
          <ul className="max-h-[360px] overflow-y-auto px-2 pb-2">
            {items.map((n) => {
              const Icon = kindIcon[n.kind];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      markRead([n.id]);
                      if (n.kind === "done") navigate("/");
                      if (n.kind === "tip") navigate("/explore");
                      if (n.kind === "credits") navigate("/usage");
                    }}
                    className="flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-control transition-colors duration-fast"
                  >
                    {n.image ? (
                      <img src={mockImage(n.image)} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-control text-foreground">
                        <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-label-md text-foreground truncate">{n.title}</span>
                      <span className="block text-caption text-muted-foreground truncate">{n.body}</span>
                      <span className="block text-caption text-tertiary-foreground">{relativeTime(n.createdAt)}</span>
                    </span>
                    {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
