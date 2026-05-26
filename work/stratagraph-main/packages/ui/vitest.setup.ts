/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for jsdom environment
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom doesn't implement matchMedia; ScrollArea's useTouchPrimary hook reads it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {},
    }),
  });
}

// jsdom doesn't implement Element.prototype.getAnimations; Base UI's ScrollArea
// queries it to wait for CSS animations before sizing the thumb.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => [];
}

// Force Base UI's useAnimationsFinished utility to use the synchronous fast-path
// in tests. Without this, defining getAnimations above would make Menu/Popup
// dismissal wait for animation frames + promises that never settle in jsdom,
// breaking Escape-to-close tests. See @base-ui/react/utils/useAnimationsFinished.js
// line 42: `if (... || globalThis.BASE_UI_ANIMATIONS_DISABLED) { fnToExecute(); }`.
(globalThis as { BASE_UI_ANIMATIONS_DISABLED?: boolean }).BASE_UI_ANIMATIONS_DISABLED = true;
