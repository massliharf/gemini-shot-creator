import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { getPackGender } from "@/types/pack";

// Components
import { AppLayout } from "@/components/AppLayout";
import { PackList } from "@/components/PackList";
import { PackHeader } from "@/components/PackHeader";
import { ScenesGrid } from "@/components/ScenesGrid";
import { BottomBar } from "@/components/BottomBar";
import { CloudOperationProgress } from "@/components/CloudOperationProgress";

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
  } = usePacks(user);

  const {
    referenceImage,
    referencePreviewUrl,
    secondReferenceImage,
    secondReferencePreviewUrl,
    coupleMode,
    setCoupleMode,
    handleImageUpload,
    handleImageClear,
    handleSecondImageUpload,
    handleSecondImageClear,
    clearAll: clearReferenceImages,
  } = useReferenceImages();

  const {
    selectedModel,
    setSelectedModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
  } = useGenerationSettings();

  // Determine if current pack is unisex
  const selectedPackGender = selectedPack ? getPackGender(selectedPack.pack) : null;
  const isUnisexPack = selectedPackGender === "unisex";

  const { generateSingleScene, generatePackScenes, generateAllPacks } = useGeneration({
    user,
    packs,
    setPacks,
    referenceImage,
    referenceImage2: coupleMode ? secondReferenceImage : undefined,
    selectedModel,
    aspectRatio,
    imageSize: resolution,
    resolution,
    generationGender: isUnisexPack ? generationGender : undefined,
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const packInfos = getPackInfos();
  const canGenerate = selectedPack !== null && referenceImage !== null;

  return (
    <>
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

              <div className="flex-1 min-h-0 overflow-hidden pb-24">
                <ScenesGrid
                  scenes={selectedPack.scenes}
                  onGenerateScene={(sceneId) => generateSingleScene(selectedPackId!, sceneId)}
                  onDownloadScene={downloadScene}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                <h3 className="text-lg font-medium text-foreground/80 mb-2">
                  {packs.size === 0 ? "Start by uploading a pack" : "Select a pack"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Create stunning images with AI</p>
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
          coupleMode={coupleMode}
          onCoupleModeChange={setCoupleMode}
          previewUrl={referencePreviewUrl}
          secondPreviewUrl={secondReferencePreviewUrl}
          onImageUpload={handleImageUpload}
          onImageClear={handleImageClear}
          onSecondImageUpload={handleSecondImageUpload}
          onSecondImageClear={handleSecondImageClear}
          onGenerate={() => selectedPackId && generatePackScenes(selectedPackId)}
          isGenerating={selectedPack?.isGenerating || false}
          canGenerate={canGenerate}
          isUnisexPack={isUnisexPack}
          generationGender={generationGender}
          onGenerationGenderChange={setGenerationGender}
        />
      </AppLayout>
    </>
  );
};

export default Index;

