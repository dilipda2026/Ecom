import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { createServiceClient } from '@/infrastructure/supabase/service';
import type { Product, ProductFormData, Category, CategoryFormData, ProductsFilter } from '../types';

const PRODUCT_COLUMNS = 'id, restaurant_id, category_id, name, slug, description, price, compare_at_price, cost_per_unit, unit, is_vegetarian, is_vegan, is_gluten_free, spice_level, preparation_time, image, is_active, is_available, stock_quantity, track_inventory, sort_order, tags, created_at, updated_at, deleted_at';

const CATEGORY_COLUMNS = 'id, restaurant_id, name, slug, description, display_order, is_active, created_at, updated_at';

export class ProductRepository {
  async findByRestaurant(restaurantId: string, filter: ProductsFilter = {}): Promise<Product[]> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return [];
    let query = supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.is_active !== undefined) query = query.eq('is_active', filter.is_active);
    if (filter.is_available !== undefined) query = query.eq('is_available', filter.is_available);
    if (filter.search) query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    if (filter.low_stock) query = query.gt('stock_quantity', 0).lte('stock_quantity', 5);
    if (filter.pageSize) {
      const from = ((filter.page ?? 1) - 1) * filter.pageSize;
      query = query.range(from, from + filter.pageSize - 1);
    }
    const { data } = await query;
    return (data ?? []) as Product[];
  }

  async findById(id: string): Promise<Product | null> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return null;
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    return data as Product | null;
  }

  async create(restaurantId: string, data: ProductFormData): Promise<Product | null> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return null;
    const slugBase = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        restaurant_id: restaurantId,
        name: data.name,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        description: data.description ?? null,
        price: data.price,
        compare_at_price: data.compare_at_price ?? null,
        cost_per_unit: data.cost_per_unit ?? null,
        unit: data.unit ?? 'piece',
        category_id: data.category_id ?? null,
        is_vegetarian: data.is_vegetarian ?? false,
        is_vegan: data.is_vegan ?? false,
        is_gluten_free: data.is_gluten_free ?? false,
        spice_level: data.spice_level ?? 0,
        preparation_time: data.preparation_time ?? 10,
        image: data.image ?? null,
        stock_quantity: data.stock_quantity ?? 0,
        track_inventory: data.track_inventory ?? false,
        is_available: data.is_available ?? true,
        is_active: data.is_active ?? true,
        tags: data.tags ?? null,
      })
      .select(PRODUCT_COLUMNS)
      .single();
    if (error) {
      console.error('Product insert error:', error);
    }
    return product as Product | null;
  }

  async update(id: string, restaurantId: string, data: Partial<ProductFormData>): Promise<Product | null> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return null;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) { updateData.name = data.name; updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36); }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.compare_at_price !== undefined) updateData.compare_at_price = data.compare_at_price;
    if (data.cost_per_unit !== undefined) updateData.cost_per_unit = data.cost_per_unit;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.is_vegetarian !== undefined) updateData.is_vegetarian = data.is_vegetarian;
    if (data.is_vegan !== undefined) updateData.is_vegan = data.is_vegan;
    if (data.is_gluten_free !== undefined) updateData.is_gluten_free = data.is_gluten_free;
    if (data.spice_level !== undefined) updateData.spice_level = data.spice_level;
    if (data.preparation_time !== undefined) updateData.preparation_time = data.preparation_time;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
    if (data.track_inventory !== undefined) updateData.track_inventory = data.track_inventory;
    if (data.is_available !== undefined) updateData.is_available = data.is_available;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.tags !== undefined) updateData.tags = data.tags;
    updateData.updated_at = new Date().toISOString();
    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select(PRODUCT_COLUMNS)
      .single();
    if (error) {
      console.error('Product update error:', error);
    }
    return product as Product | null;
  }

  async softDelete(id: string, restaurantId: string): Promise<boolean> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return false;
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);
    return !error;
  }

  async restore(id: string, restaurantId: string): Promise<boolean> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return false;
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: null, is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);
    return !error;
  }

  async hardDelete(id: string, restaurantId: string): Promise<boolean> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return false;
    const { data: refs } = await supabase.from('order_items').select('id').eq('product_id', id).limit(1);
    if (refs && refs.length > 0) return false;
    const { error } = await supabase.from('products').delete().eq('id', id).eq('restaurant_id', restaurantId);
    return !error;
  }

  async updateStock(id: string, restaurantId: string, quantity: number): Promise<Product | null> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return null;
    const { data } = await supabase
      .from('products')
      .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select(PRODUCT_COLUMNS)
      .single();
    return data as Product | null;
  }
}

export class CategoryRepository {
  async findByRestaurant(restaurantId: string, includeInactive = false): Promise<Category[]> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return [];
    let query = supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);
    const { data } = await query;
    return (data ?? []).map((c) => ({ ...c, product_count: 0 }));
  }

  async findById(id: string): Promise<Category | null> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from('categories').select(CATEGORY_COLUMNS).eq('id', id).maybeSingle();
    return data as Category | null;
  }

  async create(restaurantId: string, data: CategoryFormData): Promise<Category | null> {
    const supabase = createServiceClient() ?? (await createServerSupabaseClient());
    if (!supabase) return null;
    const { count } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);
    const slugBase = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cat';
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurantId,
        name: data.name,
        slug,
        description: data.description ?? null,
        display_order: data.display_order ?? (count ?? 0) + 1,
        is_active: data.is_active ?? true,
      })
      .select(CATEGORY_COLUMNS)
      .single();
    if (error) {
      console.error('Category insert error:', error);
    }
    return category as Category | null;
  }

  async update(id: string, restaurantId: string, data: Partial<CategoryFormData>): Promise<Category | null> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) { updateData.name = data.name; updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    const { data: category } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select(CATEGORY_COLUMNS)
      .single();
    return category as Category | null;
  }

  async delete(id: string, restaurantId: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return false;
    await supabase.from('products').update({ category_id: null }).eq('category_id', id).eq('restaurant_id', restaurantId);
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('restaurant_id', restaurantId);
    return !error;
  }

  async reorder(ids: string[]): Promise<boolean> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return false;
    const updates = ids.map((id, i) => supabase.from('categories').update({ display_order: i + 1 }).eq('id', id));
    const results = await Promise.all(updates);
    return results.every((r) => !r.error);
  }
}

export const productRepository = new ProductRepository();
export const categoryRepository = new CategoryRepository();
