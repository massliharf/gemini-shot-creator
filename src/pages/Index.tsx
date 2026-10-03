import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { getPackGender } from "@/types/pack";

// Components
import { AppLayout } from "@/components/AppLayout";
import { PackList } from "@/components/PackList";
import { PackHeader } from "@/components/PackHeader";
import { ScenesGrid } from "@/components/ScenesGrid";
import { BottomBar } from "@/components/BottomBar";
import { CloudOperationProgress } from "@/components/CloudOperationProgress";
import { TextImageChat } from "@/components/TextImageChat";

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
  const navigate = useNavigate();

  // Custom Hooks
  const {
    packs,
    setPacks,
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
  const selectedPackGender = selectedPack ? getPackGender(selectedPack.pack) : null;
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

  const handleGenerateAllPacks = async () => {
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
          />
        }
      >
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-background">
          {selectedPack ? (
            <>
              <PackHeader
                pack={selectedPack.pack}
                completedCount={selectedPack.scenes.filter((s) => s.status === "success").length}
                onRegenerate={() => selectedPackId && generatePackScenes(selectedPackId)}
                onDelete={() => selectedPackId && deletePack(selectedPackId)}
                onDownload={() => selectedPackId && downloadPackAsZip(selectedPackId)}
                isGenerating={selectedPack.isGenerating}
              />

              <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-24">
                <ScenesGrid
                  scenes={selectedPack.scenes}
                  onGenerateScene={(sceneId) => generateSingleScene(selectedPackId!, sceneId)}
                  onDownloadScene={downloadScene}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center px-4 md:px-8">
              <div className="flex flex-col items-center text-center max-w-sm">
                <Sparkles className="size-5 text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="text-heading-md text-foreground mb-1">
                  {packs.size === 0 ? "Upload a pack to start" : "Select a pack"}
                </h2>
                <p className="text-body-sm text-muted-foreground">AI-powered image generation</p>
              </div>
            </div>
          )}
        </main>

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
          onGenerate={() => selectedPackId && generatePackScenes(selectedPackId)}
          isGenerating={selectedPack?.isGenerating || false}
          canGenerate={canGenerate}
          isUnisexPack={isUnisexPack}
          generationGender={generationGender}
          onGenerationGenderChange={setGenerationGender}
          generationMode={generationMode}
          onGenerationModeChange={setGenerationMode}
        />
      </AppLayout>
    </>
  );
};

export default Index;

