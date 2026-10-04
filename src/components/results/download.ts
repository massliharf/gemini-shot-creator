import { toast } from "sonner";
import { triggerDownload } from "@/lib/download-utils";

/** Turns free text into a short, file-system safe name. */
export const toFileName = (text: string, ext = "jpg") =>
  `${text.substring(0, 40).trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "image"}.${ext}`;

/** Downloads an image URL (same-origin or CORS-enabled) as a file. */
export const downloadImage = async (url: string, name: string) => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(String(resp.status));
    const blob = await resp.blob();
    const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, toFileName(name, ext));
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    toast.error("Download failed");
  }
};
