import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useReferenceImages = () => {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [secondReferenceImage, setSecondReferenceImage] = useState<File | null>(null);
  const [secondReferencePreviewUrl, setSecondReferencePreviewUrl] = useState<string | null>(null);
  const [coupleMode, setCoupleMode] = useState(false);

  const handleImageUpload = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl(previewUrl);
    setReferenceImage(file);

    const { data: existingFiles } = await supabase.storage
      .from('generated-images')
      .list('reference');

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(f => `reference/${f.name}`);
      await supabase.storage
        .from('generated-images')
        .remove(filesToRemove);
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

    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl(null);
    setReferenceImage(null);
    toast.success('Reference image cleared');
  }, [referencePreviewUrl]);

  const handleSecondImageUpload = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (secondReferencePreviewUrl) URL.revokeObjectURL(secondReferencePreviewUrl);
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

    if (secondReferencePreviewUrl) URL.revokeObjectURL(secondReferencePreviewUrl);
    setSecondReferencePreviewUrl(null);
    setSecondReferenceImage(null);
    toast.success('Second reference image cleared');
  }, [secondReferencePreviewUrl]);

  const clearAll = useCallback(() => {
    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    if (secondReferencePreviewUrl) URL.revokeObjectURL(secondReferencePreviewUrl);
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
  };
};
