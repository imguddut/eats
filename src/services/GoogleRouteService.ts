/**
 * GoogleRouteService.ts
 * Driving Road Distance & Routing Service:
 * Calculates driving distance strictly based on actual road networks (not straight-line as-the-crow-flies).
 * 1. Google Directions Service API (if active)
 * 2. OSRM (Open Source Routing Machine) Driving Network API (free, precise road driving distance & polyline)
 * 3. Smart 1.30x Road Winding Factor Fallback
 */

import { LatLng, LocationService } from './LocationService';

export interface RouteResult {
  distanceKm: number;
  durationMins: number;
  durationText: string;
  distanceText: string;
  path: LatLng[];
  routeSummary: string;
  isDrivingRoute: boolean;
}

export const GoogleRouteService = {
  /**
   * Calculate Road Driving Distance & Route between origin (Restaurant) and destination (Customer)
   */
  async calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    // 1. Google Directions API
    if (typeof window !== 'undefined' && window.google?.maps?.DirectionsService) {
      try {
        const directionsService = new window.google.maps.DirectionsService();
        const request: google.maps.DirectionsRequest = {
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS
          }
        };

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(request, (response, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && response) {
              resolve(response);
            } else {
              reject(new Error(`Directions API status: ${status}`));
            }
          });
        });

        const route = result.routes[0];
        const leg = route.legs[0];

        const distanceMeters = leg.distance?.value || 0;
        const durationSeconds = leg.duration_in_traffic?.value || leg.duration?.value || 0;

        const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));
        const prepTimeBuffer = 12; // 12 mins kitchen prep time
        const drivingMins = Math.ceil(durationSeconds / 60);
        const totalEtaMins = drivingMins + prepTimeBuffer;

        const path: LatLng[] = route.overview_path.map((point) => ({
          lat: point.lat(),
          lng: point.lng()
        }));

        return {
          distanceKm,
          durationMins: totalEtaMins,
          distanceText: leg.distance?.text || `${distanceKm} km`,
          durationText: `${Math.max(15, totalEtaMins - 4)}-${totalEtaMins + 4} mins`,
          path,
          routeSummary: route.summary || `Driving via Road (${distanceKm} km)`,
          isDrivingRoute: true
        };
      } catch (err) {
        console.warn('[GoogleRouteService] Google Directions API request passed to OSRM Road Router:', err);
      }
    }

    // 2. OSRM Road Driving Network API (Calculates exact road distance following streets & turns)
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const osrmRoute = data.routes[0];
          const roadDistanceKm = parseFloat((osrmRoute.distance / 1000).toFixed(2));
          const drivingSeconds = osrmRoute.duration || (roadDistanceKm / 30) * 3600;
          
          const drivingMins = Math.ceil(drivingSeconds / 60);
          const prepTimeBuffer = 12;
          const totalEtaMins = drivingMins + prepTimeBuffer;

          const coordinates: [number, number][] = osrmRoute.geometry?.coordinates || [];
          const path: LatLng[] = coordinates.map((coord) => ({
            lat: coord[1],
            lng: coord[0]
          }));

          return {
            distanceKm: roadDistanceKm,
            durationMins: totalEtaMins,
            distanceText: `${roadDistanceKm} km`,
            durationText: `${Math.max(15, totalEtaMins - 4)}-${totalEtaMins + 4} mins`,
            path: path.length > 0 ? path : [origin, destination],
            routeSummary: `Driving via Road (${roadDistanceKm} km)`,
            isDrivingRoute: true
          };
        }
      }
    } catch (err) {
      console.warn('[GoogleRouteService] OSRM Road Router fallback warning:', err);
    }

    // 3. Fallback: Apply 1.30x Road Winding Factor to straight-line distance
    const straightLineKm = LocationService.getHaversineDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );

    // Multiply straight line by 1.30 to approximate real road driving distance
    const roadDistanceKm = parseFloat((straightLineKm * 1.30).toFixed(2));
    const estDrivingMins = Math.ceil((roadDistanceKm / 25) * 60) + 12;

    return {
      distanceKm: roadDistanceKm,
      durationMins: estDrivingMins,
      distanceText: `${roadDistanceKm} km`,
      durationText: `${Math.max(15, estDrivingMins - 4)}-${estDrivingMins + 4} mins`,
      path: [origin, destination],
      routeSummary: `Estimated Road Distance (${roadDistanceKm} km)`,
      isDrivingRoute: false
    };
  }
};
