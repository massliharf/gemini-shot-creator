import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ProjectSidebar } from "@/components/prompt-generator/ProjectSidebar";
import { UploadZone } from "@/components/prompt-generator/UploadZone";
import { PromptCard } from "@/components/prompt-generator/PromptCard";
import { FullscreenImageView } from "@/components/FullscreenImageView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SampleChip, SampleNotice } from "@/components/SampleNotice";
import { mockImage, relativeTime, type MockImageKey } from "@/data/mock";
import { User } from "@supabase/supabase-js";
import { prepareImageForAi } from "@/lib/prepare-image-for-ai";

const MODEL_OPTIONS = [
  { value: "flash", label: "Flash" },
  { value: "flash-3.1", label: "3.1 Flash" },
  { value: "pro", label: "Pro" },
];
const ASPECT_RATIO_OPTIONS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];

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

/* --------------------------------------------------------------------------
 * Sample style projects — shown before the first upload
 * ------------------------------------------------------------------------ */
interface SampleStyleProject {
  id: string;
  name: string;
  reference: MockImageKey;
  analysis: string;
  minutesAgo: number;
  prompts: { label: string; text: string }[];
}

const SAMPLE_STYLE_PROJECTS: SampleStyleProject[] = [
  {
    id: "sp1",
    name: "Color theory editorial",
    reference: "portrait-blush",
    minutesAgo: 18,
    analysis:
      "Saturated seamless backdrops, soft frontal key light, crisp white shirting and small gold hoops. Calm, direct gaze; editorial retouching that keeps natural skin texture.",
    prompts: [
      {
        label: "Hero portrait",
        text: "Editorial portrait of a woman with dark wavy hair on a saturated tangerine seamless backdrop, soft frontal key light, oversized white shirt, small gold hoops, calm direct gaze, 85mm lens, natural skin texture.",
      },
      {
        label: "Cool variant",
        text: "Same model and wardrobe on a lilac seamless backdrop, cooler key light from camera left, shoulders angled away, chin slightly lowered, minimal retouching, fashion-magazine framing.",
      },
      {
        label: "Beauty crop",
        text: "Tight beauty crop on a mint backdrop, freckles visible, glossy lips, brushed-up brows, soft diffused light, a gold hoop catching a highlight, square composition.",
      },
    ],
  },
  {
    id: "sp2",
    name: "Marble still life",
    reference: "product-coral",
    minutesAgo: 60 * 5,
    analysis:
      "Frosted glass bottle on a marble plinth with a sculpted stone accent. Raking window light, long soft shadows and a muted pastel palette.",
    prompts: [
      {
        label: "Campaign hero",
        text: "Frosted glass perfume bottle on a white marble plinth beside a sculpted coral stone, raking morning window light, long soft shadows, warm neutral backdrop, 50mm product photography.",
      },
      {
        label: "Colourway",
        text: "Same composition recoloured: lilac stone with lilac-tinted reflections in the glass, cool daylight, subtle haze, clean grey wall, high-end fragrance campaign.",
      },
      {
        label: "Detail",
        text: "Macro detail of the bottle shoulder and cap, marble veining in soft focus, stone texture catching rim light, shallow depth of field, quiet luxury mood.",
      },
    ],
  },
  {
    id: "sp3",
    name: "Concrete courtyard",
    reference: "space-terracotta",
    minutesAgo: 60 * 30,
    analysis:
      "Sculptural lounge chair in sunlit concrete architecture. Hard midday shadows, olive-tree silhouettes and one saturated upholstery colour per shot.",
    prompts: [
      {
        label: "Hero chair",
        text: "Sculptural terracotta lounge chair in a sunlit concrete courtyard, hard midday shadows from an olive tree, minimal brutalist steps, warm stone tones, architectural photography.",
      },
      {
        label: "Golden hour",
        text: "Mustard upholstered lounge chair on polished concrete at golden hour, long raking light through a wall opening, soft dust in the air, calm editorial interior.",
      },
      {
        label: "Cool contrast",
        text: "Cobalt lounge chair against pale concrete stairs, crisp shade lines, clear blue-sky bounce light, symmetrical framing, design-magazine cover.",
      },
    ],
  },
];

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy — select the text instead");
  }
};

