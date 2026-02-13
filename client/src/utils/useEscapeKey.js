import { useEffect } from 'react';

/**
 * Calls `handler` when the Escape key is pressed.
 * Attach to modals, drawers, and overlays for consistent close-on-ESC.
 */
export default function useEscapeKey(handler, active = true) {
  useEffect(() => {
    if (!active || !handler) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        handler();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handler, active]);
}
