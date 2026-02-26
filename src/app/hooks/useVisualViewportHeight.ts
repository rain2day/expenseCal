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
      // iOS Safari can scroll the window behind a fixed overlay when
      // the keyboard opens; reset it so the overlay doesn't get stuck.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    // Set initial value
    update();

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
