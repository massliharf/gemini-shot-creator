import { useState } from "react";

export const useGenerationSettings = () => {
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [resolution, setResolution] = useState<string>("1K");

  return {
    selectedModel,
    setSelectedModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
  };
};
