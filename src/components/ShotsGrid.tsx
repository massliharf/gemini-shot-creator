import { SceneWithStatus } from "@/types/pack";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle2, AlertCircle, Loader2, Clock, Download, Image as ImageIcon } from "lucide-react";

interface ShotsGridProps {
  shots: SceneWithStatus[];
  onGenerateShot: (sceneId: string | number) => void;
  onDownloadShot: (sceneId: string | number) => void;
}

// Helper to get scene ID from either v3 or legacy format
const getSceneId = (scene: any): string | number => {
  return scene.id ?? scene.scene_id ?? '0';
};

// Helper to get display name from either v3 or legacy format
const getSceneName = (scene: any): string => {
  return scene.name || scene.title || scene.type || 'Untitled Scene';
};

export const ShotsGrid = ({ shots, onGenerateShot, onDownloadShot }: ShotsGridProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'generating':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-foreground/10 text-foreground border-foreground/30';
      case 'generating':
        return 'bg-foreground/5 text-foreground border-foreground/20';
      case 'error':
        return 'bg-foreground/5 text-foreground/60 border-foreground/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
      {shots.map((scene) => {
        const sceneId = getSceneId(scene);
        const sceneName = getSceneName(scene);
        
        return (
          <Card
            key={sceneId}
            className="bg-card border-border overflow-hidden hover:border-foreground/40 transition-colors"
          >
            {/* Image Area */}
            <div className="aspect-[4/5] relative bg-muted/10">
              {scene.imageUrl ? (
                <img
                  src={scene.imageUrl}
                  alt={sceneName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                </div>
              )}
              
              {/* Status Badge Overlay */}
              <div className="absolute top-1 left-1">
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1 py-0 h-4 ${getStatusColor(scene.status)}`}
                >
                  <span className="mr-0.5">{getStatusIcon(scene.status)}</span>
                  {scene.status}
                </Badge>
              </div>

              {/* Scene Number Badge */}
              <div className="absolute top-1 right-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-background/80 border-border">
                  #{sceneId}
                </Badge>
              </div>
            </div>

            {/* Info & Controls */}
            <div className="p-1.5 space-y-1">
              <div>
                <h4 className="font-medium text-[11px] leading-tight line-clamp-1">
                  {sceneName}
                </h4>
              {scene.prompt && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {scene.prompt.substring(0, 50)}...
                  </p>
                )}
              </div>

              {scene.error && (
                <div className="p-1 bg-muted/50 border border-border">
                  <p className="text-[9px] text-muted-foreground line-clamp-1">
                    {scene.error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-1">
                {(scene.status === 'idle' || scene.status === 'error') && (
                  <Button
                    onClick={() => onGenerateShot(sceneId)}
                    size="sm"
                    className="flex-1 h-6 text-[10px] px-1"
                  >
                    <Play className="w-3 h-3 mr-0.5" />
                    Gen
                  </Button>
                )}
                
                {scene.status === 'success' && scene.imageUrl && (
                  <>
                    <Button
                      onClick={() => onGenerateShot(sceneId)}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-6 text-[10px] px-1"
                    >
                      <Play className="w-3 h-3 mr-0.5" />
                      Regen
                    </Button>
                    <Button
                      onClick={() => onDownloadShot(sceneId)}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-6 text-[10px] px-1"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </>
                )}

                {scene.status === 'generating' && (
                  <Button
                    size="sm"
                    disabled
                    className="flex-1 h-6 text-[10px] px-1"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
