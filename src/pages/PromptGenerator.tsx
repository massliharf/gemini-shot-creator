import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ProjectSidebar } from "@/components/prompt-generator/ProjectSidebar";
import { UploadZone } from "@/components/prompt-generator/UploadZone";
import { PromptCard } from "@/components/prompt-generator/PromptCard";
import { FullscreenImageView } from "@/components/FullscreenImageView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@supabase/supabase-js";

const MODEL_OPTIONS = [
  { value: "flash", label: "Flash" },
  { value: "flash-3.1", label: "3.1 Flash" },
  { value: "pro", label: "Pro" },
];
const ASPECT_RATIO_OPTIONS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface StyleProject {
  id: string;
  name: string;
  status: string;
  analysis_text: string | null;
  reference_image_urls: string[];
  created_at: string;
}

interface StylePrompt {
  id: string;
  project_id: string;
  prompt_text: string;
  prompt_label: string;
  thumbnail_url: string | null;
  sort_order: number;
  images?: PromptImage[];
}

interface PromptImage {
  id: string;
  prompt_id: string;
  image_url: string | null;
  image_path: string | null;
  status?: string;
  error_message?: string;
}

const PromptGenerator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<StyleProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<StylePrompt[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatingPromptIds, setGeneratingPromptIds] = useState<Set<string>>(new Set());
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [model, setModel] = useState("flash-3.1");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const navigate = useNavigate();

  const isProModel = model === "pro" || model === "flash-3.1";
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) navigate("/auth");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load projects
  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("style_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjects((data || []).map((d: any) => ({
        ...d,
        reference_image_urls: Array.isArray(d.reference_image_urls) ? d.reference_image_urls : [],
      })));
    } catch (e) {
      console.error("Failed to load projects:", e);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load prompts when project selected
  useEffect(() => {
    if (selectedProjectId) loadPrompts(selectedProjectId);
    else setPrompts([]);
  }, [selectedProjectId]);

  const loadPrompts = async (projectId: string) => {
    setLoadingPrompts(true);
    try {
      const { data: promptsData, error } = await supabase
        .from("style_prompts")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;

      // Load images for each prompt
      const promptIds = (promptsData || []).map((p: any) => p.id);
      let imagesData: any[] = [];
      if (promptIds.length > 0) {
        const { data: imgs } = await supabase
          .from("style_prompt_images")
          .select("*")
          .in("prompt_id", promptIds)
          .order("created_at", { ascending: false });
        imagesData = imgs || [];
      }

      const imagesByPrompt: Record<string, PromptImage[]> = {};
      for (const img of imagesData) {
        if (!imagesByPrompt[img.prompt_id]) imagesByPrompt[img.prompt_id] = [];
        imagesByPrompt[img.prompt_id].push(img);
      }

      setPrompts(
        (promptsData || []).map((p: any) => ({
          ...p,
          images: imagesByPrompt[p.id] || [],
        }))
      );
    } catch (e) {
      console.error("Failed to load prompts:", e);
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Upload & analyze
  const handleUpload = useCallback(async (files: File[]) => {
    if (!user) return;
    setIsAnalyzing(true);
    try {
      // Upload reference images to storage
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `style-refs/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("generated-images")
          .upload(path, file, { contentType: file.type, upsert: true });
        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          continue;
        }
        const { data: { publicUrl } } = supabase.storage.from("generated-images").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length === 0) {
        toast.error("Failed to upload images");
        setIsAnalyzing(false);
        return;
      }

      // Create project
      const { data: project, error: projErr } = await supabase
        .from("style_projects")
        .insert({
          user_id: user.id,
          name: "Analyzing...",
          status: "analyzing",
          reference_image_urls: uploadedUrls,
        })
        .select()
        .single();

      if (projErr) throw projErr;

      setProjects((prev) => [{
        ...project,
        reference_image_urls: uploadedUrls,
      }, ...prev]);
      setSelectedProjectId(project.id);

      // Convert to base64 for AI
      const referenceImages: { base64: string; mimeType: string }[] = [];
      for (const file of files) {
        try {
          const b64 = await fileToBase64(file);
          referenceImages.push({ base64: b64, mimeType: file.type || "image/jpeg" });
        } catch { /* skip */ }
      }

      // Call analyze function
      const resp = await supabase.functions.invoke("analyze-style", {
        body: { referenceImages, projectId: project.id },
      });

      if (!resp.data?.success) {
        toast.error(resp.data?.message || "Analysis failed");
        setIsAnalyzing(false);
        return;
      }

      // Reload project and prompts
      await loadProjects();
      await loadPrompts(project.id);
      toast.success("Style analysis complete!");
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed");
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  // Edit prompt
  const handleEditPrompt = async (id: string, text: string) => {
    try {
      const { error } = await supabase
        .from("style_prompts")
        .update({ prompt_text: text, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, prompt_text: text } : p)));
    } catch {
      toast.error("Update failed");
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (id: string) => {
    try {
      const { error } = await supabase.from("style_prompts").delete().eq("id", id);
      if (error) throw error;
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("style_projects").delete().eq("id", id);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
        setPrompts([]);
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  // Generate image from prompt
  const handleGenerate = useCallback(async (prompt: StylePrompt) => {
    if (!user) return;
    setGeneratingPromptIds((prev) => new Set(prev).add(prompt.id));

    // Add placeholder image
    const tempId = `temp-${Date.now()}`;
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === prompt.id
          ? { ...p, images: [{ id: tempId, prompt_id: prompt.id, image_url: null, image_path: null, status: "generating" }, ...(p.images || [])] }
          : p
      )
    );

    try {
      const resp = await supabase.functions.invoke("generate-text-image", {
        body: {
          prompt: prompt.prompt_text,
          model,
          aspectRatio,
          resolution: isProModel ? resolution : "1K",
        },
      });

      const data = resp.data;
      if (!data?.success) {
        setPrompts((prev) =>
          prev.map((p) =>
            p.id === prompt.id
              ? { ...p, images: (p.images || []).map((i) => (i.id === tempId ? { ...i, status: "error", error_message: data?.message } : i)) }
              : p
          )
        );
        toast.error(data?.message || "Generation failed");
        return;
      }

      // Save to style_prompt_images
      const { data: savedImg, error: saveErr } = await supabase
        .from("style_prompt_images")
        .insert({
          prompt_id: prompt.id,
          user_id: user.id,
          image_url: data.imageUrl,
          image_path: data.imagePath,
          model,
          aspect_ratio: aspectRatio,
          resolution: isProModel ? resolution : "1K",
        })
        .select()
        .single();

      if (saveErr) console.error("Save error:", saveErr);

      // Update thumbnail if first image
      const currentPrompt = prompts.find((p) => p.id === prompt.id);
      const hasNoThumbnail = !currentPrompt?.thumbnail_url;
      if (hasNoThumbnail) {
        await supabase
          .from("style_prompts")
          .update({ thumbnail_url: data.imageUrl })
          .eq("id", prompt.id);
      }

      // Update UI
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === prompt.id
            ? {
                ...p,
                thumbnail_url: hasNoThumbnail ? data.imageUrl : p.thumbnail_url,
                images: (p.images || []).map((i) =>
                  i.id === tempId
                    ? { ...i, id: savedImg?.id || tempId, image_url: data.imageUrl, image_path: data.imagePath, status: "success" }
                    : i
                ),
              }
            : p
        )
      );
    } catch (e: any) {
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === prompt.id
            ? { ...p, images: (p.images || []).map((i) => (i.id === tempId ? { ...i, status: "error", error_message: e?.message } : i)) }
            : p
        )
      );
      toast.error("Generation failed");
    } finally {
      setGeneratingPromptIds((prev) => {
        const next = new Set(prev);
        next.delete(prompt.id);
        return next;
      });
    }
  }, [user, model, aspectRatio, resolution, isProModel, prompts]);

  // Delete image
  const handleDeleteImage = async (imageId: string) => {
    if (imageId.startsWith("temp-")) {
      setPrompts((prev) =>
        prev.map((p) => ({ ...p, images: (p.images || []).filter((i) => i.id !== imageId) }))
      );
      return;
    }
    try {
      const { error } = await supabase.from("style_prompt_images").delete().eq("id", imageId);
      if (error) throw error;
      setPrompts((prev) =>
        prev.map((p) => ({ ...p, images: (p.images || []).filter((i) => i.id !== imageId) }))
      );
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  const sidebar = (
    <ProjectSidebar
      projects={projects}
      selectedId={selectedProjectId}
      onSelect={setSelectedProjectId}
      onNew={() => setSelectedProjectId(null)}
      onDelete={handleDeleteProject}
      loading={loadingProjects}
    />
  );

  return (
    <>
      <AppLayout userEmail={user.email} sidebar={sidebar}>
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-background">
          {/* Top controls */}
          <div className="px-5 py-2.5 border-b border-border/50 flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-semibold mr-3">Prompt Generator</h1>

            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-auto h-7 px-2.5 rounded-md border-0 bg-accent text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-auto h-7 px-2.5 rounded-md border-0 bg-accent text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIO_OPTIONS.map((ar) => (
                  <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isProModel && (
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="w-auto h-7 px-2.5 rounded-md border-0 bg-accent text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Content */}
          {!selectedProjectId || !selectedProject ? (
            <UploadZone onUpload={handleUpload} isAnalyzing={isAnalyzing} />
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-3 max-w-4xl">
                {/* Analysis */}
                {selectedProject.analysis_text && (
                  <div className="bg-accent/50 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                    <p className="font-medium text-foreground text-sm mb-1">Style Analysis</p>
                    {selectedProject.analysis_text}
                  </div>
                )}

                {/* Reference images */}
                {selectedProject.reference_image_urls?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedProject.reference_image_urls.map((url, i) => (
                      <div
                        key={i}
                        className="w-14 h-14 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setFullscreenUrl(url)}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {loadingPrompts ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : prompts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No prompts generated yet.</p>
                ) : (
                  prompts.map((p) => (
                    <PromptCard
                      key={p.id}
                      prompt={p}
                      onEdit={handleEditPrompt}
                      onDelete={handleDeletePrompt}
                      onGenerate={handleGenerate}
                      onImageClick={(url) => setFullscreenUrl(url)}
                      onDeleteImage={handleDeleteImage}
                      isGenerating={generatingPromptIds.has(p.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </main>
      </AppLayout>

      <FullscreenImageView
        isOpen={!!fullscreenUrl}
        onClose={() => setFullscreenUrl(null)}
        imageUrl={fullscreenUrl}
        sceneName="Style Image"
      />
    </>
  );
};

export default PromptGenerator;
