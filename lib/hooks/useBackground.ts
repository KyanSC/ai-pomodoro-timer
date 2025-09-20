import { useState, useCallback } from 'react';

interface UseBackgroundReturn {
  currentBackground: string | null;
  setBackground: (url: string) => Promise<void>;
  clearBackground: () => void;
}

export function useBackground(): UseBackgroundReturn {
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);

  const setBackground = useCallback(async (url: string) => {
    try {
      // Preload the image
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      // Apply the background with smooth transition
      setCurrentBackground(url);
    } catch (error) {
      console.error('Failed to load background image:', error);
      throw new Error('Failed to load background image');
    }
  }, []);

  const clearBackground = useCallback(() => {
    setCurrentBackground(null);
  }, []);

  return {
    currentBackground,
    setBackground,
    clearBackground,
  };
}
