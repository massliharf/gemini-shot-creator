import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";

interface StylePack {
  id: string;
  name: string;
  sceneCount: number;
  thumbnailUrl?: string;
}

interface StyleCategory {
  name: string;
  packCount: number;
  packs: StylePack[];
}

// Demo data - in production this would come from your database
const DEMO_CATEGORIES: StyleCategory[] = [
  {
    name: "Photography",
    packCount: 32,
    packs: Array.from({ length: 16 }, (_, i) => ({
      id: `photo-${i}`,
      name: "Pack Name",
      sceneCount: 12,
      thumbnailUrl: i === 0 ? undefined : undefined, // First one could have a thumbnail
    })),
  },
  {
    name: "Photography",
    packCount: 32,
    packs: Array.from({ length: 16 }, (_, i) => ({
      id: `photo2-${i}`,
      name: "Pack Name",
      sceneCount: 12,
    })),
  },
  {
    name: "Photography",
    packCount: 32,
    packs: Array.from({ length: 8 }, (_, i) => ({
      id: `photo3-${i}`,
      name: "Pack Name",
      sceneCount: 12,
    })),
  },
];

function StylePackCard({ pack, isSelected, onSelect }: { 
  pack: StylePack; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group flex flex-col text-left transition-all ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-2xl' : ''
      }`}
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted border border-border mb-2">
        {pack.thumbnailUrl ? (
          <img 
            src={pack.thumbnailUrl} 
            alt={pack.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Name overlay for packs with thumbnails */}
        {pack.thumbnailUrl && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-sm font-semibold text-white">{pack.name}</p>
            <p className="text-xs text-white/80">{pack.sceneCount} Scenes</p>
          </div>
        )}
      </div>
      
      {/* Name below for packs without thumbnails */}
      {!pack.thumbnailUrl && (
        <div>
          <p className="text-sm font-medium text-foreground">{pack.name}</p>
          <p className="text-xs text-muted-foreground">{pack.sceneCount} Scenes</p>
        </div>
      )}
    </button>
  );
}

function CategorySection({ category }: { category: StyleCategory }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{category.name}</h2>
        <p className="text-sm text-muted-foreground">{category.packCount} Packs</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {category.packs.map((pack) => (
          <StylePackCard 
            key={pack.id} 
            pack={pack} 
            isSelected={false}
            onSelect={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

export default function Styles() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || "");
      }
    });
  }, [navigate]);

  const totalPacks = DEMO_CATEGORIES.reduce((acc, cat) => acc + cat.packCount, 0);

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Styles</h1>
          <p className="text-sm text-muted-foreground">{totalPacks} Packs</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-8">
          {DEMO_CATEGORIES.map((category, index) => (
            <CategorySection key={index} category={category} />
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <Button 
            variant="outline" 
            size="lg"
            className="rounded-full px-8 h-12 text-sm font-medium bg-background border-border shadow-md"
          >
            GENERATE
          </Button>
          <Button 
            size="lg"
            className="rounded-full px-8 h-12 text-sm font-medium shadow-md"
          >
            ADD
          </Button>
        </div>
      </main>
    </AppLayout>
  );
}
