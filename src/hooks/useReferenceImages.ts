import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COUPLE_MODE_KEY = "reference-images-couple-mode";

export const useReferenceImages = () => {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [secondReferenceImage, setSecondReferenceImage] = useState<File | null>(null);
  const [secondReferencePreviewUrl, setSecondReferencePreviewUrl] = useState<string | null>(null);
  const [coupleMode, setCoupleMode] = useState(() => {
    try {
      return localStorage.getItem(COUPLE_MODE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Persist couple mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COUPLE_MODE_KEY, coupleMode ? "true" : "false");
    } catch {
      // Ignore storage errors
    }
  }, [coupleMode]);

  // Restore reference images from Supabase storage on mount
  useEffect(() => {
    const restoreImages = async () => {
      try {
        // Check for primary reference image
        const { data: primaryData } = await supabase.storage
          .from('generated-images')
          .createSignedUrl('reference/reference-face.jpg', 3600);

        if (primaryData?.signedUrl) {
          setReferencePreviewUrl(primaryData.signedUrl);
        }

        // Check for secondary reference image
        const { data: secondaryData } = await supabase.storage
          .from('generated-images')
          .createSignedUrl('reference/reference-face-2.jpg', 3600);

        if (secondaryData?.signedUrl) {
          setSecondReferencePreviewUrl(secondaryData.signedUrl);
        }
      } catch (error) {
        console.warn("Failed to restore reference images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreImages();
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (referencePreviewUrl && referencePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(referencePreviewUrl);
    }
    setReferencePreviewUrl(previewUrl);
    setReferenceImage(file);

    const { data: existingFiles } = await supabase.storage
      .from('generated-images')
      .list('reference');

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles
        .filter(f => f.name === 'reference-face.jpg')
        .map(f => `reference/${f.name}`);
      if (filesToRemove.length > 0) {
        await supabase.storage
          .from('generated-images')
          .remove(filesToRemove);
      }
    }

    const { error } = await supabase.storage
      .from('generated-images')
      .upload(`reference/reference-face.jpg`, file, { upsert: true });

    if (error) {
      toast.error('Failed to upload reference image');
      console.error(error);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setReferencePreviewUrl(null);
      setReferenceImage(null);
      return;
    }

    toast.success('Reference image uploaded');
  }, [referencePreviewUrl]);

  const handleImageClear = useCallback(async () => {
    await supabase.storage
      .from('generated-images')
      .remove(['reference/reference-face.jpg']);

    if (referencePreviewUrl && referencePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(referencePreviewUrl);
    }
    setReferencePreviewUrl(null);
    setReferenceImage(null);
    toast.success('Reference image cleared');
  }, [referencePreviewUrl]);

  const handleSecondImageUpload = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (secondReferencePreviewUrl && secondReferencePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(secondReferencePreviewUrl);
    }
    setSecondReferencePreviewUrl(previewUrl);
    setSecondReferenceImage(file);

    const { error } = await supabase.storage
      .from('generated-images')
      .upload(`reference/reference-face-2.jpg`, file, { upsert: true });

    if (error) {
      toast.error('Failed to upload second reference image');
      console.error(error);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSecondReferencePreviewUrl(null);
      setSecondReferenceImage(null);
      return;
    }

    toast.success('Second reference image uploaded');
  }, [secondReferencePreviewUrl]);

  const handleSecondImageClear = useCallback(async () => {
    await supabase.storage
      .from('generated-images')
      .remove(['reference/reference-face-2.jpg']);

    if (secondReferencePreviewUrl && secondReferencePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(secondReferencePreviewUrl);
    }
    setSecondReferencePreviewUrl(null);
    setSecondReferenceImage(null);
    toast.success('Second reference image cleared');
  }, [secondReferencePreviewUrl]);

  const clearAll = useCallback(async () => {
    // Clear from storage
    await supabase.storage
      .from('generated-images')
      .remove(['reference/reference-face.jpg', 'reference/reference-face-2.jpg']);

    if (referencePreviewUrl && referencePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(referencePreviewUrl);
    }
    if (secondReferencePreviewUrl && secondReferencePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(secondReferencePreviewUrl);
    }
    setReferenceImage(null);
    setReferencePreviewUrl(null);
    setSecondReferenceImage(null);
    setSecondReferencePreviewUrl(null);
  }, [referencePreviewUrl, secondReferencePreviewUrl]);

  return {
    referenceImage,
    referencePreviewUrl,
    secondReferenceImage,
    secondReferencePreviewUrl,
    coupleMode,
    setCoupleMode,
    handleImageUpload,
    handleImageClear,
    handleSecondImageUpload,
    handleSecondImageClear,
    clearAll,
    isLoading,
  };
};
