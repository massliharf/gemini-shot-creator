import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ImagePlus, LayoutTemplate, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { mockImage, type MockImageKey } from "@/data/mock";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "lumra-onboarding-dismissed";

const steps: { title: string; body: string; icon: typeof Sparkles; images: MockImageKey[]; cta: string; path: string }[] = [
  {
    title: "Pick a tool or a template",
    body: "Start from a blank tool, or open a template from Explore — every template fills in the prompt for you.",
    icon: LayoutTemplate,
    images: ["portrait-blush", "product-lilac", "space-sage"],
    cta: "Browse templates",
    path: "/explore",
  },
  {
    title: "Add a reference",
    body: "Drop one photo of your model, product or space. Lumra keeps the face, the shape and the light consistent.",
    icon: ImagePlus,
    images: ["portrait-cobalt", "portrait-cobalt", "portrait-cobalt"],
    cta: "Open Pack Creator",
    path: "/pack-creator",
  },
  {
    title: "Generate a whole pack",
    body: "One click renders every scene in parallel. Curate, re-roll the ones you don't love and download a zip.",
    icon: Sparkles,
    images: ["portrait-tangerine", "portrait-mint", "portrait-lilac"],
    cta: "Make my first generation",
    path: "/text-to-image",
  },
];

/** Guided tour — three-step dialog. Opens on the `lumra:tour` window event. */
export const GuidedTour = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onTour = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("lumra:tour", onTour);
    return () => window.removeEventListener("lumra:tour", onTour);
  }, []);

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden p-0">
        <div className="relative h-[220px] bg-app overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            {s.images.map((k, i) => (
              <img
                key={`${step}-${i}`}
                src={mockImage(k)}
                alt=""
                className={cn(
                  "w-[120px] aspect-[4/5] rounded-md object-cover shadow-overlay animate-in fade-in-0 zoom-in-95 duration-slow",
                  i === 0 && "-rotate-6 translate-y-2",
                  i === 2 && "rotate-6 translate-y-2",
                  i === 1 && "z-10 scale-110",
                )}
              />
            ))}
          </div>
        </div>
        <div className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-soft text-brand">
              <s.icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="text-overline text-muted-foreground">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <DialogTitle className="text-heading-md text-foreground">{s.title}</DialogTitle>
          <DialogDescription className="mt-1 text-body-sm text-muted-foreground">{s.body}</DialogDescription>
          <div className="mt-6 flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all duration-normal", i === step ? "w-5 bg-foreground" : "w-1.5 bg-border-strong")} />
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (last) {
                    setOpen(false);
                    navigate(s.path);
                  } else setStep(step + 1);
                }}
              >
                {last ? s.cta : "Next"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Bottom-centred white pill: "New here? Make your first generation" + Guided tour + ✕ (Magnific §7.8). */
export const OnboardingToast = () => {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="status"
      className="fixed left-1/2 z-header -translate-x-1/2 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+12px)] md:bottom-6 flex items-center gap-3 rounded-full bg-card pl-4 pr-1.5 py-1.5 shadow-overlay animate-in fade-in-0 slide-in-from-bottom-4 duration-slow max-w-[calc(100vw-24px)]"
    >
      <p className="text-label-md text-foreground truncate">
        New here? <span className="text-muted-foreground">Make your first generation</span>
      </p>
      <Button variant="info" size="md" onClick={() => window.dispatchEvent(new Event("lumra:tour"))}>
        Guided tour
      </Button>
      <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={dismiss} aria-label="Dismiss">
        <X />
      </Button>
    </div>
  );
};
