/**
 * GoogleMapsLoader.ts
 * Manages lazy loading of Google Maps JS API script with places, geometry, and routes libraries.
 * Provides fallback detection and cost optimization.
 */

let isScriptLoading = false;
let scriptLoadPromise: Promise<boolean> | null = null;

export const getGoogleMapsApiKey = (): string => {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    localStorage.getItem('arwaleats_google_maps_key') ||
    ''
  );
};

export const isGoogleMapsConfigured = (): boolean => {
  const key = getGoogleMapsApiKey();
  return Boolean(key && key !== 'YOUR_API_KEY');
};

export const isGoogleMapsLoaded = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.google?.maps);
};

export const loadGoogleMapsScript = (): Promise<boolean> => {
  if (isGoogleMapsLoaded()) {
    return Promise.resolve(true);
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey || apiKey === 'YOUR_API_KEY') {
    console.warn('[GoogleMapsLoader] No valid Google Maps API Key found in .env (VITE_GOOGLE_MAPS_PLATFORM_KEY). Operating with Smart Landmark & GPS Fallback.');
    return Promise.resolve(false);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve) => {
    // Check if script element already exists in DOM
    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,routes&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('[GoogleMapsLoader] Google Maps JavaScript SDK loaded successfully.');
      resolve(true);
    };

    script.onerror = (err) => {
      console.error('[GoogleMapsLoader] Failed to load Google Maps SDK:', err);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};
