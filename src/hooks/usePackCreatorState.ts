import { useState, useEffect, useCallback } from "react";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: 'pending' | 'generating' | 'success' | 'saved' | 'error';
  pack?: any;
  error?: string;
}

interface GeneratedPack {
  id: string;
  pack: any;
  saved: boolean;
  error?: string;
}

type PackType = "photography" | "god-eye" | "artist" | "eye" | "3d" | "artisto" | "reverse" | "portrait-clone" | "dop-architect" | "all-seeing-eye";
type Gender = "male" | "female" | "unisex";

interface PackCreatorState {
  inputMode: "image" | "text";
  textPrompt: string;
  packType: PackType;
  sceneCount: number;
  category: string;
  subcategory: string;
  gender: Gender;
  showAdvanced: boolean;
  selectedInfluences: string[];
  lightingPreference: string;
  colorPalette: string;
  generatedPacks: GeneratedPack[];
}

const STORAGE_KEY = "pack-creator-state";
const IMAGES_STORAGE_KEY = "pack-creator-images";

const DEFAULT_STATE: PackCreatorState = {
  inputMode: "image",
  textPrompt: "",
  packType: "photography",
  sceneCount: 12,
  category: "Portrait",
  subcategory: "",
  gender: "unisex",
  showAdvanced: false,
  selectedInfluences: [],
  lightingPreference: "",
  colorPalette: "",
  generatedPacks: [],
};

export function usePackCreatorState() {
  // Initialize state from localStorage
  const [state, setState] = useState<PackCreatorState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load pack creator state:", e);
    }
    return DEFAULT_STATE;
  });

  // Separate state for images (can't store File objects in localStorage)
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load image previews from localStorage on mount
  useEffect(() => {
    try {
      const savedImages = localStorage.getItem(IMAGES_STORAGE_KEY);
      if (savedImages) {
        const parsed = JSON.parse(savedImages) as Array<{
          id: string;
          base64: string;
          status: UploadedImage['status'];
          error?: string;
        }>;
        
        // Reconstruct images from base64
        const reconstructed: UploadedImage[] = parsed.map(img => ({
          id: img.id,
          file: null as unknown as File, // File can't be persisted
          preview: img.base64, // Use base64 as preview
          base64: img.base64,
          status: img.status === 'generating' ? 'pending' : img.status, // Reset generating to pending
          error: img.error,
        }));
        
        setImages(reconstructed);
      }
    } catch (e) {
      console.warn("Failed to load images:", e);
    }
    setImagesLoaded(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save pack creator state:", e);
    }
  }, [state]);

  // Save images to localStorage (base64 only)
  useEffect(() => {
    if (!imagesLoaded) return;
    
    try {
      const toSave = images.map(img => ({
        id: img.id,
        base64: img.base64,
        status: img.status,
        error: img.error,
      }));
      localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("Failed to save images:", e);
    }
  }, [images, imagesLoaded]);

  // Setters
  const setInputMode = useCallback((mode: "image" | "text") => {
    setState(prev => ({ ...prev, inputMode: mode }));
  }, []);

  const setTextPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, textPrompt: prompt }));
  }, []);

  const setPackType = useCallback((type: PackType) => {
    setState(prev => ({ ...prev, packType: type }));
  }, []);

  const setSceneCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, sceneCount: count }));
  }, []);

  const setCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, category }));
  }, []);

  const setSubcategory = useCallback((subcategory: string) => {
    setState(prev => ({ ...prev, subcategory }));
  }, []);

  const setGender = useCallback((gender: Gender) => {
    setState(prev => ({ ...prev, gender }));
  }, []);

  const setShowAdvanced = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showAdvanced: show }));
  }, []);

  const setSelectedInfluences = useCallback((influences: string[] | ((prev: string[]) => string[])) => {
    setState(prev => ({
      ...prev,
      selectedInfluences: typeof influences === 'function' ? influences(prev.selectedInfluences) : influences,
    }));
  }, []);

  const setLightingPreference = useCallback((pref: string) => {
    setState(prev => ({ ...prev, lightingPreference: pref }));
  }, []);

  const setColorPalette = useCallback((palette: string) => {
    setState(prev => ({ ...prev, colorPalette: palette }));
  }, []);

  const setGeneratedPacks = useCallback((packs: GeneratedPack[] | ((prev: GeneratedPack[]) => GeneratedPack[])) => {
    setState(prev => ({
      ...prev,
      generatedPacks: typeof packs === 'function' ? packs(prev.generatedPacks) : packs,
    }));
  }, []);

  // Clear all state
  const clearState = useCallback(() => {
    setState(DEFAULT_STATE);
    setImages([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(IMAGES_STORAGE_KEY);
  }, []);

  return {
    // State values
    inputMode: state.inputMode,
    textPrompt: state.textPrompt,
    packType: state.packType,
    sceneCount: state.sceneCount,
    category: state.category,
    subcategory: state.subcategory,
    gender: state.gender,
    showAdvanced: state.showAdvanced,
    selectedInfluences: state.selectedInfluences,
    lightingPreference: state.lightingPreference,
    colorPalette: state.colorPalette,
    generatedPacks: state.generatedPacks,
    
    // Setters
    setInputMode,
    setTextPrompt,
    setPackType,
    setSceneCount,
    setCategory,
    setSubcategory,
    setGender,
    setShowAdvanced,
    setSelectedInfluences,
    setLightingPreference,
    setColorPalette,
    setGeneratedPacks,
    
    // Images (separate)
    images,
    setImages,
    
    // Utilities
    clearState,
  };
}
