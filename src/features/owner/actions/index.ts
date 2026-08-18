'use server';

import { adminRepository } from '@/features/admin/repositories';
import { getServerSession } from '@/features/auth/actions';
import { getOwnerEmail } from '@/lib/settings';
import { isOwnerEmail } from '@/config/auth-access';
import type { AdminFilter } from '@/features/admin/types';

/**
 * Gate for the read-only owner dashboard. Access is decided purely by the
 * owner email configured in General Settings (`dilip_da_email`). Owners must
 * never reach mutating admin actions — that is enforced here (read-only data
 * only) and in admin's `authorizeAdmin` (which rejects the owner email).
 */
async function authorizeOwner() {
  const { user } = await getServerSession();
  if (!user) throw new Error('Unauthorized');
  if (!isOwnerEmail(user.email, await getOwnerEmail())) throw new Error('Forbidden');
  return { user };
}

export async function getOwnerDashboard() {
  try {
    await authorizeOwner();
    const stats = await adminRepository.getDashboardStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerOrders(filter: AdminFilter & { restaurantId?: string }) {
  try {
    await authorizeOwner();
    const data = await adminRepository.getOrders(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerPayments(filter: AdminFilter) {
  try {
    await authorizeOwner();
    const data = await adminRepository.getPayments(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerDeliveryPartners(filter: AdminFilter) {
  try {
    await authorizeOwner();
    const data = await adminRepository.getDeliveryPartners(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}