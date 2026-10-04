import { useMemo, useState } from "react";
import {
  ChevronRight,
  Folder,
  LayoutGrid,
  List,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SampleChip, SampleNotice } from "@/components/SampleNotice";
import {
  mockImage,
  relativeTime,
  sampleCreations,
  sampleFolders,
  type MockImageKey,
  type SampleFolder,
} from "@/data/mock";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortKey = "recent" | "name" | "size";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Last modified",
  name: "Name",
  size: "Size",
};

const formatMb = (mb: number) => `${mb.toFixed(1)} MB`;
const fileName = (folder: SampleFolder, index: number) =>
  `${folder.name}_${String(index + 1).padStart(2, "0")}.png`;

interface RecentFile {
  id: string;
  name: string;
  image: MockImageKey;
  createdAt: string;
  resolution: string;
  prompt: string;
}

const recentFiles: RecentFile[] = sampleCreations
  .flatMap((c) =>
    c.images.map((image, i) => ({
      id: `${c.id}-${i}`,
      name: `${image}.png`,
      image,
      createdAt: c.createdAt,
      resolution: c.resolution,
      prompt: c.prompt,
    })),
  )
  .slice(0, 12);

type Preview =
  | { kind: "folder"; folder: SampleFolder }
  | { kind: "file"; file: RecentFile };

/**
 * Sample content for My Library when the cloud bucket is empty (always in
 * demo mode). Search, view toggle and sort work on the sample folders; cards
 * open a read-only preview.
 */
