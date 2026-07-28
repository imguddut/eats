import { User } from 'firebase/auth';
import { Customer } from '../types';
import { CustomerApi, SaveCustomerRequest } from './CustomerApi';

export const ProfileService = {
  /**
   * Single source of truth for syncing Firebase User with Google Sheets Customer Profile.
   * 1. Checks customerExists(firebaseUid)
   * 2. If exists -> fetches customer profile via getCustomer(firebaseUid)
   * 3. If not exists -> creates customer profile via saveCustomer(...)
   * 4. Safe Fallback -> returns constructed Customer object if Sheets backend is offline/slow
   */
  async syncCustomerProfile(firebaseUser: User, extraData?: Partial<Customer>): Promise<Customer> {
    if (!firebaseUser || !firebaseUser.uid) {
      throw new Error("Invalid Firebase User provided for profile synchronization.");
    }

    const providerId = firebaseUser.providerData?.[0]?.providerId || '';
    const providerType: 'email' | 'google' | 'phone' = providerId.includes('google')
      ? 'google'
      : firebaseUser.phoneNumber
      ? 'phone'
      : 'email';

    const cleanPhone = extraData?.phone
      ? extraData.phone.trim()
      : firebaseUser.phoneNumber
      ? firebaseUser.phoneNumber.replace('+91', '').trim()
      : '';

    const cleanEmail = extraData?.email
      ? extraData.email.trim().toLowerCase()
      : firebaseUser.email
      ? firebaseUser.email.trim().toLowerCase()
      : '';

    const cleanName = extraData?.name
      ? extraData.name.trim()
      : firebaseUser.displayName
      ? firebaseUser.displayName.trim()
      : (cleanEmail ? cleanEmail.split('@')[0] : 'ArwalEats Customer');

    const fallbackCustomer: Customer = {
      customerId: 'CUST-' + firebaseUser.uid.substring(0, 6).toUpperCase(),
      firebaseUid: firebaseUser.uid,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      address: extraData?.address?.trim() || '',
      city: extraData?.city?.trim() || 'Arwal',
      pincode: extraData?.pincode?.trim() || '804401',
      provider: providerType,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Check if customer profile exists in Google Sheets
      const existsRes = await CustomerApi.customerExists({ firebaseUid: firebaseUser.uid });

      if (existsRes && existsRes.success && existsRes.exists) {
        // 2. Fetch existing profile
        const getRes = await CustomerApi.getCustomer({ firebaseUid: firebaseUser.uid });
        if (getRes && getRes.success && getRes.customer) {
          return getRes.customer;
        }
      }

      // 3. Customer profile does not exist -> Save new profile
      const newCustomerRequest: SaveCustomerRequest = {
        firebaseUid: firebaseUser.uid,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        address: extraData?.address?.trim() || '',
        city: extraData?.city?.trim() || 'Arwal',
        pincode: extraData?.pincode?.trim() || '',
        provider: providerType,
        createdAt: new Date().toISOString()
      };

      const saveRes = await CustomerApi.saveCustomer(newCustomerRequest);
      if (saveRes && saveRes.success && saveRes.customer) {
        return saveRes.customer;
      }

      // Return fallback customer if backend save didn't return customer object
      return fallbackCustomer;
    } catch (err) {
      console.warn("[ProfileService] Backend customer sync warning, using local profile fallback:", err);
      return fallbackCustomer;
    }
  }
};
