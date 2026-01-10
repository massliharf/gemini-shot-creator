import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

// Components
import { TopHeader } from "@/components/TopHeader";
import { IconRail } from "@/components/IconRail";
import { PackList, PackInfo } from "@/components/PackList";
import { PackHeader } from "@/components/PackHeader";
import { ScenesGrid } from "@/components/ScenesGrid";
import { BottomBar } from "@/components/BottomBar";
import { CloudOperationProgress } from "@/components/CloudOperationProgress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

// Hooks
import { usePacks } from "@/hooks/usePacks";
import { useReferenceImages } from "@/hooks/useReferenceImages";
import { useGenerationSettings } from "@/hooks/useGenerationSettings";
import { useGeneration } from "@/hooks/useGeneration";
import { useDownload } from "@/hooks/useDownload";
import { useCloudOperations } from "@/hooks/useCloudOperations";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    handlePacksLoad,
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

  const {
    generateSingleScene,
    generatePackScenes,
    generateAllPacks,
  } = useGeneration({
    user,
    packs,
    setPacks,
    referenceImage,
    referenceImage2: coupleMode ? secondReferenceImage : undefined,
    selectedModel,
    aspectRatio,
    imageSize: resolution,
    resolution,
  });

  const {
    downloadScene,
    downloadPackAsZip,
    downloadMultiplePacks,
  } = useDownload({ packs, selectedPackId });

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

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

      <div className="h-screen bg-muted/30 flex flex-col overflow-hidden">
        {/* Top Header */}
        <TopHeader
          userEmail={user.email}
          onSignOut={handleSignOut}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden p-4 pt-0 gap-4">
          {/* Icon Rail - Desktop */}
          <div className="hidden lg:block">
            <IconRail />
          </div>

          {/* Pack Sidebar - Desktop */}
          <aside className="hidden lg:flex w-[280px] min-w-[260px] bg-card rounded-2xl border border-border/50 flex-col overflow-hidden">
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
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[300px] p-0 bg-card overflow-hidden">
              <PackList
                packs={packInfos}
                selectedPackId={selectedPackId}
                onSelectPack={(packId) => {
                  setSelectedPackId(packId);
                  setSidebarOpen(false);
                }}
                onDeletePack={deletePack}
                onDeleteMultiplePacks={deleteMultiplePacks}
                onDownloadMultiplePacks={downloadMultiplePacks}
                onGenerateAllPacks={handleGenerateAllPacks}
                isGeneratingAll={isGeneratingAll}
              />
            </SheetContent>
          </Sheet>

          {/* Main Content Area */}
          <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col min-w-0">
            {selectedPack ? (
              <>
                {/* Pack Header */}
                <PackHeader
                  pack={selectedPack.pack}
                  completedCount={selectedPack.scenes.filter(s => s.status === 'success').length}
                  onRegenerate={() => selectedPackId && generatePackScenes(selectedPackId)}
                  onDelete={() => selectedPackId && deletePack(selectedPackId)}
                  onDownload={() => selectedPackId && downloadPackAsZip(selectedPackId)}
                  isGenerating={selectedPack.isGenerating}
                />

                {/* Scenes Grid */}
                <div className="flex-1 overflow-y-auto pb-24">
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
                  <p className="text-sm text-muted-foreground mb-4">
                    Create stunning images with AI
                  </p>
                  <Button
                    variant="outline"
                    className="lg:hidden rounded-xl"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="w-4 h-4 mr-2" />
                    Open Menu
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Bottom Bar */}
        <BottomBar
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
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
        />
      </div>
    </>
  );
};

export default Index;
