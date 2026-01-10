import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Paintbrush, Eye, FileText, Menu } from "lucide-react";

const navItems = [
  { icon: Paintbrush, label: "Styles", path: "/styles" },
  { icon: Eye, label: "Generator", path: "/" },
  { icon: FileText, label: "My Library", path: "/cloud-files" },
];

export const IconRail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="w-14 flex-shrink-0 bg-background flex flex-col items-center pt-4">
      {/* Hamburger Menu */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-lg mb-6 text-foreground hover:bg-muted"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Navigation Icons */}
      <div className="flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-amber-400 text-foreground hover:bg-amber-400' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
      </div>
    </nav>
  );
};
