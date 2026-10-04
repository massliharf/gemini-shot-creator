import { sampleFolders } from "@/data/mock";

/** Totals for the My Library header while the sample library is shown. */
export const sampleLibraryStats = {
  folders: sampleFolders.length,
  files: sampleFolders.reduce((sum, f) => sum + f.files, 0),
};
