/**
 * Safely dispatches a custom event, compatible with environments where 
 * CustomEvent constructor is not directly constructible (e.g. older browsers, 
 * certain sandboxed iframes).
 */
export function safeDispatchEvent(eventName: string, detail?: any) {
  if (typeof window === 'undefined') return;
  try {
    let event: any;
    if (typeof window.CustomEvent === 'function') {
      try {
        event = new CustomEvent(eventName, { detail });
      } catch (e) {
        // Fallback for environments where CustomEvent exists but calling its constructor fails
        event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventName, true, true, detail);
      }
    } else {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(eventName, true, true, detail);
    }
    window.dispatchEvent(event);
  } catch (err) {
    console.error(`Failed to dispatch safe custom event "${eventName}":`, err);
  }
}
