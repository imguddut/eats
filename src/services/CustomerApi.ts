import { Customer } from '../types';
import { SupabaseCustomerService } from './supabaseService';

export interface SaveCustomerRequest {
  firebaseUid: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  pincode?: string;
  provider: 'email' | 'google' | 'phone';
  createdAt?: string;
}

export interface UpdateCustomerRequest {
  firebaseUid: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
}

export interface GetCustomerRequest {
  firebaseUid: string;
}

export interface CustomerApiResponse<T = Customer> {
  success: boolean;
  customer?: T;
  exists?: boolean;
  message?: string;
}

export const CustomerApi = {
  /**
   * Save customer profile to Supabase
   */
  async saveCustomer(customer: SaveCustomerRequest): Promise<CustomerApiResponse> {
    const res = await SupabaseCustomerService.registerCustomer(customer as any);
    return res;
  },

  /**
   * Get customer profile by firebaseUid or customerId
   */
  async getCustomer(req: GetCustomerRequest): Promise<CustomerApiResponse> {
    const customers = await SupabaseCustomerService.getCustomers();
    if (!customers) return { success: false, message: 'Failed to query database' };
    const match = customers.find(c => c.firebaseUid === req.firebaseUid || c.email === req.firebaseUid);
    if (match) return { success: true, customer: match };
    return { success: false, message: 'Customer not found' };
  },

  /**
   * Update existing customer profile in Supabase
   */
  async updateCustomer(customer: UpdateCustomerRequest): Promise<CustomerApiResponse> {
    const updated = await SupabaseCustomerService.updateCustomer(customer as any);
    return { success: updated, message: updated ? 'Profile updated' : 'Update failed' };
  },

  /**
   * Check if a customer profile exists for given firebaseUid
   */
  async customerExists(req: GetCustomerRequest): Promise<CustomerApiResponse> {
    const customers = await SupabaseCustomerService.getCustomers();
    if (!customers) return { success: false, exists: false };
    const match = customers.find(c => c.firebaseUid === req.firebaseUid || c.email === req.firebaseUid);
    return { success: true, exists: Boolean(match), customer: match };
  }
};
