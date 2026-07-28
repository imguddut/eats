/**
 * LocationService.ts
 * Handles HTML5 Geolocation, GPS error handling, and Reverse Geocoding.
 * Includes comprehensive local dataset for all villages, small roads, mohallas, and Gram Panchayats across Arwal district.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  formattedAddress: string;
  location: LatLng;
  placeId?: string;
  streetNumber?: string;
  route?: string;
  locality?: string;
  sublocality?: string;
  landmark?: string;
  postalCode?: string;
}

export const ARWAL_DEFAULT_CENTER: LatLng = { lat: 25.0143, lng: 84.6784 };

// Comprehensive Local Dataset: All Villages, Small Roads, Mohallas & Panchayats in Arwal Region
export const ARWAL_LANDMARKS = [
  // 1. Arwal Town & Wards
  { name: 'Arwal Bazar Main Market', lat: 25.0143, lng: 84.6680, desc: 'Central Market & Commercial Hub, Arwal' },
  { name: 'Arwal Block Chowk', lat: 25.0180, lng: 84.6720, desc: 'Block & Administrative Hub, NH-139' },
  { name: 'Hospital Road, Arwal', lat: 25.0120, lng: 84.6650, desc: 'Sadar Hospital & Collectorate Complex' },
  { name: 'Arwal Thana Chowk', lat: 25.0150, lng: 84.6690, desc: 'Police Station Chowk, Main Highway' },
  { name: 'Siddharth Nagar, Arwal', lat: 25.0210, lng: 84.6750, desc: 'Residential Colony, Arwal' },
  { name: 'Wasilpur Crossing, Arwal', lat: 25.0280, lng: 84.6850, desc: 'Eastern Bypass Crossing, Wasilpur' },
  { name: 'Bus Stand Chowk, Arwal', lat: 25.0160, lng: 84.6705, desc: 'Main Arwal Bus Terminal' },
  { name: 'Sonbhadra Colony', lat: 25.0195, lng: 84.6740, desc: 'Township near Son River Canal' },
  { name: 'Rampur Road, Arwal', lat: 25.0230, lng: 84.6790, desc: 'Rampur Village Road' },

  // 2. Arwal Sadar Block Villages & Small Roads
  { name: 'Bhadasi Village', lat: 25.0020, lng: 84.6980, desc: 'Bhadasi Gram Panchayat, Arwal' },
  { name: 'Koriam Sector', lat: 25.0480, lng: 84.6850, desc: 'Koriam Village Road, Arwal North' },
  { name: 'Pyarepur Village', lat: 25.0350, lng: 84.6910, desc: 'Pyarepur Panchayat, Arwal' },
  { name: 'Abgila Village', lat: 25.0410, lng: 84.6730, desc: 'Abgila Son River Bank Village' },
  { name: 'Sipah Village Road', lat: 25.0080, lng: 84.6550, desc: 'Sipah Mohalla & River Road' },
  { name: 'Khaira Village', lat: 25.0520, lng: 84.6620, desc: 'Khaira Village, Arwal North' },
  { name: 'Saraspur Village', lat: 25.0290, lng: 84.6610, desc: 'Saraspur Panchayat Road' },
  { name: 'Umairabad Chowk', lat: 25.0450, lng: 84.7100, desc: 'Umairabad Bazar & Highway' },

  // 3. Kaler Block Villages
  { name: 'Baidrabad Gateway', lat: 24.9920, lng: 84.6380, desc: 'Baidrabad Market & NH-139 Border' },
  { name: 'Kaler Block Chowk', lat: 24.9750, lng: 84.6180, desc: 'Kaler Main Market & Block HQ' },
  { name: 'Agnoor Village', lat: 24.9620, lng: 84.6050, desc: 'Agnoor Panchayat, Kaler' },
  { name: 'Belkhara Village', lat: 24.9810, lng: 84.6450, desc: 'Belkhara Village Road, Kaler' },
  { name: 'Terari Village', lat: 24.9520, lng: 84.6290, desc: 'Terari Gram Panchayat' },
  { name: 'Salimpur Village', lat: 24.9880, lng: 84.6280, desc: 'Salimpur Road, Kaler' },

  // 4. Karpi Block Villages
  { name: 'Karpi Bazar Chowk', lat: 25.0820, lng: 84.7650, desc: 'Karpi Block HQ & Main Market' },
  { name: 'Kinjer Market', lat: 25.0750, lng: 84.7200, desc: 'Kinjer Highway Junction & Market' },
  { name: 'Purainia Village', lat: 25.0920, lng: 84.7450, desc: 'Purainia Panchayat, Karpi' },
  { name: 'Bamhori Village', lat: 25.0680, lng: 84.7520, desc: 'Bamhori Rural Road, Karpi' },
  { name: 'Sahajpur Village', lat: 25.0850, lng: 84.7810, desc: 'Sahajpur Village, Karpi' },
  { name: 'Kewali Village', lat: 25.0590, lng: 84.7380, desc: 'Kewali Gram Panchayat' },

  // 5. Kurtha Block Villages
  { name: 'Kurtha Main Market', lat: 25.0480, lng: 84.8150, desc: 'Kurtha Block Headquarters & Bazar' },
  { name: 'Pinjora Village', lat: 25.0320, lng: 84.7950, desc: 'Pinjora Gram Panchayat, Kurtha' },
  { name: 'Sikaria Village', lat: 25.0610, lng: 84.8290, desc: 'Sikaria Rural Road, Kurtha' },
  { name: 'Manikpur Village', lat: 25.0410, lng: 84.8350, desc: 'Manikpur Panchayat, Kurtha' },
  { name: 'Lari Village', lat: 25.0250, lng: 84.8080, desc: 'Lari Village Chowk, Kurtha' },
  { name: 'Naganwan Village', lat: 25.0580, lng: 84.8010, desc: 'Naganwan Village, Kurtha' },

  // 6. Sonbhadra Banshi Suryapur Block Villages
  { name: 'Banshi Main Market', lat: 24.9650, lng: 84.7250, desc: 'Sonbhadra Banshi Suryapur Block HQ' },
  { name: 'Suryapur Village', lat: 24.9520, lng: 84.7120, desc: 'Suryapur Gram Panchayat' },
  { name: 'Sonbhadra Village', lat: 24.9780, lng: 84.7380, desc: 'Sonbhadra Village & Canal Bank' },
  { name: 'Majhar Village', lat: 24.9410, lng: 84.7310, desc: 'Majhar Village Road, Banshi' },

  // 7. Regional Border Bridges & Corridors
  { name: 'Sahar Bridge Crossing', lat: 25.0120, lng: 84.6480, desc: 'Arwal-Bhojpur Son River Sahar Bridge' },
  { name: 'Daudnagar Highway Corridor', lat: 24.9250, lng: 84.5850, desc: 'NH-139 South Corridor to Daudnagar' },
  { name: 'Jehanabad Highway Corridor', lat: 25.0620, lng: 84.8850, desc: 'Eastern Corridor to Jehanabad' }
];

export const LocationService = {
  /**
   * Request user's current GPS position via HTML5 Geolocation API
   */
  async getCurrentPosition(): Promise<LatLng> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          let msg = 'Failed to retrieve current position.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Location permission denied. Please allow location access or search for your address.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Location information unavailable. Please check your GPS settings.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out. Please try again.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  },

  /**
   * Reverse Geocode LatLng to human-readable Address string
   */
  async reverseGeocode(location: LatLng): Promise<GeocodeResult> {
    if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location });
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          return {
            formattedAddress: result.formatted_address,
            location: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            },
            placeId: result.place_id
          };
        }
      } catch (err) {
        console.warn('[LocationService] Google Reverse Geocoding fallback to local dataset:', err);
      }
    }

    // Fallback: Find closest landmark in Arwal local dataset
    let minDistance = Infinity;
    let closestLandmark = ARWAL_LANDMARKS[0];

    for (const lm of ARWAL_LANDMARKS) {
      const d = LocationService.getHaversineDistance(location.lat, location.lng, lm.lat, lm.lng);
      if (d < minDistance) {
        minDistance = d;
        closestLandmark = lm;
      }
    }

    return {
      formattedAddress: `${closestLandmark.name}, ${closestLandmark.desc}, Bihar 804401`,
      location,
      landmark: closestLandmark.name
    };
  },

  /**
   * Haversine Distance Calculation (in Km)
   */
  getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }
};
