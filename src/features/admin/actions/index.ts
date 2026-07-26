'use server';

import { adminRepository } from '../repositories';
import { getServerSession, getServerProfile } from '@/features/auth/actions';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import type { AdminFilter } from '../types';

async function authorizeAdmin() {
  const { user } = await getServerSession();
  if (!user) throw new Error('Unauthorized');
  const { profile } = await getServerProfile();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden');
  return { user, profile };
}

export async function getAdminDashboard() {
  try {
    await authorizeAdmin();
    const stats = await adminRepository.getDashboardStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminStudents(filter: AdminFilter) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getStudents(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminStudentById(id: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getStudentById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function suspendStudent(id: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.updateStudentStatus(id, false);
    await adminRepository.createAuditLog({
      table_name: 'profiles',
      record_id: id,
      action: 'suspend',
      new_data: { is_active: false, reason },
      old_data: { is_active: true },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unsuspendStudent(id: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.updateStudentStatus(id, true);
    await adminRepository.createAuditLog({
      table_name: 'profiles',
      record_id: id,
      action: 'unsuspend',
      new_data: { is_active: true, reason },
      old_data: { is_active: false },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function verifyStudent(id: string) {
  try {
    const { user } = await authorizeAdmin();
    const student = await adminRepository.getStudentById(id);
    if (!student) return { success: false, error: 'Student not found' };
    if (!student.credit_account) return { success: false, error: 'No credit account' };
    await adminRepository.updateCreditStatus(student.credit_account.id, 'active');
    await adminRepository.createAuditLog({
      table_name: 'credit_accounts',
      record_id: student.credit_account.id,
      action: 'verify',
      new_data: { verification_status: 'verified' },
      old_data: { verification_status: student.credit_account.verification_status },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function resetStudentVerification(id: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.resetStudentVerification(id);
    await adminRepository.createAuditLog({
      table_name: 'credit_accounts',
      record_id: id,
      action: 'reset_verification',
      new_data: { verification_status: 'pending', reason },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAdminMerchants(filter: AdminFilter) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getMerchants(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminMerchantById(id: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getMerchantById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function approveMerchant(merchantId: string, restaurantId: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.approveMerchant(merchantId, restaurantId);
    await adminRepository.createAuditLog({
      table_name: 'restaurants',
      record_id: restaurantId,
      action: 'approve',
      new_data: { status: 'active' },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function rejectMerchant(merchantId: string, restaurantId: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.rejectMerchant(merchantId, restaurantId);
    await adminRepository.createAuditLog({
      table_name: 'restaurants',
      record_id: restaurantId,
      action: 'reject',
      new_data: { status: 'closed', reason },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function suspendMerchant(id: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.updateMerchantStatus(id, false);
    await adminRepository.createAuditLog({
      table_name: 'profiles',
      record_id: id,
      action: 'suspend',
      new_data: { is_active: false, reason },
      old_data: { is_active: true },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function restoreMerchant(id: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.updateMerchantStatus(id, true);
    await adminRepository.createAuditLog({
      table_name: 'profiles',
      record_id: id,
      action: 'restore',
      new_data: { is_active: true, reason },
      old_data: { is_active: false },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateMerchantCommission(merchantId: string, commissionRate: number) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.updateCommission(merchantId, commissionRate);
    await adminRepository.createAuditLog({
      table_name: 'restaurant_settings',
      record_id: merchantId,
      action: 'update_commission',
      new_data: { commission_rate: commissionRate },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAdminOrders(filter: AdminFilter & { restaurantId?: string }) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getOrders(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminOrderById(id: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getOrderById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function forceUpdateOrderStatus(orderId: string, newStatus: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    const order = await adminRepository.getOrderById(orderId);
    if (!order) return { success: false, error: 'Order not found' };
    await adminRepository.updateOrderStatus(orderId, newStatus, reason);
    await adminRepository.createAuditLog({
      table_name: 'orders',
      record_id: orderId,
      action: 'force_update',
      new_data: { status: newStatus, reason },
      old_data: { status: order.status },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function cancelOrderByAdmin(orderId: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    const order = await adminRepository.getOrderById(orderId);
    if (!order) return { success: false, error: 'Order not found' };
    await adminRepository.updateOrderStatus(orderId, 'cancelled', reason);
    await adminRepository.createAuditLog({
      table_name: 'orders',
      record_id: orderId,
      action: 'cancel',
      new_data: { status: 'cancelled', reason },
      old_data: { status: order.status },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAdminCreditAccounts(filter: AdminFilter) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getCreditAccounts(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminCreditAccountById(id: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getCreditAccountById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function increaseCreditLimit(accountId: string, newLimit: number, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    const account = await adminRepository.getCreditAccountById(accountId);
    if (!account) return { success: false, error: 'Account not found' };
    if (newLimit <= account.credit_limit) return { success: false, error: 'New limit must be higher' };
    const updated = await adminRepository.updateCreditLimit(accountId, newLimit);
    await adminRepository.createAuditLog({
      table_name: 'credit_accounts',
      record_id: accountId,
      action: 'credit_limit_increase',
      new_data: { credit_limit: newLimit, reason },
      old_data: { credit_limit: account.credit_limit },
      changed_by: user.id,
    });
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function reduceCreditLimit(accountId: string, newLimit: number, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    const account = await adminRepository.getCreditAccountById(accountId);
    if (!account) return { success: false, error: 'Account not found' };
    if (newLimit >= account.credit_limit) return { success: false, error: 'New limit must be lower' };
    const updated = await adminRepository.updateCreditLimit(accountId, newLimit);
    await adminRepository.createAuditLog({
      table_name: 'credit_accounts',
      record_id: accountId,
      action: 'credit_limit_reduction',
      new_data: { credit_limit: newLimit, reason },
      old_data: { credit_limit: account.credit_limit },
      changed_by: user.id,
    });
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function freezeCredit(accountId: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    const account = await adminRepository.getCreditAccountById(accountId);
    if (!account) return { success: false, error: 'Account not found' };
    await adminRepository.updateCreditStatus(accountId, 'frozen');
    await adminRepository.createAuditLog({
      table_name: 'credit_accounts',
      record_id: accountId,
      action: 'freeze',
      new_data: { status: 'frozen', reason },
      old_data: { status: account.status },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unfreezeCredit(accountId: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    const account = await adminRepository.getCreditAccountById(accountId);
    if (!account) return { success: false, error: 'Account not found' };
    await adminRepository.updateCreditStatus(accountId, 'active');
    await adminRepository.createAuditLog({
      table_name: 'credit_accounts',
      record_id: accountId,
      action: 'unfreeze',
      new_data: { status: 'active', reason },
      old_data: { status: account.status },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function waiveLateFee(accountId: string, repaymentId: string, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.waiveLateFee(repaymentId);
    await adminRepository.createAuditLog({
      table_name: 'credit_repayments',
      record_id: repaymentId,
      action: 'waive_late_fee',
      new_data: { late_fee_applied: 0, reason },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getCreditTransactions(accountId: string, page = 1, pageSize = 50) {
  try {
    await authorizeAdmin();
    const offset = (page - 1) * pageSize;
    const { data, total } = await adminRepository.getCreditTransactions(accountId, pageSize, offset);
    return { success: true, data: { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminPayments(filter: AdminFilter) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getPayments(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function processRefund(paymentId: string, amount: number, reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.processRefund(paymentId, amount, reason);
    await adminRepository.createAuditLog({
      table_name: 'payments',
      record_id: paymentId,
      action: 'refund',
      new_data: { refund_amount: amount, reason },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getSystemSettings() {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getSystemSettings();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function updateSystemSetting(id: string, value: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.updateSystemSetting(id, value, user.id);
    await adminRepository.createAuditLog({
      table_name: 'system_settings',
      record_id: id,
      action: 'update',
      new_data: { value },
      changed_by: user.id,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAuditLogs(filter: AdminFilter & { tableName?: string }) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getAuditLogs(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getUserOrderHistory(userId: string, page = 1) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getUserOrderHistory(userId, page);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getStudentCreditHistory(userId: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getStudentCreditHistory(userId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getMerchantRevenue(merchantId: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getMerchantRevenue(merchantId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getMerchantAnalytics(merchantId: string) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getMerchantAnalytics(merchantId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getStudentPaymentHistory(userId: string, page = 1) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getStudentPaymentHistory(userId, page);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function bulkSuspendStudents(userIds: string[], reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.bulkUpdateStudentStatus(userIds, false);
    for (const id of userIds) {
      await adminRepository.createAuditLog({
        table_name: 'profiles',
        record_id: id,
        action: 'bulk_suspend',
        new_data: { is_active: false, reason },
        changed_by: user.id,
      });
    }
    return { success: true, count: userIds.length };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function bulkUnsuspendStudents(userIds: string[], reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.bulkUpdateStudentStatus(userIds, true);
    for (const id of userIds) {
      await adminRepository.createAuditLog({
        table_name: 'profiles',
        record_id: id,
        action: 'bulk_unsuspend',
        new_data: { is_active: true, reason },
        changed_by: user.id,
      });
    }
    return { success: true, count: userIds.length };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function bulkSuspendMerchants(userIds: string[], reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.bulkUpdateMerchantStatus(userIds, false);
    for (const id of userIds) {
      await adminRepository.createAuditLog({
        table_name: 'profiles',
        record_id: id,
        action: 'bulk_suspend',
        new_data: { is_active: false, reason },
        changed_by: user.id,
      });
    }
    return { success: true, count: userIds.length };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function bulkRestoreMerchants(userIds: string[], reason: string) {
  try {
    const { user } = await authorizeAdmin();
    await adminRepository.bulkUpdateMerchantStatus(userIds, true);
    for (const id of userIds) {
      await adminRepository.createAuditLog({
        table_name: 'profiles',
        record_id: id,
        action: 'bulk_restore',
        new_data: { is_active: true, reason },
        changed_by: user.id,
      });
    }
    return { success: true, count: userIds.length };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getLowStockProducts() {
  try {
    await authorizeAdmin();
    const settings = await adminRepository.getSystemSettings();
    const thresholdSetting = settings.find((s) => s.key === 'inventory_threshold');
    const threshold = thresholdSetting ? parseInt(thresholdSetting.value, 10) : 5;
    const data = await adminRepository.getLowStockProducts(threshold);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getRecentPayments() {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getRecentPayments(20);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getAdminUsers(filter: AdminFilter = {}) {
  try {
    await authorizeAdmin();
    const data = await adminRepository.getUsers(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function deleteUser(userId: string) {
  try {
    await authorizeAdmin();
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
