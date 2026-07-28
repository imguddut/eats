import { DeliveryChargeSlab } from '../types';

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

/**
 * Calculate delivery fee based on meter rate (0.007 rs/meter):
 * 0 - 3 km: ₹0 (Free)
 * > 3 km to 15 km: distance_in_meters * 0.007 rs/m
 * > 15 km: null ("not our service area")
 */
export const calculateDeliveryFee = (distance: number, slabs?: DeliveryChargeSlab[]): number | null => {
  if (distance > 15) return null; // not our service area
  if (distance <= 3) return 0; // free delivery

  const meters = Math.round(distance * 1000);
  return Math.round(meters * 0.007);
};
