import { ChevronRight, LayoutGrid, Upload, Wand2, type LucideIcon } from "lucide-react";
import { samplePacks } from "@/data/mock";
import { getPackCategory, getPackName } from "@/types/pack";
import { SampleChip } from "@/components/SampleNotice";
import { cn } from "@/lib/utils";

interface PacksStartViewProps {
  /** Opens the paste-JSON dialog. When absent the card explains where uploads live instead. */
  onUpload?: () => void;
  onCreate: () => void;
  onBrowse: () => void;
}

interface StartCard {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  onClick?: () => void;
}

/** First-run view of the Packs page: three ways in plus a strip of sample packs. */
export const PacksStartView = ({ onUpload, onCreate, onBrowse }: PacksStartViewProps) => {
  const cards: StartCard[] = [
    {
      key: "upload",
      title: "Upload pack JSON",
      description: onUpload
        ? "Paste a pack file — every scene is queued, ready to generate."
        : "Use the upload button in the pack list to paste a pack file.",
      icon: Upload,
      tint: "bg-cat-image/10 text-cat-image",
      onClick: onUpload,
    },
    {
      key: "create",
      title: "Create with Pack Creator",
      description: "Describe a look and let AI write a consistent scene list.",
      icon: Wand2,
      tint: "bg-cat-spaces/10 text-cat-spaces",
      onClick: onCreate,
    },
    {
      key: "browse",
      title: "Browse templates",
      description: "Start from ready-made flows for products, people and spaces.",
      icon: LayoutGrid,
      tint: "bg-cat-video/10 text-cat-video",
      onClick: onBrowse,
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-8 md:pt-14 pb-12">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <div className="space-y-1.5">
          <h2 className="text-heading-xl text-foreground">Start your first pack</h2>
          <p className="text-body-md text-muted-foreground max-w-[60ch]">
            A pack is a set of scenes that share one look — generate them all at once with your reference photos.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 list-none m-0 p-0" aria-label="Ways to start">
          {cards.map(({ key, title, description, icon: Icon, tint, onClick }) => (
            <li key={key}>
              <button
                type="button"
                onClick={onClick}
                disabled={!onClick}
                className={cn(
                  "group flex h-full w-full flex-row items-start gap-3 rounded-lg bg-card p-4 text-left sm:flex-col sm:gap-4 sm:p-5",
                  "transition-colors duration-fast ease-standard hover:bg-control-hover disabled:cursor-default disabled:hover:bg-card",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-md", tint)} aria-hidden="true">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center gap-1 text-heading-sm text-foreground">
                    {title}
                    {onClick && (
                      <ChevronRight
                        className="size-4 text-tertiary-foreground transition-transform duration-fast ease-standard group-hover:translate-x-0.5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="block text-body-sm text-muted-foreground">{description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section aria-labelledby="sample-packs-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 id="sample-packs-heading" className="text-overline text-muted-foreground">
              Sample packs
            </h3>
            <SampleChip />
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 list-none m-0 p-0">
            {samplePacks.map(({ id, pack, scenes }) => {
              const covers = scenes.filter((s) => s.imageUrl).slice(0, 4);
              const category = getPackCategory(pack);
              return (
                <li key={id}>
                  <figure className="relative m-0 aspect-[4/5] overflow-hidden rounded-[12px] bg-control">
                    <div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5" aria-hidden="true">
                      {covers.map((scene, i) => (
                        <img
                          key={scene.id}
                          src={scene.imageUrl}
                          alt=""
                          loading="lazy"
                          className={cn(
                            "size-full min-h-0 object-cover",
                            i === 0 && covers.length === 3 && "row-span-2",
                            i === 0 && covers.length < 3 && "col-span-2 row-span-2",
                          )}
                        />
                      ))}
                    </div>
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent px-3 pb-3 pt-10 text-white dark:from-black/70 dark:via-black/20">
                      <span className="block truncate text-heading-xs font-semibold">{getPackName(pack)}</span>
                      <span className="block text-caption text-white/80">
                        {scenes.length} scenes · {category === "3d" ? "3D" : category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
};
