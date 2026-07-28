/**
 * DeliveryCalculator.ts
 * Dynamic Delivery Pricing Calculator:
 * - 0 - 3 km: ₹0 (FREE Delivery)
 * - > 3 km to 15 km: ₹0.007 per meter (0.007rs/m)
 * - > 15 km: "not our service area"
 */

import { DeliveryChargeSlab } from '../types';

export interface DeliveryCalculationResult {
  isDeliverable: boolean;
  deliveryFee: number;
  distanceKm: number;
  zoneName: string;
  zoneColor: string; // 'green' | 'yellow' | 'orange' | 'red' | 'gray'
  zoneBadgeText: string;
  rejectionReason?: string;
}

export const MAX_DELIVERY_RADIUS_KM = 15;

export const DeliveryCalculator = {
  /**
   * Calculate Delivery Fee & Eligibility from Distance
   */
  calculate(distanceKm: number, customSlabs?: DeliveryChargeSlab[], maxRadius = MAX_DELIVERY_RADIUS_KM): DeliveryCalculationResult {
    // 1. Out of service area (> 15 km)
    if (distanceKm > maxRadius) {
      return {
        isDeliverable: false,
        deliveryFee: 0,
        distanceKm,
        zoneName: 'not our service area',
        zoneColor: 'gray',
        zoneBadgeText: '❌ not our service area',
        rejectionReason: 'not our service area'
      };
    }

    // 2. Free Delivery (0 - 3 km)
    if (distanceKm <= 3.0) {
      return {
        isDeliverable: true,
        deliveryFee: 0,
        distanceKm,
        zoneName: 'Arwal Local (0 - 3 km)',
        zoneColor: 'green',
        zoneBadgeText: '🎉 FREE Delivery'
      };
    }

    // 3. Distance > 3 km: 0.007 rs/meter
    const distanceMeters = Math.round(distanceKm * 1000);
    const fee = Math.round(distanceMeters * 0.007);
    const zoneColor = distanceKm <= 6 ? 'yellow' : distanceKm <= 10 ? 'orange' : 'red';

    return {
      isDeliverable: true,
      deliveryFee: fee,
      distanceKm,
      zoneName: `Distance ${distanceKm} km`,
      zoneColor,
      zoneBadgeText: `₹${fee} Delivery`
    };
  }
};
