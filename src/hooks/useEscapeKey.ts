import { useEffect } from 'react';

/**
 * A custom hook that calls the provided callback when the ESC key is pressed
 * @param callback Function to call when ESC key is pressed
 */
const useEscapeKey = (callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback]);
};

export default useEscapeKey;