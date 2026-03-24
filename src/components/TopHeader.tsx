import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface TopHeaderProps {
  userEmail?: string;
  onSignOut: () => void;
  onMenuClick?: () => void;
}

export const TopHeader = ({ userEmail, onSignOut, onMenuClick }: TopHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-5 bg-background border-b border-border/60">
      {/* Left: Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg lg:hidden"
        onClick={() => onMenuClick?.()}
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg px-3 h-8 text-xs text-muted-foreground hover:text-foreground font-medium"
          onClick={() => navigate("/cloud-files")}
        >
          Library
        </Button>

        <ThemeToggle />
        <div className="w-px h-5 bg-border/60" />

        <Avatar
          className="h-8 w-8 cursor-pointer ring-1 ring-border/50"
          onClick={onSignOut}
        >
          <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
            {userEmail?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
