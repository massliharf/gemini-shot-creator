import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton motion-reduce:animate-pulse", className)} {...props} />;
}

export { Skeleton };
