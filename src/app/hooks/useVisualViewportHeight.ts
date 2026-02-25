import { useEffect, useState } from 'react';

/**
 * Returns a CSS height value that tracks the visual viewport height.
 * On mobile, this shrinks when the virtual keyboard opens,
 * preventing the grey gap between content and keyboard.
 */
export function useVisualViewportHeight() {
  const [height, setHeight] = useState('100dvh');

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setHeight(`${vv.height}px`);
    };

    // Set initial value
    update();

    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return height;
}
