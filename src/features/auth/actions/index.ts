'use server';

import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { createServiceClient } from '@/infrastructure/supabase/service';

export async function getServerSession() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { user: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null };

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'User',
      role: (user.user_metadata?.role as string) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
      phone: (user.user_metadata?.phone as string) ?? null,
    },
  };
}

export async function getServerProfile() {
  const supabase = createServiceClient();
  if (!supabase) return { profile: null };

  const { user } = await getServerSession();
  if (!user) return { profile: null };

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, role, is_active, created_at, updated_at')
    .eq('id', user.id)
    .single();

  return { profile: data };
}

export async function updateServerProfile(updates: { role?: string; phone?: string; full_name?: string }) {
  const supabase = createServiceClient();
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getServerSession();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email, full_name: user.fullName, role: user.role || '', is_active: true, ...updates });

  if (error) return { error: error.message };

  const metadataUpdates: Record<string, string> = {};
  if (updates.full_name) metadataUpdates.full_name = updates.full_name;
  if (updates.phone) metadataUpdates.phone = updates.phone;
  if (updates.role) metadataUpdates.role = updates.role;

  if (Object.keys(metadataUpdates).length > 0) {
    const authSupabase = await createServerSupabaseClient();
    if (authSupabase) {
      await authSupabase.auth.updateUser({ data: metadataUpdates });
    }
  }

  return { error: null };
}

export async function getServerAddress() {
  const supabase = createServiceClient();
  if (!supabase) return { address: null };

  const { user } = await getServerSession();
  if (!user) return { address: null };

  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  return { address: data };
}

export async function updateServerAddress(formData: FormData) {
  const supabase = createServiceClient();
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getServerSession();
  if (!user) return { error: 'Not authenticated' };

  const fullAddress = formData.get('fullAddress') as string;
  if (!fullAddress?.trim()) return { error: 'Address is required' };

  const city = formData.get('city') as string || '';
  const state = formData.get('state') as string || '';
  const postalCode = formData.get('postalCode') as string || '';
  const label = formData.get('label') as string || 'Home';

  const { data: existing } = await supabase
    .from('addresses')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('addresses')
      .update({ full_address: fullAddress, city, state, postal_code: postalCode, label, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('addresses')
      .insert({ user_id: user.id, full_address: fullAddress, city, state, postal_code: postalCode, label, is_default: true });
    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function completeOnboarding(formData: FormData) {
  const supabase = createServiceClient();
  if (!supabase) return { error: 'Supabase not configured', redirect: null };

  const { user } = await getServerSession();
  if (!user) return { error: 'Not authenticated', redirect: null };

  const role = formData.get('role') as string;
  const phone = formData.get('phone') as string;

  if (!['student', 'merchant', 'delivery'].includes(role)) {
    return { error: 'Invalid role', redirect: null };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email, full_name: user.fullName, role, phone: phone || null });

  if (profileError) return { error: profileError.message, redirect: null };

  const authSupabase = await createServerSupabaseClient();
  if (authSupabase) {
    await authSupabase.auth.updateUser({ data: { role } });
  }

  const dashboards: Record<string, string> = {
    student: '/dashboard/student',
    merchant: '/dashboard/merchant',
    delivery: '/dashboard/delivery',
  };

  return { error: null, redirect: dashboards[role] ?? '/' };
}
