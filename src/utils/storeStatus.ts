import { RestaurantSettings, Restaurant } from '../types';

export interface StoreStatus {
  isOpen: boolean;
  isManuallyClosed: boolean;
  isAutoClosed: boolean;
  message: string;
}

/**
 * Parses time strings like "11:00 AM", "11:30 PM", "11 AM", "23:00" into absolute minutes since midnight.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  try {
    const cleanStr = timeStr.trim().toUpperCase();
    const match = cleanStr.match(/^(\d+)(?::(\d+))?\s*(AM|PM)?$/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];

    if (ampm) {
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  } catch (e) {
    console.error('Failed to parse time string:', timeStr, e);
    return null;
  }
}

/**
 * Evaluates the current operational status of the global store.
 */
export function getStoreStatus(settings: RestaurantSettings | null): StoreStatus {
  const defaultClosedMessage = 'We are currently closed. Please check back during our opening hours!';
  
  if (!settings) {
    return {
      isOpen: true,
      isManuallyClosed: false,
      isAutoClosed: false,
      message: '',
    };
  }

  // 1. Check manual override first
  if (settings.isClosed) {
    return {
      isOpen: false,
      isManuallyClosed: true,
      isAutoClosed: false,
      message: settings.closedMessage || defaultClosedMessage,
    };
  }

  // 2. Check automated scheduled hours in Indian Standard Time (IST, UTC+5:30)
  const now = new Date();
  let istHours = now.getUTCHours() + 5;
  let istMinutes = now.getUTCMinutes() + 30;
  if (istMinutes >= 60) {
    istHours += 1;
    istMinutes -= 60;
  }
  if (istHours >= 24) {
    istHours -= 24;
  }
  const currentMinutes = istHours * 60 + istMinutes;

  const openMinutes = parseTimeToMinutes(settings.openingTime);
  const closeMinutes = parseTimeToMinutes(settings.closingTime);

  // If time configuration is invalid or missing, fallback to open
  if (openMinutes === null || closeMinutes === null) {
    return {
      isOpen: true,
      isManuallyClosed: false,
      isAutoClosed: false,
      message: '',
    };
  }

  let isWithinHours = false;
  if (closeMinutes > openMinutes) {
    // Normal daytime shift, e.g., 11:00 AM to 11:00 PM (660 to 1380 mins)
    isWithinHours = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } else {
    // Overnight shift, e.g., 11:00 PM to 2:00 AM (1380 to 120 mins)
    isWithinHours = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  const ampmStr = istHours >= 12 ? 'PM' : 'AM';
  const displayHours = istHours % 12 === 0 ? 12 : istHours % 12;
  const displayMinutes = istMinutes.toString().padStart(2, '0');
  const currentIstTimeStr = `${displayHours}:${displayMinutes} ${ampmStr}`;

  if (!isWithinHours) {
    const formattedMsg = `We are closed (Current IST: ${currentIstTimeStr}). Our business hours are from ${formatTimeTo12Hour(settings.openingTime)} to ${formatTimeTo12Hour(settings.closingTime)}.`;
    return {
      isOpen: false,
      isManuallyClosed: false,
      isAutoClosed: true,
      message: formattedMsg,
    };
  }

  return {
    isOpen: true,
    isManuallyClosed: false,
    isAutoClosed: false,
    message: '',
  };
}

/**
 * Evaluates the current operational status of an individual restaurant.
 */
export function getRestaurantStatus(restaurant: Restaurant | null): StoreStatus {
  const defaultClosedMessage = 'Store is currently closed. Please check back during opening hours!';

  if (!restaurant) {
    return {
      isOpen: true,
      isManuallyClosed: false,
      isAutoClosed: false,
      message: '',
    };
  }

  // 1. Check manual override first
  if (restaurant.isClosed) {
    return {
      isOpen: false,
      isManuallyClosed: true,
      isAutoClosed: false,
      message: restaurant.closedMessage || defaultClosedMessage,
    };
  }

  // 2. Check automated scheduled hours in Indian Standard Time (IST, UTC+5:30)
  const now = new Date();
  let istHours = now.getUTCHours() + 5;
  let istMinutes = now.getUTCMinutes() + 30;
  if (istMinutes >= 60) {
    istHours += 1;
    istMinutes -= 60;
  }
  if (istHours >= 24) {
    istHours -= 24;
  }
  const currentMinutes = istHours * 60 + istMinutes;

  const openingTime = restaurant.openingTime || '11:00 AM';
  const closingTime = restaurant.closingTime || '11:00 PM';

  const openMinutes = parseTimeToMinutes(openingTime);
  const closeMinutes = parseTimeToMinutes(closingTime);

  // If time configuration is invalid or missing, fallback to open
  if (openMinutes === null || closeMinutes === null) {
    return {
      isOpen: true,
      isManuallyClosed: false,
      isAutoClosed: false,
      message: '',
    };
  }

  let isWithinHours = false;
  if (closeMinutes > openMinutes) {
    isWithinHours = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } else {
    isWithinHours = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  const ampmStr = istHours >= 12 ? 'PM' : 'AM';
  const displayHours = istHours % 12 === 0 ? 12 : istHours % 12;
  const displayMinutes = istMinutes.toString().padStart(2, '0');
  const currentIstTimeStr = `${displayHours}:${displayMinutes} ${ampmStr}`;

  if (!isWithinHours) {
    const formattedMsg = `Closed (Current IST: ${currentIstTimeStr}). Operational hours: ${formatTimeTo12Hour(openingTime)} to ${formatTimeTo12Hour(closingTime)}.`;
    return {
      isOpen: false,
      isManuallyClosed: false,
      isAutoClosed: true,
      message: formattedMsg,
    };
  }

  return {
    isOpen: true,
    isManuallyClosed: false,
    isAutoClosed: false,
    message: '',
  };
}

export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (e) {
      console.error('Error formatting ISO to 12h:', e);
    }
  }
  return timeStr;
}
