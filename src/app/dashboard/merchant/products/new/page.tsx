'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createProductFromFormData, getCategories } from '@/features/products/actions';
import type { Category } from '@/features/products/types';

const units = [
  { value: 'piece', label: 'Piece' },
  { value: 'plate', label: 'Plate' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'Gram' },
  { value: 'ml', label: 'Ml' },
  { value: 'l', label: 'Litre' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'box', label: 'Box' },
];

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<{
    name: string; description: string; price: number; compare_at_price: number; cost_per_unit: number;
    unit: 'piece' | 'plate' | 'kg' | 'g' | 'ml' | 'l' | 'dozen' | 'box';
    category_id: string; is_vegetarian: boolean; is_vegan: boolean;
    is_gluten_free: boolean; spice_level: number; preparation_time: number;
    stock_quantity: number; track_inventory: boolean; image: string; tags: string;
  }>({
    name: '', description: '', price: 0, compare_at_price: 0, cost_per_unit: 0,
    unit: 'piece', category_id: '', is_vegetarian: false, is_vegan: false,
    is_gluten_free: false, spice_level: 0, preparation_time: 10,
    stock_quantity: 0, track_inventory: false, image: '', tags: '',
  });

  useEffect(() => {
    getCategories().then((res) => { if (res.success && res.data) setCategories(res.data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.price <= 0) { setError('Price must be greater than 0'); return; }
    setSaving(true);

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('price', String(form.price));
    if (form.description.trim()) fd.append('description', form.description.trim());
    if (form.category_id) fd.append('category_id', form.category_id);
    if (form.is_vegetarian) fd.append('is_vegetarian', 'true');
    if (form.is_vegan) fd.append('is_vegan', 'true');
    if (form.is_gluten_free) fd.append('is_gluten_free', 'true');
    if (form.compare_at_price) fd.append('compare_at_price', String(form.compare_at_price));
    if (form.cost_per_unit) fd.append('cost_per_unit', String(form.cost_per_unit));
    if (form.stock_quantity) fd.append('stock_quantity', String(form.stock_quantity));
    if (form.track_inventory) fd.append('track_inventory', 'true');
    if (form.tags) fd.append('tags', form.tags);
    if (form.image) fd.append('image', form.image);

    if (imageFile) {
      fd.append('file', imageFile);
    }

    const res = await createProductFromFormData(fd);
    setSaving(false);
    if (res.success) { router.push('/dashboard/merchant/products'); }
    else { setError(res.error ?? 'Failed to create product'); }
  };

  const update = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <Link href="/dashboard/merchant/products" className="inline-flex items-center gap-1 text-sm text-ztext-lighter hover:text-ztext-light mb-4">
        <ArrowLeft size={14} /> Back to products
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-ztext mb-6">Add product</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-zcard rounded-xl border border-zborder p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ztext-lighter">Name *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-z mt-1" placeholder="e.g. Chicken Biryani" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ztext-lighter">Description</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input-z mt-1 h-20 resize-none" placeholder="Brief description..." />
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Price (₹) *</label>
            <input type="number" min={0} step={1} value={form.price} onChange={(e) => update('price', Number(e.target.value))} className="input-z mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Compare at price (₹)</label>
            <input type="number" min={0} value={form.compare_at_price} onChange={(e) => update('compare_at_price', Number(e.target.value))} className="input-z mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Cost per unit (₹)</label>
            <input type="number" min={0} step={1} value={form.cost_per_unit} onChange={(e) => update('cost_per_unit', Number(e.target.value))} className="input-z mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Unit</label>
            <select value={form.unit} onChange={(e) => update('unit', e.target.value)} className="input-z mt-1">
              {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Category</label>
            <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className="input-z mt-1">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Spice level (0-5)</label>
            <input type="range" min={0} max={5} value={form.spice_level} onChange={(e) => update('spice_level', Number(e.target.value))} className="w-full mt-2" />
            <span className="text-xs text-ztext-muted">{form.spice_level}/5</span>
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Prep time (min)</label>
            <input type="number" min={0} value={form.preparation_time} onChange={(e) => update('preparation_time', Number(e.target.value))} className="input-z mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm text-ztext-light cursor-pointer">
            <input type="checkbox" checked={form.is_vegetarian} onChange={(e) => update('is_vegetarian', e.target.checked)} className="rounded border-gray-300 text-zred focus:ring-zred/30" />
            Vegetarian
          </label>
          <label className="flex items-center gap-2 text-sm text-ztext-light cursor-pointer">
            <input type="checkbox" checked={form.is_vegan} onChange={(e) => update('is_vegan', e.target.checked)} className="rounded border-gray-300 text-zred focus:ring-zred/30" />
            Vegan
          </label>
          <label className="flex items-center gap-2 text-sm text-ztext-light cursor-pointer">
            <input type="checkbox" checked={form.is_gluten_free} onChange={(e) => update('is_gluten_free', e.target.checked)} className="rounded border-gray-300 text-zred focus:ring-zred/30" />
            Gluten free
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Upload Image File</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="input-z mt-1 pt-1.5 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-zred file:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Or Image URL</label>
            <input value={form.image} onChange={(e) => update('image', e.target.value)} className="input-z mt-1" placeholder="https://..." />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ztext-lighter">Tags (comma separated)</label>
          <input value={form.tags} onChange={(e) => update('tags', e.target.value)} className="input-z mt-1" placeholder="bestseller, spicy" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-ztext-lighter">Stock quantity</label>
            <input type="number" min={0} value={form.stock_quantity} onChange={(e) => update('stock_quantity', Number(e.target.value))} className="input-z mt-1" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-ztext-light cursor-pointer">
              <input type="checkbox" checked={form.track_inventory} onChange={(e) => update('track_inventory', e.target.checked)} className="rounded border-gray-300 text-zred focus:ring-zred/30" />
              Track inventory
            </label>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-zred text-white text-sm font-medium rounded-xl hover:bg-zred-dark transition-colors disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save product'}
          </button>
          <Link href="/dashboard/merchant/products" className="inline-flex items-center px-5 py-2.5 bg-zcard text-ztext-light border border-zborder text-sm font-medium rounded-xl hover:bg-zgray transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
