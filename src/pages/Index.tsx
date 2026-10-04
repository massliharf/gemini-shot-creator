import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Loader2, MousePointerClick, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { isDemoMode, DEMO_MESSAGE } from "@/lib/demo";

// Components
import { AppLayout } from "@/components/AppLayout";
import { PackList } from "@/components/PackList";
import { PackHeader } from "@/components/PackHeader";
import { ScenesGrid } from "@/components/ScenesGrid";
import { BottomBar } from "@/components/BottomBar";
import { CloudOperationProgress } from "@/components/CloudOperationProgress";
import { TextImageChat } from "@/components/TextImageChat";
import { SampleNotice } from "@/components/SampleNotice";
import { PacksStartView } from "@/components/packs/PacksStartView";
import { PackUploadDialog } from "@/components/packs/PackUploadDialog";
import { PackSwitcher } from "@/components/packs/PackSwitcher";
import { safePackGender, safePackId } from "@/components/packs/packMeta";
import { Button } from "@/components/ui/button";

// Hooks
import { usePacks } from "@/hooks/usePacks";
import { useReferenceImages } from "@/hooks/useReferenceImages";
import { useGenerationSettings } from "@/hooks/useGenerationSettings";
import { useGeneration } from "@/hooks/useGeneration";
import { useDownload } from "@/hooks/useDownload";
import { useCloudOperations } from "@/hooks/useCloudOperations";