export const SampleLibrary = () => {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("recent");
  const [preview, setPreview] = useState<Preview | null>(null);

  const folders = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "_");
    const list = sampleFolders.filter((f) => !q || f.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return b.sizeMb - a.sizeMb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [query, sort]);

  return (
    <div className="space-y-6">
      <SampleNotice>Generated images are saved here, one folder per pack.</SampleNotice>

      {/* Toolbar — search, filters, view toggle */}
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Library view">
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search folders"
            aria-label="Search folders"
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal strokeWidth={1.5} aria-hidden="true" />
              Filters
              {sort !== "recent" && (
                <span className="ml-0.5 text-muted-foreground">· {SORT_LABELS[sort]}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-overline text-muted-foreground">Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuRadioItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div role="group" aria-label="Layout" className="segmented ml-auto">
          <button
            type="button"
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            onClick={() => setView("grid")}
            className="segmented-item gap-1.5 px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <LayoutGrid className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            aria-label="List view"
            onClick={() => setView("list")}
            className="segmented-item gap-1.5 px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <List className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Folders */}
      <section aria-labelledby="sample-folders-heading" className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 id="sample-folders-heading" className="text-overline text-muted-foreground">
            Folders
          </h2>
          <span className="text-caption text-tertiary-foreground tabular-nums">{folders.length}</span>
        </div>

        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-card px-4 py-12 text-center">
            <SearchX className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-heading-sm text-foreground">No folders match “{query}”</p>
            <p className="text-body-sm text-muted-foreground">Try a pack name such as “beauty” or “courtyard”.</p>
          </div>
        ) : view === "grid" ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
            {folders.map((folder) => (
              <li key={folder.id} className="min-w-0">
                <FolderCard folder={folder} onOpen={() => setPreview({ kind: "folder", folder })} />
              </li>
            ))}
          </ul>
        ) : (
          <FolderList folders={folders} onOpen={(folder) => setPreview({ kind: "folder", folder })} />
        )}
      </section>

      {/* Recent files */}
      <section aria-labelledby="sample-recent-heading" className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 id="sample-recent-heading" className="text-overline text-muted-foreground">
            Recent files
          </h2>
          <span className="text-caption text-tertiary-foreground tabular-nums">{recentFiles.length}</span>
        </div>
        <ul className="no-scrollbar -mx-4 my-0 flex list-none snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:-mx-8 md:scroll-px-8 md:px-8">
          {recentFiles.map((file) => (
            <li key={file.id} className="w-32 shrink-0 snap-start sm:w-36">
              <button
                type="button"
                onClick={() => setPreview({ kind: "file", file })}
                aria-label={`Preview ${file.name}`}
                className="group block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="block aspect-square overflow-hidden rounded-md bg-control">
                  <img
                    src={mockImage(file.image)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-normal ease-standard group-hover:scale-[1.03]"
                  />
                </span>
                <span className="mt-2 block truncate text-label-md text-foreground">{file.name}</span>
                <span className="block truncate text-caption text-tertiary-foreground tabular-nums">
                  {file.resolution} · {relativeTime(file.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <PreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

/* ------------------------------------------------------------------------ */

const Collage = ({ covers, className }: { covers: MockImageKey[]; className?: string }) => (
  <span className={cn("grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md bg-control", className)}>
    {covers.slice(0, 4).map((key, i) => (
      <img
        key={key + i}
        src={mockImage(key)}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform duration-normal ease-standard group-hover:scale-[1.04]"
      />
    ))}
  </span>
);

const FolderCard = ({ folder, onOpen }: { folder: SampleFolder; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={`Open ${folder.name}, ${folder.files} files`}
    className="group flex w-full flex-col rounded-[12px] bg-card p-2 text-left transition-colors duration-fast hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    <Collage covers={folder.covers} className="aspect-[4/3] w-full" />
    <span className="flex min-w-0 items-center gap-1.5 px-1 pt-2.5">
      <Folder className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <span className="truncate text-label-md text-foreground">{folder.name}</span>
    </span>
    <span className="flex items-center justify-between gap-2 px-1 pb-1 pt-0.5 text-caption">
      <span className="truncate text-muted-foreground tabular-nums">
        {folder.files} files · {formatMb(folder.sizeMb)}
      </span>
      <time dateTime={folder.createdAt} className="hidden shrink-0 text-tertiary-foreground min-[420px]:inline">
        {relativeTime(folder.createdAt)}
      </time>
    </span>
  </button>
);

const FolderList = ({ folders, onOpen }: { folders: SampleFolder[]; onOpen: (f: SampleFolder) => void }) => (
  <div className="overflow-hidden rounded-lg bg-card p-1">
    <div
      className="hidden grid-cols-[minmax(0,1fr)_80px_96px_120px_24px] items-center gap-3 px-3 py-2 text-overline text-muted-foreground md:grid"
      aria-hidden="true"
    >
      <span>Name</span>
      <span className="text-right">Files</span>
      <span className="text-right">Size</span>
      <span className="text-right">Modified</span>
      <span />
    </div>
    <ul className="m-0 list-none space-y-0.5 p-0">
      {folders.map((folder) => (
        <li key={folder.id}>
          <button
            type="button"
            onClick={() => onOpen(folder)}
            aria-label={`Open ${folder.name}, ${folder.files} files`}
            className="group grid min-h-14 w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-fast hover:bg-control focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_80px_96px_120px_24px]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Collage covers={folder.covers} className="size-10 shrink-0 rounded-sm" />
              <span className="min-w-0">
                <span className="block truncate text-label-md text-foreground">{folder.name}</span>
                <span className="block truncate text-caption text-muted-foreground tabular-nums md:hidden">
                  {folder.files} files · {formatMb(folder.sizeMb)} · {relativeTime(folder.createdAt)}
                </span>
              </span>
            </span>
            <span className="hidden text-right text-caption text-muted-foreground tabular-nums md:block">{folder.files}</span>
            <span className="hidden text-right text-caption text-muted-foreground tabular-nums md:block">
              {formatMb(folder.sizeMb)}
            </span>
            <time dateTime={folder.createdAt} className="hidden text-right text-caption text-tertiary-foreground md:block">
              {relativeTime(folder.createdAt)}
            </time>
            <ChevronRight
              className="size-4 justify-self-end text-tertiary-foreground transition-colors duration-fast group-hover:text-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ul>
  </div>
);

const PreviewDialog = ({ preview, onClose }: { preview: Preview | null; onClose: () => void }) => (
  <Dialog open={!!preview} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-xl">
      {preview?.kind === "folder" && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-heading-md">
              <span className="truncate">{preview.folder.name}</span>
              <SampleChip className="shrink-0" />
            </DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground tabular-nums">
              {preview.folder.files} files · {formatMb(preview.folder.sizeMb)} · Updated{" "}
              {relativeTime(preview.folder.createdAt).toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {preview.folder.covers.map((key, i) => (
              <li key={key + i} className="min-w-0">
                <img src={mockImage(key)} alt="" className="aspect-square w-full rounded-md bg-control object-cover" />
                <p className="mt-1.5 truncate text-caption text-muted-foreground">{fileName(preview.folder, i)}</p>
              </li>
            ))}
          </ul>
          {preview.folder.files > preview.folder.covers.length && (
            <p className="text-caption text-tertiary-foreground tabular-nums">
              Showing {preview.folder.covers.length} of {preview.folder.files} files
            </p>
          )}
        </>
      )}
      {preview?.kind === "file" && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-heading-md">
              <span className="truncate">{preview.file.name}</span>
              <SampleChip className="shrink-0" />
            </DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground">{preview.file.prompt}</DialogDescription>
          </DialogHeader>
          <img
            src={mockImage(preview.file.image)}
            alt={preview.file.prompt}
            className="aspect-square w-full rounded-md bg-control object-cover"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="meta-chip">{preview.file.resolution}</span>
            <span className="meta-chip">1:1</span>
            <span className="text-caption text-tertiary-foreground">{relativeTime(preview.file.createdAt)}</span>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);
