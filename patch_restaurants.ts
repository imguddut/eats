export async function getRestaurants(): Promise<Restaurant[]> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    console.warn('Google Sheets not configured. Restaurants unavailable.');
    return [];
  }
  try {
    const res = await fetchFromGas('getRestaurants', {});
    if (res && res.success && res.data) {
      // Deduplicate by ID to prevent React key errors
      const unique = res.data.reduce((acc: Restaurant[], current: Restaurant) => {
        if (!acc.find((item) => item.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);
      return unique;
    }
  } catch (err) {
    console.error('Failed to fetch restaurants via GAS', err);
  }
  return [];
}

export async function addRestaurant(rest: Omit<Restaurant, 'id'>): Promise<Restaurant> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');

  try {
    const res = await fetchFromGas('addRestaurant', { restaurant: rest });
    if (res && res.success && res.data) {
      return res.data;
    }
    throw new Error(res?.message || 'Failed to add restaurant');
  } catch (err) {
    console.error('Failed to add restaurant via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function deleteRestaurant(id: string): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  try {
    const res = await fetchFromGas('deleteRestaurant', { id });
    return res && res.success;
  } catch (err) {
    console.error('Failed to delete restaurant via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function updateRestaurant(rest: Restaurant): Promise<Restaurant> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  try {
    const res = await fetchFromGas('updateRestaurant', { restaurant: rest });
    if (res && res.success) {
      return rest;
    }
    throw new Error(res?.message || 'Failed to update restaurant');
  } catch (err) {
    console.error('Failed to update restaurant via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}
