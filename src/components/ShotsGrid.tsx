import { SceneWithStatus } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle2, XCircle, Loader2, Clock, Download, Image as ImageIcon, RefreshCw } from "lucide-react";

interface ShotsGridProps {
  shots: SceneWithStatus[];
  onGenerateShot: (sceneId: string | number) => void;
  onDownloadShot: (sceneId: string | number) => void;
}

const getSceneId = (scene: any): string | number => {
  return scene.id ?? scene.scene_id ?? '0';
};

const getSceneName = (scene: any): string => {
  return scene.name || scene.title || scene.type || 'Untitled Scene';
};

export const ShotsGrid = ({ shots, onGenerateShot, onDownloadShot }: ShotsGridProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 aria-hidden="true" />;
      case 'generating': return <Loader2 className="animate-spin" aria-hidden="true" />;
      case 'error': return <XCircle aria-hidden="true" />;
      default: return <Clock aria-hidden="true" />;
    }
  };

  const getStatusVariant = (status: string): "success" | "default" | "danger" => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'danger';
      default: return 'default';
    }
  };

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 list-none m-0 p-0">
      {shots.map((scene) => {
        const sceneId = getSceneId(scene);
        const sceneName = getSceneName(scene);

        return (
          <li
            key={sceneId}
            className="group bg-card text-card-foreground rounded-md overflow-hidden transition-colors duration-fast ease-standard"
          >
            {/* Image Area */}
            <div className="aspect-[4/5] relative bg-control">
              {scene.imageUrl ? (
                <img
                  src={scene.imageUrl}
                  alt={sceneName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : scene.status === 'generating' ? (
                <div className="w-full h-full skeleton rounded-none" aria-hidden="true" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="size-6 text-tertiary-foreground" strokeWidth={1.5} aria-hidden="true" />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                <Badge variant={getStatusVariant(scene.status)} className="bg-card/90 backdrop-blur-sm">
                  {getStatusIcon(scene.status)}
                  <span className="capitalize">{scene.status}</span>
                </Badge>
              </div>

              {/* Scene Number */}
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="bg-card/90 backdrop-blur-sm">
                  #{sceneId}
                </Badge>
              </div>
            </div>

            {/* Info & Controls */}
            <div className="p-3 space-y-2 bg-card">
              <div>
                <h4 className="text-label-md text-foreground leading-tight line-clamp-1">
                  {sceneName}
                </h4>
                {scene.prompt && (
                  <p className="text-caption text-muted-foreground line-clamp-1 mt-0.5">
                    {scene.prompt.substring(0, 50)}...
                  </p>
                )}
              </div>

              {scene.error && (
                <div className="p-2 bg-danger-bg rounded-md flex items-start gap-1.5" role="alert">
                  <XCircle className="size-4 shrink-0 text-danger-text mt-px" strokeWidth={1.5} aria-hidden="true" />
                  <p className="text-caption text-danger-text line-clamp-2">
                    {scene.error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {(scene.status === 'idle' || scene.status === 'error') && (
                  <Button
                    type="button"
                    onClick={() => onGenerateShot(sceneId)}
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                  >
                    <Play strokeWidth={1.5} aria-hidden="true" />
                    Gen
                  </Button>
                )}

                {scene.status === 'success' && scene.imageUrl && (
                  <>
                    <Button
                      type="button"
                      onClick={() => onGenerateShot(sceneId)}
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                    >
                      <RefreshCw strokeWidth={1.5} aria-hidden="true" />
                      Regen
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDownloadShot(sceneId)}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Download"
                      title="Download"
                    >
                      <Download strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </>
                )}

                {scene.status === 'generating' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled
                    className="flex-1"
                    aria-busy="true"
                  >
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Generating
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
