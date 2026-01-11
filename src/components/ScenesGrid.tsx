import { useEffect, useMemo, useRef, useState } from "react";
import { SceneWithStatus } from "@/types/pack";
import { SceneCard } from "./SceneCard";
import { FullscreenImageView } from "./FullscreenImageView";
import { RegenerateConfirmDialog } from "./RegenerateConfirmDialog";

interface ScenesGridProps {
  scenes: SceneWithStatus[];
  onGenerateScene: (sceneId: string | number) => void;
  onDownloadScene: (sceneId: string | number) => void;
}

const GAP_PX = 4; // gap-1
const PADDING_PX = 4; // p-1

const getSceneId = (scene: SceneWithStatus): string | number => {
  return scene.id ?? "0";
};

// Preload image and get its aspect ratio
const getImageAspectRatio = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(1);
    img.src = url;
  });
};

const getTargetRows = (count: number) => {
  if (count <= 2) return 1;
  if (count <= 6) return 2;
  if (count <= 12) return 3;
  return 4;
};

type LayoutRow = Array<{ scene: SceneWithStatus; index: number; id: string | number; ar: number; hasImage: boolean }>;

export const ScenesGrid = ({ scenes, onGenerateScene, onDownloadScene }: ScenesGridProps) => {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState<{ open: boolean; sceneId: string | number | null }>(
    { open: false, sceneId: null },
  );
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Observe container size (so we can compute pixel-perfect layout)
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load aspect ratios for all images
  useEffect(() => {
    const loadAspectRatios = async () => {
      const newRatios: Record<string, number> = {};
      await Promise.all(
        scenes.map(async (scene) => {
          const id = String(getSceneId(scene));
          if (scene.status === "success" && scene.imageUrl && !aspectRatios[id]) {
            newRatios[id] = await getImageAspectRatio(scene.imageUrl);
          }
        }),
      );

      if (Object.keys(newRatios).length) {
        setAspectRatios((prev) => ({ ...prev, ...newRatios }));
      }
    };

    loadAspectRatios();
    // intentionally NOT depending on aspectRatios to avoid reloading already loaded items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes]);

  const successfulScenes = scenes.filter((s) => s.status === "success" && s.imageUrl);
  const currentFullscreenScene = fullscreenIndex !== null ? successfulScenes[fullscreenIndex] : null;

  const handleOpenFullscreen = (scene: SceneWithStatus) => {
    const idx = successfulScenes.findIndex((s) => getSceneId(s) === getSceneId(scene));
    if (idx !== -1) setFullscreenIndex(idx);
  };

  const handlePrevious = () => {
    if (fullscreenIndex !== null && fullscreenIndex > 0) setFullscreenIndex(fullscreenIndex - 1);
  };

  const handleNext = () => {
    if (fullscreenIndex !== null && fullscreenIndex < successfulScenes.length - 1) setFullscreenIndex(fullscreenIndex + 1);
  };

  const handleRegenerateClick = (sceneId: string | number, hasExistingImage: boolean) => {
    if (hasExistingImage) setRegenerateConfirm({ open: true, sceneId });
    else onGenerateScene(sceneId);
  };

  const handleConfirmRegenerate = () => {
    if (regenerateConfirm.sceneId !== null) onGenerateScene(regenerateConfirm.sceneId);
    setRegenerateConfirm({ open: false, sceneId: null });
  };

  const layout = useMemo(() => {
    const width = containerSize.width;
    const height = containerSize.height;

    const contentW = Math.max(0, width - PADDING_PX * 2);
    const contentH = Math.max(0, height - PADDING_PX * 2);

    if (!contentW || !contentH || scenes.length === 0) {
      return { rows: [] as LayoutRow[], rowHeights: [] as number[], contentW, contentH };
    }

    const rowsCount = getTargetRows(scenes.length);

    const items = scenes.map((scene, index) => {
      const id = getSceneId(scene);
      const hasImage = scene.status === "success" && !!scene.imageUrl;
      const ar = hasImage ? aspectRatios[String(id)] ?? 1 : 1;
      return { scene, index, id, ar, hasImage };
    });

    // Greedy partition by total aspect-ratio mass (Google Photos-ish)
    const totalAR = items.reduce((sum, it) => sum + Math.max(0.35, Math.min(3.0, it.ar)), 0);
    const targetARPerRow = totalAR / rowsCount;

    const rows: LayoutRow[] = [];
    let current: LayoutRow = [];
    let currentAR = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const boundedAR = Math.max(0.35, Math.min(3.0, it.ar));
      const remainingItems = items.length - i;
      const remainingRows = rowsCount - rows.length;

      current.push(it);
      currentAR += boundedAR;

      // force at least 1 item per remaining row
      const mustClose = remainingItems <= remainingRows;
      const shouldClose = currentAR >= targetARPerRow && remainingRows > 1;

      if (mustClose || shouldClose) {
        rows.push(current);
        current = [];
        currentAR = 0;
      }
    }
    if (current.length) rows.push(current);

    // If we ended with fewer rows, spread by moving items (edge case)
    while (rows.length < rowsCount && rows.length > 0) {
      const largestRowIdx = rows.reduce((best, r, idx) => (r.length > rows[best].length ? idx : best), 0);
      const moved = rows[largestRowIdx].pop();
      if (!moved) break;
      rows.push([moved]);
    }

    // Compute justified row heights from width: rowHeight = availableWidth / sumAR
    const rawHeights = rows.map((row) => {
      const sumAR = row.reduce((sum, it) => sum + Math.max(0.35, Math.min(3.0, it.ar)), 0);
      const availableW = contentW - GAP_PX * (row.length - 1);
      return Math.max(60, availableW / Math.max(0.001, sumAR));
    });

    // Scale all rows to fit container height exactly (no scroll)
    const availableH = contentH - GAP_PX * (rawHeights.length - 1);
    const totalRawH = rawHeights.reduce((s, h) => s + h, 0);
    const scale = totalRawH > 0 ? availableH / totalRawH : 1;

    const rowHeights = rawHeights.map((h) => Math.max(48, h * scale));

    return { rows, rowHeights, contentW, contentH };
  }, [aspectRatios, containerSize.height, containerSize.width, scenes]);

  return (
    <>
      <RegenerateConfirmDialog
        open={regenerateConfirm.open}
        onOpenChange={(open) => setRegenerateConfirm({ ...regenerateConfirm, open })}
        onConfirm={handleConfirmRegenerate}
        sceneId={regenerateConfirm.sceneId ?? undefined}
      />

      <div ref={containerRef} className="h-full w-full overflow-hidden">
        <div className="h-full w-full p-1">
          <div className="flex h-full w-full flex-col" style={{ gap: GAP_PX }}>
            {layout.rows.map((row, rowIndex) => {
              const rowH = layout.rowHeights[rowIndex] ?? 0;
              const sumAR = row.reduce((sum, it) => sum + Math.max(0.35, Math.min(3.0, it.ar)), 0);

              const availableW = (layout.contentW ?? 0) - GAP_PX * (row.length - 1);
              const naturalW = rowH * sumAR;
              const widthScale = naturalW > 0 ? availableW / naturalW : 1;

              return (
                <div key={rowIndex} className="flex w-full" style={{ gap: GAP_PX, height: rowH }}>
                  {row.map(({ scene, index, id, ar, hasImage }) => {
                    const boundedAR = Math.max(0.35, Math.min(3.0, ar));
                    const w = rowH * boundedAR * widthScale;

                    return (
                      <div key={id} className="relative flex-shrink-0" style={{ width: w, height: rowH }}>
                        <SceneCard
                          scene={scene}
                          index={index}
                          onGenerate={() => handleRegenerateClick(id, hasImage)}
                          onDownload={() => onDownloadScene(id)}
                          onClick={() => hasImage && handleOpenFullscreen(scene)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <FullscreenImageView
        isOpen={fullscreenIndex !== null}
        onClose={() => setFullscreenIndex(null)}
        imageUrl={currentFullscreenScene?.imageUrl || null}
        sceneName={currentFullscreenScene?.title}
        sceneId={currentFullscreenScene ? getSceneId(currentFullscreenScene) : undefined}
        onDownload={() => currentFullscreenScene && onDownloadScene(getSceneId(currentFullscreenScene))}
        onRegenerate={() => {
          if (currentFullscreenScene) handleRegenerateClick(getSceneId(currentFullscreenScene), true);
        }}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={fullscreenIndex !== null && fullscreenIndex > 0}
        hasNext={fullscreenIndex !== null && fullscreenIndex < successfulScenes.length - 1}
      />
    </>
  );
};


