import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Coins, Share2, Sparkles, Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { mockImage, relativeTime, sampleNotifications, type SampleNotification } from "@/data/mock";
import { cn } from "@/lib/utils";

const kindIcon: Record<SampleNotification["kind"], typeof Bell> = {
  done: Sparkles,
  shared: Share2,
  tip: Lightbulb,
  credits: Coins,
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
  const [items, setItems] = useState(sampleNotifications);
  const unread = items.filter((n) => n.unread).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, unread: false })));

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
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="inline-flex items-center gap-1 rounded-md px-2 h-7 text-label-md text-muted-foreground hover:bg-control hover:text-foreground disabled:text-tertiary-foreground disabled:hover:bg-transparent transition-colors duration-fast"
          >
            <CheckCheck className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            Mark all read
          </button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto px-2 pb-2">
          {items.map((n) => {
            const Icon = kindIcon[n.kind];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
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
      </PopoverContent>
    </Popover>
  );
};
