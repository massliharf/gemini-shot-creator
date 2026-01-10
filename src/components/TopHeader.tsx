import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpCircle, Menu } from "lucide-react";

interface TopHeaderProps {
  userEmail?: string;
  onSignOut: () => void;
  onMenuClick?: () => void;
}

export const TopHeader = ({ userEmail, onSignOut, onMenuClick }: TopHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Logo & Menu */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 rounded-lg"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-xl font-bold tracking-tight">Lumra</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4 h-9"
          onClick={() => navigate("/cloud-files")}
        >
          My Library
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="rounded-full px-3 h-9 font-semibold"
        >
          PRO
        </Button>

        <Avatar
          className="h-9 w-9 cursor-pointer ring-2 ring-primary/20"
          onClick={onSignOut}
        >
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {userEmail?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
