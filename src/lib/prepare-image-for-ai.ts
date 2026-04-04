const MAX_ANALYSIS_DIMENSION = 1280;
const ANALYSIS_IMAGE_QUALITY = 0.82;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = src;
  });

export const prepareImageForAi = async (
  file: File,
): Promise<{ base64: string; mimeType: string }> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(
      MAX_ANALYSIS_DIMENSION / image.width,
      MAX_ANALYSIS_DIMENSION / image.height,
      1,
    );

    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable");
    }

    context.drawImage(image, 0, 0, width, height);

    const mimeType = "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, ANALYSIS_IMAGE_QUALITY);
    const base64 = dataUrl.split(",")[1];

    if (!base64) {
      throw new Error("Image encoding failed");
    }

    return { base64, mimeType };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};