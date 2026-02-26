import { useEffect, useRef, useState } from 'react';

/**
 * Returns a CSS height value that tracks the visual viewport height.
 * On mobile, this shrinks when the virtual keyboard opens,
 * preventing the grey gap between content and keyboard.
 */
export function useVisualViewportHeight() {
  const [height, setHeight] = useState('100dvh');
  const scrollResetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setHeight(`${vv.height}px`);

      // iOS Safari can scroll the window behind a fixed overlay when the
      // keyboard opens.  Reset it, but with a delay so we don't interfere
      // with touch-event processing (which caused "tap does nothing" bugs).
      clearTimeout(scrollResetTimer.current);
      scrollResetTimer.current = setTimeout(() => {
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      }, 120);
    };

    // Set initial value
    update();

    // Only listen to resize (keyboard open/close).
    // The scroll event fired too often and swallowed touch events.
    vv.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      clearTimeout(scrollResetTimer.current);
    };
  }, []);

  return height;
}
