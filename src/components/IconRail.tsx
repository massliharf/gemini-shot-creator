import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Paintbrush, Eye, FileText, Menu, Layers } from "lucide-react";

export const navItems = [
  { icon: Paintbrush, label: "Styles", path: "/styles" },
  { icon: Eye, label: "Packs", path: "/" },
  { icon: Layers, label: "Pack Generator", path: "/generator" },
  { icon: FileText, label: "My Library", path: "/cloud-files" },
];

export const IconRail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="w-16 h-full flex-shrink-0 bg-black flex flex-col items-center py-2 px-2">
      {/* Hamburger Menu */}
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-xl mb-3 text-gray-400 hover:text-white hover:bg-gray-800"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Navigation Icons */}
      <div className="flex flex-col items-center gap-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-12 w-12 rounded-xl transition-all ${
                    isActive
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
};
