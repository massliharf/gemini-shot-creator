import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpCircle } from "lucide-react";

interface TopHeaderProps {
  userEmail?: string;
  onSignOut: () => void;
  onMenuClick?: () => void;
}

export const TopHeader = ({ userEmail, onSignOut }: TopHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 flex items-center justify-end px-4 lg:px-6 bg-background">
      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-5 h-9 border-border font-medium"
          onClick={() => navigate("/cloud-files")}
        >
          My Library
        </Button>

        <Button
          size="sm"
          className="rounded-full px-5 h-9 bg-foreground text-background hover:bg-foreground/90 font-semibold"
        >
          PRO
        </Button>

        <Avatar
          className="h-10 w-10 cursor-pointer border-2 border-background shadow-sm"
          onClick={onSignOut}
        >
          <AvatarImage src="" />
          <AvatarFallback className="bg-rose-400 text-white text-sm font-medium">
            {userEmail?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
