import { useState } from "react";

export type GenerationMode = "portrait" | "style-transfer";

export const useGenerationSettings = () => {
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [resolution, setResolution] = useState<string>("1K");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("portrait");

  return {
    selectedModel,
    setSelectedModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    generationMode,
    setGenerationMode,
  };
};
