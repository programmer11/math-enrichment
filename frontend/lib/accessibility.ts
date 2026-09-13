export interface AccessibilityPrefs {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  dyslexiaFriendly: boolean;
  largeTargets: boolean;
}

export const DEFAULT_A11Y_PREFS: AccessibilityPrefs = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  dyslexiaFriendly: false,
  largeTargets: false,
};

/** Multiplier applied to key font-size values when "large text" is on. */
export function getFontScale(prefs: AccessibilityPrefs): number {
  return prefs.largeText ? 1.25 : 1;
}
