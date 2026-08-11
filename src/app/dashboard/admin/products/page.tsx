'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, UtensilsCrossed, Edit3, Trash2, Eye, EyeOff, Save, X, Search, CheckCircle, AlertCircle, Leaf, Flame, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getProducts, getCategories, createProductFromFormData, updateProductFromFormData, updateProduct, deleteProduct } from '@/features/products/actions';
import type { Product, Category } from '@/features/products/types';
import { Skeleton, EmptyState } from '@/components/ui';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  
  // Product Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<string>('');
  const [compareAtPrice, setCompareAtPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isVegetarian, setIsVegetarian] = useState(true);
  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState<number>(0);
  const [prepTime, setPrepTime] = useState<string>('15');
  const [stockQuantity, setStockQuantity] = useState<string>('100');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
      getProducts({}),
      getCategories(true),
    ]);
    if (prodRes.success && prodRes.data) setProducts(prodRes.data);
    if (catRes.success && catRes.data) setCategories(catRes.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await loadData();
      if (!mounted) return;
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategoryFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditing(null);
    setName('');
    setCategoryId(categories[0]?.id ?? '');
    setPrice('');
    setCompareAtPrice('');
    setDescription('');
    setImage('');
    setImageFile(null);
    setIsVegetarian(true);
    setIsVegan(false);
    setIsGlutenFree(false);
    setSpiceLevel(0);
    setPrepTime('15');
    setStockQuantity('100');
    setIsAvailable(true);
    setIsActive(true);
    setError('');
  }, [categories]);

  const openCreateForm = () => {
    resetForm();
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setShowForm(true);
  };

  const openEditForm = (prod: Product) => {
    setError('');
    setEditing(prod);
    setName(prod.name);
    setCategoryId(prod.category_id ?? '');
    setPrice(prod.price.toString());
    setCompareAtPrice(prod.compare_at_price ? prod.compare_at_price.toString() : '');
    setDescription(prod.description ?? '');
    setImage(prod.image ?? '');
    setImageFile(null);
    setIsVegetarian(prod.is_vegetarian);
    setIsVegan(prod.is_vegan);
    setIsGlutenFree(prod.is_gluten_free);
    setSpiceLevel(prod.spice_level);
    setPrepTime(prod.preparation_time.toString());
    setStockQuantity(prod.stock_quantity.toString());
    setIsAvailable(prod.is_available);
    setIsActive(prod.is_active);
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Valid price is required');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('price', price);
      if (categoryId) formData.append('category_id', categoryId);
      if (compareAtPrice) formData.append('compare_at_price', compareAtPrice);
      if (description.trim()) formData.append('description', description.trim());
      if (image.trim()) formData.append('image', image.trim());
      if (isVegetarian) formData.append('is_vegetarian', 'true');
      if (isVegan) formData.append('is_vegan', 'true');
      if (isGlutenFree) formData.append('is_gluten_free', 'true');
      if (isAvailable) formData.append('is_available', 'true');
      if (isActive) formData.append('is_active', 'true');
      if (prepTime) formData.append('preparation_time', prepTime);
      if (stockQuantity) formData.append('stock_quantity', stockQuantity);

      if (imageFile) {
        formData.append('file', imageFile);
      }

      if (editing) {
        const res = await fetch(`/api/products?id=${editing.id}`, {
          method: 'PUT',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Product "${name.trim()}" updated successfully!`);
        } else {
          setError(data.error || 'Failed to update product');
          setSaving(false);
          return;
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Product "${name.trim()}" created successfully!`);
        } else {
          setError(data.error || 'Failed to create product');
          setSaving(false);
          return;
        }
      }
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete product "${prod.name}"?`)) return;
    const res = await deleteProduct(prod.id);
    if (res.success) {
      showToast(`Product "${prod.name}" deleted.`);
      loadData();
    } else {
      alert(res.error || 'Failed to delete product');
    }
  };

  const handleToggleActive = async (prod: Product) => {
    const res = await updateProduct(prod.id, { is_active: !prod.is_active });
    if (res.success) {
      showToast(`Product visibility updated`);
      loadData();
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalRecords = filteredProducts.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords);
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getCategoryName = (catId?: string | null) => {
    if (!catId) return 'Uncategorized';
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'Uncategorized';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-zcard rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-up">
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ztext">Create & Manage Products</h1>
          <p className="text-xs sm:text-sm text-ztext-light mt-0.5">
            Manage your store items & food menu ({products.length} total products)
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zred text-white text-sm font-semibold rounded-xl hover:bg-zred-dark transition-all shadow-z shrink-0"
        >
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ztext-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input-z pl-10 text-sm"
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="input-z sm:w-56 text-sm"
        >
          <option value="all">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Form Drawer / Modal */}
      {showForm && (
        <div className="bg-zcard rounded-2xl border border-zborder p-6 shadow-z-modal animate-fade-up">
          <div className="flex items-center justify-between mb-5 border-b border-zborder pb-3">
            <h2 className="text-base font-bold text-ztext flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-zred" />
              {editing ? `Edit Product: ${editing.name}` : 'Create New Product'}
            </h2>
            <button onClick={resetForm} className="p-1 rounded-lg hover:bg-zgray text-ztext-lighter">
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">
                Product Name <span className="text-zred">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Biryani, Masala Tea"
                className="input-z"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-z text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">
                Price (₹) <span className="text-zred">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 150"
                className="input-z"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">Compare at Price (₹)</label>
              <input
                type="number"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="e.g. 180 (Optional original price)"
                className="input-z"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Tasty, cooked fresh to order with spices..."
                className="input-z py-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">Product Image</label>
              <div className="grid sm:grid-cols-2 gap-3 items-center">
                <div>
                  <span className="text-[11px] text-ztext-lighter block mb-1">Upload File to Server</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="input-z text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-zred file:text-white cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-ztext-lighter block mb-1">Or Image URL</span>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/... (Optional)"
                    className="input-z text-xs"
                  />
                </div>
              </div>
              {(imageFile || image) && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-ztext-light bg-zgray/50 p-2 rounded-xl border border-zborder">
                  <div className="w-9 h-9 rounded-lg bg-zcard border border-zborder overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="truncate text-xs font-medium">
                    {imageFile ? `Selected: ${imageFile.name}` : `URL: ${image}`}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">Prep Time (mins)</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
                className="input-z"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ztext-lighter block mb-1">Stock Quantity</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="100"
                className="input-z"
              />
            </div>

            <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-ztext cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVegetarian}
                  onChange={(e) => setIsVegetarian(e.target.checked)}
                  className="w-4 h-4 rounded border-zborder text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                />
                Vegetarian
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-ztext cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVegan}
                  onChange={(e) => setIsVegan(e.target.checked)}
                  className="w-4 h-4 rounded border-zborder text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                />
                Vegan
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-ztext cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isGlutenFree}
                  onChange={(e) => setIsGlutenFree(e.target.checked)}
                  className="w-4 h-4 rounded border-zborder text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                />
                Gluten Free
              </label>
            </div>

            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-ztext cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 rounded border-zborder text-zred focus:ring-zred accent-zred"
                />
                In Stock & Available
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-ztext cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-zborder text-zred focus:ring-zred accent-zred"
                />
                Active (Visible to customers)
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6 pt-4 border-t border-zborder justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-zgray text-ztext-light border border-zborder text-sm font-medium rounded-xl hover:bg-zcard transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-zred text-white text-sm font-semibold rounded-xl hover:bg-zred-dark transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No products found"
          description={search ? 'No products match your filter criteria.' : 'Create your first product to display on the menu.'}
        />
      ) : (
        <div className="bg-zcard rounded-2xl border border-zborder overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zborder bg-zgray/50 text-xs text-ztext-lighter uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-semibold">Product</th>
                  <th className="px-5 py-3.5 font-semibold">Category</th>
                  <th className="px-5 py-3.5 font-semibold">Price</th>
                  <th className="px-5 py-3.5 font-semibold">Diet</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zborder">
                {paginatedProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-zgray/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zgray border border-zborder overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <UtensilsCrossed size={18} className="text-ztext-muted" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-ztext text-sm leading-tight">{prod.name}</h4>
                          <p className="text-xs text-ztext-lighter line-clamp-1 mt-0.5 max-w-xs">
                            {prod.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-ztext-light bg-zgray px-2.5 py-1 rounded-lg border border-zborder">
                        {getCategoryName(prod.category_id)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-ztext text-sm">₹{prod.price}</span>
                        {prod.compare_at_price && (
                          <span className="text-xs text-ztext-muted line-through">₹{prod.compare_at_price}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {prod.is_vegetarian ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Leaf size={10} /> Veg
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Non-Veg
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zgray text-ztext-lighter border border-zborder'
                        }`}
                      >
                        {prod.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleActive(prod)}
                          title={prod.is_active ? 'Hide Product' : 'Show Product'}
                          className="p-2 rounded-lg hover:bg-zgray text-ztext-lighter hover:text-ztext transition-colors"
                        >
                          {prod.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          onClick={() => openEditForm(prod)}
                          title="Edit Product"
                          className="p-2 rounded-lg hover:bg-zgray text-ztext-lighter hover:text-ztext transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(prod)}
                          title="Delete Product"
                          className="p-2 rounded-lg hover:bg-red-500/10 text-ztext-lighter hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Total Count Footer */}
          <div className="px-5 py-3.5 bg-zgray/30 border-t border-zborder flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ztext-lighter">
            <div>
              Showing <span className="font-semibold text-ztext">{totalRecords > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-semibold text-ztext">{endIndex}</span> of{' '}
              <span className="font-semibold text-ztext">{totalRecords}</span> products
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zcard border border-zborder rounded-lg hover:bg-zgray text-ztext transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="px-2 font-medium text-ztext-light">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zcard border border-zborder rounded-lg hover:bg-zgray text-ztext transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
