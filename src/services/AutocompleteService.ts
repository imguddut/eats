/**
 * AutocompleteService.ts
 * Multi-Engine Search for Villages, Small Roads, Panchayats & Mohallas:
 * 1. Comprehensive Local Arwal Villages & Roads Dataset
 * 2. Nominatim OpenStreetMap Geocoding API with Bihar/Arwal Bounding Box
 * 3. Google Places Autocomplete API
 * Debounced by 250ms for instant responsive search.
 */

import { LatLng, ARWAL_LANDMARKS } from './LocationService';

export interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullAddress: string;
  location?: LatLng;
}

let debounceTimer: any = null;

export const AutocompleteService = {
  /**
   * Get Place & Village Suggestions with 250ms debouncing
   */
  getPlacePredictions(input: string): Promise<PlacePrediction[]> {
    return new Promise((resolve) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (!input || input.trim().length < 2) {
        resolve([]);
        return;
      }

      debounceTimer = setTimeout(async () => {
        const query = input.trim();
        const lowerQuery = query.toLowerCase();

        const results: PlacePrediction[] = [];

        // 1. Search Comprehensive Local Arwal Villages & Small Roads Dataset first for instant local match
        const localMatches = ARWAL_LANDMARKS.filter(
          (lm) =>
            lm.name.toLowerCase().includes(lowerQuery) ||
            lm.desc.toLowerCase().includes(lowerQuery) ||
            lowerQuery.split(' ').some((word) => word.length > 2 && (lm.name.toLowerCase().includes(word) || lm.desc.toLowerCase().includes(word)))
        );

        localMatches.forEach((lm, idx) => {
          results.push({
            placeId: `local-${idx}-${lm.lat}-${lm.lng}`,
            mainText: lm.name,
            secondaryText: `${lm.desc}, Bihar 804401`,
            fullAddress: `${lm.name}, ${lm.desc}, Bihar 804401`,
            location: { lat: lm.lat, lng: lm.lng }
          });
        });

        // 2. Try Google Places Autocomplete Service if configured
        if (typeof window !== 'undefined' && window.google?.maps?.places?.AutocompleteService) {
          try {
            const service = new window.google.maps.places.AutocompleteService();
            const request: google.maps.places.AutocompletionRequest = {
              input: query,
              componentRestrictions: { country: 'in' },
              locationRestriction: {
                north: 25.200,
                south: 24.900,
                east: 84.850,
                west: 84.500
              }
            };

            const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((res) => {
              service.getPlacePredictions(request, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                  res(results);
                } else {
                  res([]);
                }
              });
            });

            predictions.forEach((p) => {
              // Avoid duplicates
              if (!results.some((r) => r.mainText.toLowerCase() === (p.structured_formatting?.main_text || '').toLowerCase())) {
                results.push({
                  placeId: p.place_id,
                  mainText: p.structured_formatting?.main_text || p.description,
                  secondaryText: p.structured_formatting?.secondary_text || 'Bihar, India',
                  fullAddress: p.description
                });
              }
            });
          } catch (err) {
            console.warn('[AutocompleteService] Google Places check passed to OpenStreetMap:', err);
          }
        }

        // 3. Query Nominatim OpenStreetMap API with Arwal Bounding Box for rural villages & small roads
        try {
          const searchQuery = lowerQuery.includes('bihar') || lowerQuery.includes('arwal') ? query : `${query}, Arwal, Bihar, India`;
          const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&viewbox=84.45,24.85,84.95,25.25&limit=8`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(osmUrl, {
            headers: { 'Accept-Language': 'en' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              data.forEach((item: any, idx: number) => {
                const parts = (item.display_name || '').split(',');
                const mainText = parts[0]?.trim() || item.name || query;
                const secondaryText = parts.slice(1, 4).join(',').trim() || 'Arwal, Bihar, India';

                if (!results.some((r) => r.mainText.toLowerCase() === mainText.toLowerCase())) {
                  results.push({
                    placeId: `osm-${item.place_id || idx}-${item.lat}-${item.lon}`,
                    mainText,
                    secondaryText,
                    fullAddress: item.display_name || `${mainText}, ${secondaryText}`,
                    location: {
                      lat: parseFloat(item.lat),
                      lng: parseFloat(item.lon)
                    }
                  });
                }
              });
            }
          }
        } catch (err) {
          console.warn('[AutocompleteService] OpenStreetMap Nominatim search warning:', err);
        }

        // Fallback: If no match, create a custom entry for query
        if (results.length === 0) {
          results.push({
            placeId: `custom-${Date.now()}`,
            mainText: query.toUpperCase(),
            secondaryText: 'Arwal District, Bihar 804401',
            fullAddress: `${query}, Arwal District, Bihar 804401`,
            location: { lat: 25.0143, lng: 84.6784 }
          });
        }

        resolve(results.slice(0, 8));
      }, 250);
    });
  },

  /**
   * Fetch Place LatLng details by PlaceId
   */
  async getPlaceDetails(prediction: PlacePrediction): Promise<{ formattedAddress: string; location: LatLng }> {
    if (prediction.location) {
      return {
        formattedAddress: prediction.fullAddress,
        location: prediction.location
      };
    }

    if (typeof window !== 'undefined' && window.google?.maps?.places?.PlacesService) {
      try {
        const dummyElement = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(dummyElement);

        const place = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
          service.getDetails(
            { placeId: prediction.placeId, fields: ['formatted_address', 'geometry'] },
            (result, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && result && result.geometry?.location) {
                resolve(result);
              } else {
                reject(new Error(`PlacesService status: ${status}`));
              }
            }
          );
        });

        return {
          formattedAddress: place.formatted_address || prediction.fullAddress,
          location: {
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng()
          }
        };
      } catch (err) {
        console.warn('[AutocompleteService] Failed to fetch Place details:', err);
      }
    }

    return {
      formattedAddress: prediction.fullAddress,
      location: prediction.location || { lat: 25.0143, lng: 84.6784 }
    };
  }
};
