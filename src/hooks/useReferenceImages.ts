import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_IMAGES = 5;
const STORAGE_KEY = "reference-images-count";

export interface ReferenceImage {
  file: File | null;
  previewUrl: string | null;
  storagePath: string;
}

export const useReferenceImages = () => {
  const [images, setImages] = useState<ReferenceImage[]>([
    { file: null, previewUrl: null, storagePath: "reference/reference-face.jpg" },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore reference images from Supabase storage on mount
  useEffect(() => {
    const restoreImages = async () => {
      try {
        // List all files in reference folder
        const { data: files } = await supabase.storage
          .from('generated-images')
          .list('reference');

        if (!files || files.length === 0) {
          setIsLoading(false);
          return;
        }

        // Sort files to maintain order (reference-face.jpg, reference-face-2.jpg, etc.)
        const sortedFiles = files
          .filter(f => f.name.startsWith('reference-face'))
          .sort((a, b) => {
            const numA = a.name === 'reference-face.jpg' ? 1 : parseInt(a.name.match(/-(\d+)\.jpg$/)?.[1] || '0');
            const numB = b.name === 'reference-face.jpg' ? 1 : parseInt(b.name.match(/-(\d+)\.jpg$/)?.[1] || '0');
            return numA - numB;
          });

        const restoredImages: ReferenceImage[] = [];

        for (const file of sortedFiles) {
          const storagePath = `reference/${file.name}`;
          const { data } = await supabase.storage
            .from('generated-images')
            .createSignedUrl(storagePath, 3600);

          if (data?.signedUrl) {
            restoredImages.push({
              file: null,
              previewUrl: data.signedUrl,
              storagePath,
            });
          }
        }

        if (restoredImages.length > 0) {
          setImages(restoredImages);
        }
      } catch (error) {
        console.warn("Failed to restore reference images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreImages();
  }, []);

  const getStoragePath = (index: number): string => {
    if (index === 0) return "reference/reference-face.jpg";
    return `reference/reference-face-${index + 1}.jpg`;
  };

  const handleImageUpload = useCallback(async (file: File, index: number = 0) => {
    const previewUrl = URL.createObjectURL(file);
    const storagePath = getStoragePath(index);

    // Update local state
    setImages(prev => {
      const updated = [...prev];
      // Revoke old blob URL
      if (updated[index]?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].previewUrl!);
      }
      updated[index] = { file, previewUrl, storagePath };
      return updated;
    });

    // Upload to storage
    const { error } = await supabase.storage
      .from('generated-images')
      .upload(storagePath, file, { upsert: true });

    if (error) {
      toast.error(`Failed to upload image ${index + 1}`);
      console.error(error);
      URL.revokeObjectURL(previewUrl);
      setImages(prev => {
        const updated = [...prev];
        updated[index] = { file: null, previewUrl: null, storagePath };
        return updated;
      });
      return;
    }

    toast.success(`Reference image ${index + 1} uploaded`);
  }, []);

  const handleImageClear = useCallback(async (index: number) => {
    const image = images[index];
    if (!image) return;

    // Remove from storage
    await supabase.storage
      .from('generated-images')
      .remove([image.storagePath]);

    // Revoke blob URL
    if (image.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(image.previewUrl);
    }

    setImages(prev => {
      const updated = [...prev];
      // If this is the only image, just clear it
      if (updated.length === 1) {
        updated[0] = { file: null, previewUrl: null, storagePath: getStoragePath(0) };
      } else {
        // Remove the image and reindex remaining ones
        updated.splice(index, 1);
      }
      return updated;
    });

    toast.success('Reference image removed');
  }, [images]);

  const addImageSlot = useCallback(() => {
    if (images.length >= MAX_IMAGES) {
      toast.info(`Maximum ${MAX_IMAGES} reference images allowed`);
      return;
    }

    setImages(prev => [
      ...prev,
      { file: null, previewUrl: null, storagePath: getStoragePath(prev.length) },
    ]);
  }, [images.length]);

  const clearAll = useCallback(async () => {
    // Build paths to remove
    const pathsToRemove = images
      .filter(img => img.previewUrl)
      .map(img => img.storagePath);

    if (pathsToRemove.length > 0) {
      await supabase.storage
        .from('generated-images')
        .remove(pathsToRemove);
    }

    // Revoke all blob URLs
    images.forEach(img => {
      if (img.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });

    setImages([{ file: null, previewUrl: null, storagePath: getStoragePath(0) }]);
  }, [images]);

  // Computed values for backward compatibility
  // Check both file and previewUrl since restored images only have previewUrl
  const referenceImage = images[0]?.file ?? (images[0]?.previewUrl ? images[0] : null);
  const referencePreviewUrl = images[0]?.previewUrl ?? null;
  const secondReferenceImage = images[1]?.file ?? (images[1]?.previewUrl ? images[1] : null);
  const secondReferencePreviewUrl = images[1]?.previewUrl ?? null;
  
  // Helper to check if we have any valid reference image
  const hasValidReferenceImage = images.some(img => img.file || img.previewUrl);

  // Legacy handlers for backward compatibility
  const handlePrimaryImageUpload = useCallback((file: File) => handleImageUpload(file, 0), [handleImageUpload]);
  const handlePrimaryImageClear = useCallback(() => handleImageClear(0), [handleImageClear]);
  const handleSecondImageUpload = useCallback((file: File) => handleImageUpload(file, 1), [handleImageUpload]);
  const handleSecondImageClear = useCallback(() => handleImageClear(1), [handleImageClear]);

  return {
    // New multi-image API
    images,
    handleImageUpload,
    handleImageClear,
    addImageSlot,
    clearAll,
    isLoading,
    maxImages: MAX_IMAGES,
    hasValidReferenceImage,

    // Legacy compatibility (for couple mode migration)
    referenceImage,
    referencePreviewUrl,
    secondReferenceImage,
    secondReferencePreviewUrl,
    handlePrimaryImageUpload,
    handlePrimaryImageClear,
    handleSecondImageUpload,
    handleSecondImageClear,
  };
};
