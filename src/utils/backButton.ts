type BackHandler = () => boolean;

interface ExtendedWindow extends Window {
  backHandlers?: BackHandler[];
}

const getBackHandlers = (): BackHandler[] => {
  const w = window as unknown as ExtendedWindow;
  if (!w.backHandlers) {
    w.backHandlers = [];
  }
  return w.backHandlers;
};

/**
 * Registers a back button handler. Handlers are evaluated in LIFO (Last-In, First-Out) order.
 * If a handler returns true, it means it has handled the back press (e.g. closed a modal).
 * If it returns false, the next handler in the stack is evaluated.
 * 
 * @param handler A function that returns true if handled, false otherwise.
 * @returns A cleanup function to unregister the handler.
 */
export function registerBackButtonHandler(handler: BackHandler): () => void {
  const handlers = getBackHandlers();
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
  };
}

/**
 * Dispatches a back press and returns whether it was handled.
 */
export function handleBackPress(): boolean {
  const handlers = getBackHandlers();
  // Iterate from last to first
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      if (handlers[i]()) {
        return true;
      }
    } catch (e) {
      console.error("Error in back button handler:", e);
    }
  }
  return false;
}
