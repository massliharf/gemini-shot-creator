import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPackName, getPackDescription, formatCost } from "@/types/pack";

// Components
import { ImageGrid } from "@/components/ImageGrid";
import { PackSidebar } from "@/components/PackSidebar";
import { ControlsBar } from "@/components/ControlsBar";
import { CloudOperationProgress } from "@/components/CloudOperationProgress";
import { CostDisplay } from "@/components/CostDisplay";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Wand2, Menu, HelpCircle, Settings, Cloud, Home, DollarSign, LogOut } from "lucide-react";

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
    deleteAllPacks,
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
    getPackTokenStats,
    packTokenStats,
  } = useGeneration({
    user,
    packs,
    setPacks,
    referenceImage,
    referenceImage2: coupleMode ? secondReferenceImage : undefined,
    selectedModel,
    aspectRatio,
    imageSize: resolution, // For backward compatibility
    resolution,
  });

  const {
    downloadScene,
    downloadPackAsZip,
    downloadPackOptimized,
    downloadAllPacks,
    downloadPacksByGender,
    downloadMultiplePacks,
  } = useDownload({ packs, selectedPackId });

  const {
    cloudOperation,
    downloadAllCloudData,
    deleteAllCloudData,
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
  const currentPackTokenStats = selectedPackId ? getPackTokenStats(selectedPackId) : undefined;

  const handleGenerateAllPacks = async () => {
    setIsGeneratingAll(true);
    await generateAllPacks();
    setIsGeneratingAll(false);
  };

  // Navigation items for left rail
  const navItems = [
    { icon: Home, label: "Home", path: "/", active: true },
    { icon: Wand2, label: "Pack Generator", path: "/generator" },
    { icon: Cloud, label: "Cloud Files", path: "/cloud-files" },
  ];

  return (
    <>
      <CloudOperationProgress
        state={cloudOperation}
        onClose={handleCloudOperationClose}
        onPause={handleCloudOperationPause}
        onResume={handleCloudOperationResume}
        onConfirmContinue={handleCloudOperationConfirm}
      />
      
      {/* Google-style layout with left rail + gaps */}
      <div className="h-screen bg-muted/30 flex overflow-hidden p-4 gap-4">
        
        {/* Left Navigation Rail - Google style */}
        <nav className="hidden lg:flex w-16 flex-shrink-0 bg-card rounded-2xl border border-border/50 flex-col items-center py-4 gap-2">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          
          {/* Nav Items */}
          <div className="flex-1 flex flex-col gap-1">
            {navItems.map((item) => (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant={item.active ? "secondary" : "ghost"}
                    size="icon"
                    className={`h-10 w-10 rounded-xl ${item.active ? 'bg-primary/10 text-primary' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          {/* Bottom Actions */}
          <div className="flex flex-col gap-1 mt-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Help</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer" onClick={handleSignOut}>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-secondary text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </nav>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border/50 px-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] p-0 bg-card overflow-hidden">
                <PackSidebar
                  packs={packInfos}
                  selectedPackId={selectedPackId}
                  onSelectPack={(packId) => {
                    setSelectedPackId(packId);
                    setSidebarOpen(false);
                  }}
                  onDeletePack={deletePack}
                  onPacksLoad={handlePacksLoad}
                  onGenerateAllPacks={handleGenerateAllPacks}
                  onDownloadAllPacks={downloadAllPacks}
                  onDownloadPacksByGender={downloadPacksByGender}
                  onDownloadAllCloudData={downloadAllCloudData}
                  onDeleteAllCloudData={deleteAllCloudData}
                  onDeleteAllPacks={deleteAllPacks}
                  onDownloadPackOptimized={downloadPackOptimized}
                  onDeleteMultiplePacks={deleteMultiplePacks}
                  onDownloadMultiplePacks={downloadMultiplePacks}
                  isGeneratingAll={isGeneratingAll}
                />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-base font-semibold">Lumra</span>
            </div>
          </div>

          <Avatar className="h-8 w-8 cursor-pointer" onClick={handleSignOut}>
            <AvatarImage src="" />
            <AvatarFallback className="bg-secondary text-xs">
              {user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Pack Sidebar */}
        <aside className="hidden lg:flex w-[300px] min-w-[280px] bg-card rounded-2xl border border-border/50 flex-col overflow-hidden">
          <PackSidebar
            packs={packInfos}
            selectedPackId={selectedPackId}
            onSelectPack={setSelectedPackId}
            onDeletePack={deletePack}
            onPacksLoad={handlePacksLoad}
            onGenerateAllPacks={handleGenerateAllPacks}
            onDownloadAllPacks={downloadAllPacks}
            onDownloadPacksByGender={downloadPacksByGender}
            onDownloadAllCloudData={downloadAllCloudData}
            onDeleteAllCloudData={deleteAllCloudData}
            onDeleteAllPacks={deleteAllPacks}
            onDownloadPackOptimized={downloadPackOptimized}
            onDeleteMultiplePacks={deleteMultiplePacks}
            onDownloadMultiplePacks={downloadMultiplePacks}
            isGeneratingAll={isGeneratingAll}
          />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 lg:pt-0 pt-14">
          {/* Content Panel */}
          <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
            {selectedPack ? (
              <>
                {/* Pack Header */}
                <div className="p-4 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">
                        {getPackName(selectedPack.pack) || 'Unnamed Pack'}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedPack.scenes.filter(s => s.status === 'success').length}/{selectedPack.scenes.length} scenes completed
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Real-time Cost Display */}
                      {currentPackTokenStats && currentPackTokenStats.imagesGenerated > 0 && (
                        <div className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span className="font-medium">{formatCost(currentPackTokenStats.cost.totalCost)}</span>
                          <span className="text-muted-foreground">({currentPackTokenStats.imagesGenerated} img)</span>
                        </div>
                      )}
                      {getPackDescription(selectedPack.pack) && (
                        <p className="text-xs text-muted-foreground max-w-md truncate hidden md:block">
                          {getPackDescription(selectedPack.pack)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Content with optional cost sidebar */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Image Grid */}
                  <div className="flex-1 overflow-y-auto">
                    <ImageGrid
                      shots={selectedPack.scenes}
                      onGenerateShot={(sceneId) => generateSingleScene(selectedPackId!, sceneId)}
                      onDownloadShot={downloadScene}
                    />
                  </div>
                  
                  {/* Cost Panel - shows during generation or after */}
                  {currentPackTokenStats && currentPackTokenStats.imagesGenerated > 0 && (
                    <div className="hidden xl:block w-64 border-l border-border/50 p-4 overflow-y-auto">
                      <CostDisplay 
                        stats={currentPackTokenStats} 
                        isGenerating={selectedPack.isGenerating}
                      />
                    </div>
                  )}
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

          {/* Bottom Controls Bar */}
          <div className="flex-shrink-0 bg-card rounded-2xl border border-border/50 p-3">
            <div className="max-w-4xl mx-auto">
              <ControlsBar
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
                onDownload={() => selectedPackId && downloadPackAsZip(selectedPackId)}
                isGenerating={selectedPack?.isGenerating || false}
                canGenerate={canGenerate}
                hasSelectedPack={selectedPack !== null}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