type GenerationGender = "male" | "female";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationGender, setGenerationGender] = useState<GenerationGender>("female");
  const [textGenOpen, setTextGenOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPackId = searchParams.get("pack");
  const demo = isDemoMode();

  // Custom Hooks
  const {
    packs,
    setPacks,
    packsStatus,
    reloadPacks,
    selectedPackId,
    setSelectedPackId,
    selectedPack,
    isGeneratingAll,
    setIsGeneratingAll,
    deletePack,
    deleteMultiplePacks,
    getPackInfos,
    handlePacksLoad,
  } = usePacks(user);

  const {
    images,
    referenceImage,
    handleImageUpload,
    handleImageClear,
    addImageSlot,
    clearAll: clearReferenceImages,
    maxImages,
    hasValidReferenceImage,
  } = useReferenceImages();

  const {
    selectedModel,
    setSelectedModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    generationMode,
    setGenerationMode,
  } = useGenerationSettings();

  // Determine if current pack is unisex
  const selectedPackGender = selectedPack ? safePackGender(selectedPack.pack) : null;
  const isUnisexPack = selectedPackGender === "unisex";

  const { generateSingleScene, generatePackScenes, generateAllPacks } = useGeneration({
    user,
    packs,
    setPacks,
    referenceImages: images,
    selectedModel,
    aspectRatio,
    imageSize: resolution,
    resolution,
    generationGender: isUnisexPack ? generationGender : undefined,
    generationMode,
  });

  const { downloadScene, downloadPackAsZip, downloadMultiplePacks } = useDownload({
    packs,
    selectedPackId,
  });

  const {
    cloudOperation,
    handleCloudOperationClose,
    handleCloudOperationPause,
    handleCloudOperationResume,
    handleCloudOperationConfirm,
  } = useCloudOperations({
    user,
    packs,
    setPacks,
    setSelectedPackId,
    clearReferenceImages,
  });

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Deep link: "/?pack=<id>" opens that pack once the real list has loaded, then drops the param.
  useEffect(() => {
    if (!requestedPackId || packsStatus !== "ready") return;
    const match = packs.has(requestedPackId)
      ? requestedPackId
      : Array.from(packs.values()).find((p) => safePackId(p.pack) === requestedPackId)?.packId;
    if (match) setSelectedPackId(match);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("pack");
        return next;
      },
      { replace: true },
    );
  }, [requestedPackId, packsStatus, packs, setSelectedPackId, setSearchParams]);

  /** Demo workspace can browse sample packs but not generate — explain instead of failing. */
  const blockedInDemo = () => {
    if (!isDemoMode()) return false;
    toast.info(DEMO_MESSAGE);
    return true;
  };

  const handleGeneratePack = () => {
    if (blockedInDemo() || !selectedPackId) return;
    generatePackScenes(selectedPackId);
  };

  const handleGenerateAllPacks = async () => {
    if (blockedInDemo()) return;
    setIsGeneratingAll(true);
    await generateAllPacks();
    setIsGeneratingAll(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-body-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const packInfos = getPackInfos();
  const canGenerate = selectedPack !== null;

  return (
    <>
      <TextImageChat open={textGenOpen} onOpenChange={setTextGenOpen} />
      <CloudOperationProgress
        state={cloudOperation}
        onClose={handleCloudOperationClose}
        onPause={handleCloudOperationPause}
        onResume={handleCloudOperationResume}
        onConfirmContinue={handleCloudOperationConfirm}
      />

      <AppLayout
        userEmail={user.email}
        sidebar={
          <PackList
            packs={packInfos}
            selectedPackId={selectedPackId}
            onSelectPack={setSelectedPackId}
            onDeletePack={deletePack}
            onDeleteMultiplePacks={deleteMultiplePacks}
            onDownloadMultiplePacks={downloadMultiplePacks}
            onGenerateAllPacks={handleGenerateAllPacks}
            isGeneratingAll={isGeneratingAll}
            onPacksLoad={handlePacksLoad}
            onOpenTextGen={() => setTextGenOpen(true)}
            packsStatus={packsStatus}
          />
        }
      >
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-background">
          {selectedPack ? (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-28">
              {demo && (
                <div className="px-4 md:px-8 pt-4">
                  <SampleNotice>
                    <span className="sm:hidden">Sign in to make your own.</span>
                    <span className="hidden sm:inline">Sample packs — sign in to upload your own and generate.</span>
                  </SampleNotice>
                </div>
              )}

              <PackSwitcher
                className="lg:hidden pt-4"
                packs={packInfos}
                selectedPackId={selectedPackId}
                onSelectPack={setSelectedPackId}
              />

              <PackHeader
                pack={selectedPack.pack}
                completedCount={selectedPack.scenes.filter((s) => s.status === "success").length}
                onRegenerate={handleGeneratePack}
                onDelete={() => selectedPackId && deletePack(selectedPackId)}
                onDownload={() => selectedPackId && downloadPackAsZip(selectedPackId)}
                isGenerating={selectedPack.isGenerating}
              />

              <div className="px-4 md:px-8">
                <ScenesGrid
                  scenes={selectedPack.scenes}
                  onGenerateScene={(sceneId) => {
                    if (blockedInDemo()) return;
                    generateSingleScene(selectedPackId!, sceneId);
                  }}
                  onDownloadScene={downloadScene}
                />
              </div>
            </div>
          ) : packs.size === 0 && packsStatus === "loading" ? (
            <div className="h-full flex items-center justify-center px-4 md:px-8" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-body-sm text-muted-foreground">Loading packs...</p>
              </div>
            </div>
          ) : packs.size === 0 && packsStatus === "error" ? (
            <div className="h-full flex items-center justify-center px-4 md:px-8">
              <div className="flex flex-col items-center text-center max-w-sm" role="alert">
                <AlertCircle className="size-5 text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="text-heading-md text-foreground mb-1">Couldn't load your packs</h2>
                <p className="text-body-sm text-muted-foreground mb-4">Check your connection and try again.</p>
                <Button variant="outline" className="h-control-lg md:h-control-md" onClick={reloadPacks}>
                  <RefreshCw strokeWidth={1.5} aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          ) : packs.size === 0 ? (
            <PacksStartView
              onUpload={() => setUploadOpen(true)}
              onCreate={() => navigate("/pack-creator")}
              onBrowse={() => navigate("/explore")}
            />
          ) : (
            <div className="h-full flex items-center justify-center px-4 md:px-8">
              <div className="flex flex-col items-center text-center max-w-sm">
                <MousePointerClick className="size-5 text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="text-heading-md text-foreground mb-1">Select a pack</h2>
                <p className="text-body-sm text-muted-foreground">Pick a pack from the list to see its scenes.</p>
              </div>
            </div>
          )}
        </main>

        <PackUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onPacksLoad={handlePacksLoad} />

        {packs.size > 0 && (
          <BottomBar
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            resolution={resolution}
            onResolutionChange={setResolution}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            images={images}
            onImageUpload={handleImageUpload}
            onImageClear={handleImageClear}
            onAddImageSlot={addImageSlot}
            maxImages={maxImages}
            onGenerate={handleGeneratePack}
            isGenerating={selectedPack?.isGenerating || false}
            canGenerate={canGenerate}
            isUnisexPack={isUnisexPack}
            generationGender={generationGender}
            onGenerationGenderChange={setGenerationGender}
            generationMode={generationMode}
            onGenerationModeChange={setGenerationMode}
          />
        )}
      </AppLayout>
    </>
  );
};

export default Index;