const SampleStyleProjects = () => (
  <section className="px-4 md:px-8 pb-8 space-y-3 max-w-6xl" aria-labelledby="sample-projects-heading">
    <h2 id="sample-projects-heading" className="sr-only">
      Sample style projects
    </h2>
    <SampleNotice>Prompts like these are written from your reference photos.</SampleNotice>
    {SAMPLE_STYLE_PROJECTS.map((project) => {
      const createdAt = new Date(Date.now() - project.minutesAgo * 60_000).toISOString();
      return (
        <article
          key={project.id}
          aria-labelledby={`${project.id}-title`}
          className="bg-card rounded-lg p-3 md:p-4 grid gap-3 md:gap-4 md:grid-cols-[168px_minmax(0,1fr)]"
        >
          {/* Reference image */}
          <div className="relative aspect-[16/9] md:aspect-square overflow-hidden rounded-md bg-control md:self-start">
            <img src={mockImage(project.reference)} alt="" loading="lazy" className="size-full object-cover" />
            <span className="absolute left-2 top-2 inline-flex h-6 items-center rounded-xs bg-foreground/25 px-2 text-caption text-white backdrop-blur-sm">
              Reference
            </span>
          </div>

          <div className="min-w-0 flex flex-col gap-3">
            {/* Project header + style analysis */}
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <h3 id={`${project.id}-title`} className="text-heading-sm text-foreground truncate">
                  {project.name}
                </h3>
                <SampleChip className="shrink-0" />
                <span className="ml-auto text-caption text-tertiary-foreground whitespace-nowrap">
                  {project.prompts.length} prompts · {relativeTime(createdAt)}
                </span>
              </div>
              <p className="text-body-sm text-muted-foreground line-clamp-3 md:line-clamp-2">{project.analysis}</p>
            </div>

            {/* Generated prompts */}
            <ul className="grid gap-2 lg:grid-cols-3 list-none m-0 p-0" aria-label={`${project.name} prompts`}>
              {project.prompts.map((prompt, i) => (
                <li key={prompt.label} className="bg-app rounded-[12px] p-3 flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-xs bg-card text-micro text-muted-foreground tabular-nums" aria-hidden="true">
                      {i + 1}
                    </span>
                    <h4 className="flex-1 min-w-0 truncate text-label-md text-foreground">{prompt.label}</h4>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="-my-1 -mr-1 text-muted-foreground hover:text-foreground hover:bg-card"
                          onClick={() => copyText(prompt.text)}
                          aria-label={`Copy prompt: ${prompt.label}`}
                        >
                          <Copy strokeWidth={1.5} aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy prompt</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-body-sm text-foreground/80">{prompt.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </article>
      );
    })}
  </section>
);

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
          referenceImages.push(await prepareImageForAi(file));
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
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-label="Loading" />
      </div>
    );
  }
  if (!user) return null;

  const showSampleProjects = projects.length === 0 && !loadingProjects && !isAnalyzing;

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
          {/* Top controls — section labels + borderless selects, no divider */}
          <div className="px-4 md:px-8 pt-4 pb-3 flex items-end gap-3 flex-wrap">
            <h1 className="sr-only">Prompt generator</h1>

            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <Label htmlFor="pg-model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="pg-model" className="w-auto min-w-[6.5rem]" aria-label="Model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="pg-aspect">Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger id="pg-aspect" className="w-auto min-w-[5rem]" aria-label="Aspect ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIO_OPTIONS.map((ar) => (
                      <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isProModel && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="pg-resolution">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger id="pg-resolution" className="w-auto min-w-[5rem]" aria-label="Resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {!selectedProjectId || !selectedProject ? (
            // Same wrapper in both states so UploadZone keeps its picked files.
            // First visit (always in demo mode): upload area + sample projects below.
            <div className={showSampleProjects ? "flex-1 min-h-0 overflow-y-auto" : "flex-1 min-h-0 flex flex-col"}>
              <UploadZone onUpload={handleUpload} isAnalyzing={isAnalyzing} />
              {showSampleProjects && <SampleStyleProjects />}
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 md:px-8 pb-6 pt-2 space-y-4 max-w-4xl">
                {/* Analysis */}
                {selectedProject.analysis_text && (
                  <section className="bg-card rounded-lg p-4 md:p-7">
                    <h2 className="text-overline text-muted-foreground mb-2">Style analysis</h2>
                    <p className="text-body-md text-foreground">{selectedProject.analysis_text}</p>
                  </section>
                )}

                {/* Reference images */}
                {selectedProject.reference_image_urls?.length > 0 && (
                  <section className="bg-card rounded-lg p-4">
                    <h2 className="text-overline text-muted-foreground mb-2">Reference images</h2>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProject.reference_image_urls.map((url, i) => (
                        <div
                          key={i}
                          role="button"
                          tabIndex={0}
                          aria-label={`View reference image ${i + 1}`}
                          className="size-[65px] rounded-md bg-control overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                          onClick={() => setFullscreenUrl(url)}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {loadingPrompts ? (
                  <div className="space-y-3" aria-busy="true" aria-live="polite">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="rounded-lg bg-card p-4 flex gap-4">
                        <Skeleton className="size-16 rounded-md shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                          <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-12 gap-3">
                    <Sparkles className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="text-heading-md text-foreground">No prompts generated yet</p>
                      <p className="text-body-sm text-muted-foreground">
                        Prompts appear here once the style analysis finishes for this project.
                      </p>
                    </div>
                  </div>
                ) : (
                  <section className="space-y-3">
                    <h2 className="text-overline text-muted-foreground">Prompts</h2>
                    {prompts.map((p) => (
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
                    ))}
                  </section>
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
