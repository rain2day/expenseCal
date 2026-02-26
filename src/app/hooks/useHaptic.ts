/**
 * Haptic Feedback Utility
 * Uses the Vibration API (navigator.vibrate) for tactile feedback on mobile devices.
 * Falls back silently on devices that don't support it.
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Lightweight tap — tabs, toggles, avatar selection */
export function hapticLight() {
  vibrate(8);
}

/** Medium press — buttons, FAB, card taps */
export function hapticMedium() {
  vibrate(18);
}

/** Heavy press — important destructive actions */
export function hapticHeavy() {
  vibrate(30);
}

/** Success pattern — double pulse */
export function hapticSuccess() {
  vibrate([10, 60, 12]);
}

/** Error pattern — triple buzz */
export function hapticError() {
  vibrate([18, 40, 18, 40, 18]);
}

/** Selection tick — very light, for scrolling lists */
export function hapticSelection() {
  vibrate(4);
}

/**
 * Hook that returns all haptic methods.
 * Can also be imported individually as standalone functions.
 */
export function useHaptic() {
  return {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    error: hapticError,
    selection: hapticSelection,
  };
}
