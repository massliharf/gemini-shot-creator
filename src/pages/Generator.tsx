import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Wand2, Download, Loader2, X, FileJson } from "lucide-react";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount } from "@/types/pack";
import JSZip from "jszip";
import { AppLayout } from "@/components/AppLayout";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  pack?: PackFile;
  error?: string;
}

export default function Generator() {
  const navigate = useNavigate();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

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

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      toast.error("Some files were skipped (not images)");
    }

    const newImages: UploadedImage[] = await Promise.all(
      validFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview: URL.createObjectURL(file),
          base64,
          status: 'pending' as const,
        };
      })
    );

    setImages(prev => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added`);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const handleGenerateAll = async () => {
    const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'error');
    if (pendingImages.length === 0) {
      toast.error("No images to generate");
      return;
    }

    setIsGenerating(true);
    setCurrentIndex(0);

    for (let i = 0; i < pendingImages.length; i++) {
      const img = pendingImages[i];
      setCurrentIndex(i + 1);

      setImages(prev => prev.map(p => 
        p.id === img.id ? { ...p, status: 'generating' } : p
      ));

      try {
        const { data, error } = await supabase.functions.invoke("generate-pack", {
          body: { imageBase64: img.base64, sceneCount: 8 },
        });

        if (error) throw error;

        if (data.success && data.pack) {
          setImages(prev => prev.map(p => 
            p.id === img.id ? { ...p, status: 'success', pack: data.pack } : p
          ));
        } else {
          throw new Error(data.error || "Failed to generate pack");
        }
      } catch (error) {
        console.error("Generation error:", error);
        setImages(prev => prev.map(p => 
          p.id === img.id ? { 
            ...p, 
            status: 'error', 
            error: error instanceof Error ? error.message : "Unknown error" 
          } : p
        ));
      }
    }

    setIsGenerating(false);
    toast.success("Batch generation complete!");
  };

  const handleDownloadAll = async () => {
    const successImages = images.filter(img => img.status === 'success' && img.pack);
    if (successImages.length === 0) {
      toast.error("No packs to download");
      return;
    }

    const zip = new JSZip();

    successImages.forEach(img => {
      // New nested schema: meta.pack_name and meta.pack_id
      const packName = img.pack ? getPackName(img.pack) : 'pack';
      const packId = img.pack ? getPackId(img.pack) : packName.replace(/\s+/g, '_').toLowerCase();
      const fileName = `${packId}.json`;
      zip.file(fileName, JSON.stringify(img.pack, null, 2));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stylepacks_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${successImages.length} pack(s) downloaded as ZIP`);
  };

  const handleDownloadSingle = (img: UploadedImage) => {
    if (!img.pack) return;
    // New nested schema: meta.pack_name and meta.pack_id
    const packName = getPackName(img.pack);
    const packId = getPackId(img.pack) || packName.replace(/\s+/g, '_').toLowerCase();
    const blob = new Blob([JSON.stringify(img.pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${packId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pendingCount = images.filter(i => i.status === 'pending').length;
  const successCount = images.filter(i => i.status === 'success').length;
  const errorCount = images.filter(i => i.status === 'error').length;
  const progress = images.length > 0 ? (successCount / images.length) * 100 : 0;

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border/50">
          <h1 className="text-sm font-semibold">Pack Generator</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{images.length} görsel</span>
            {successCount > 0 && <span className="text-green-500">• {successCount} başarılı</span>}
            {errorCount > 0 && <span className="text-red-500">• {errorCount} hatalı</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload Area */}
          <Card className="p-4 space-y-4 border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Referans Görseller</Label>
              {images.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-6">
                  Temizle
                </Button>
              )}
            </div>

            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Görselleri sürükleyin veya tıklayın</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesUpload}
                className="hidden"
              />
            </label>

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {images.map(img => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.preview}
                      alt="Reference"
                      className={`w-full aspect-square object-cover rounded-lg border-2 ${
                        img.status === 'success' ? 'border-green-500' :
                        img.status === 'error' ? 'border-red-500' :
                        img.status === 'generating' ? 'border-yellow-500 animate-pulse' :
                        'border-border/50'
                      }`}
                    />
                    {img.status === 'generating' && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    )}
                    {img.status === 'success' && (
                      <button
                        onClick={() => handleDownloadSingle(img)}
                        className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FileJson className="h-4 w-4 text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-1 -right-1 bg-background border border-border w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Üretiliyor {currentIndex} / {images.filter(i => i.status !== 'success').length}...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateAll}
                disabled={pendingCount === 0 || isGenerating}
                className="flex-1"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Üretiliyor...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Oluştur ({pendingCount})
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadAll}
                disabled={successCount === 0}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                ZIP ({successCount})
              </Button>
            </div>
          </Card>

          {/* Generated Packs List */}
          {images.filter(i => i.status === 'success' && i.pack).length > 0 && (
            <Card className="p-4 space-y-4 border-border/50">
              <Label className="text-xs font-medium">Oluşturulan Pack'ler</Label>
              <div className="space-y-2">
                {images.filter(i => i.status === 'success' && i.pack).map(img => (
                  <div key={img.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                    <img src={img.preview} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {img.pack ? getPackName(img.pack) : 'Untitled Pack'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {getSceneCount(img.pack) || 0} sahne
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDownloadSingle(img)} className="h-7 w-7 p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Error List */}
          {images.filter(i => i.status === 'error').length > 0 && (
            <Card className="p-4 space-y-2 border-destructive/50">
              <Label className="text-xs font-medium text-destructive">Başarısız</Label>
              {images.filter(i => i.status === 'error').map(img => (
                <div key={img.id} className="flex items-center gap-2 text-xs text-destructive/80">
                  <img src={img.preview} className="w-6 h-6 object-cover rounded shrink-0" />
                  <span className="truncate">{img.error}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
