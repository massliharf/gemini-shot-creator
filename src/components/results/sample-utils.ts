import { sampleFolders, type SamplePack } from "@/data/mock";

/** Sample "generated at" time for a pack, borrowed from the matching sample folder. */
export const samplePackCreatedAt = (pack: SamplePack) =>
  sampleFolders.find((f) => f.name === pack.pack.meta.pack_id)?.createdAt;

/** Scene progress of a sample pack. */
export const samplePackProgress = (pack: SamplePack) => {
  const done = pack.scenes.filter((s) => s.status === "success" && s.imageUrl).length;
  return { done, total: pack.scenes.length, complete: done === pack.scenes.length };
};
