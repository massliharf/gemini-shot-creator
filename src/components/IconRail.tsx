import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Wand2, FolderOpen, Palette } from "lucide-react";

const navItems = [
  { icon: Palette, label: "Styles", path: "/styles" },
  { icon: Sparkles, label: "Generator", path: "/" },
  { icon: Wand2, label: "Pack Editor", path: "/pack-editor" },
  { icon: FolderOpen, label: "Cloud Files", path: "/cloud-files" },
];

export const IconRail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="w-14 flex-shrink-0 bg-secondary/30 flex flex-col items-center py-4 border-r border-border">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        return (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-xl mb-1 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
};
