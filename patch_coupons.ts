export async function getCoupons(): Promise<Coupon[]> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    console.warn('Google Sheets not configured. Coupons unavailable.');
    return [];
  }
  try {
    const res = await fetchFromGas('getCoupons', {});
    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('Google Sheets coupons load failed.');
  }
  return [];
}
