'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getProductById,
  updateProduct,
  getCompanyOptions,
  getCategoryOptions,
  DropdownOption,
  ProductWithDetails
} from '@/lib/productsStore';
import {
  getDiscountByCompanyAndCategory,
  computePurchasePrice
} from '@/lib/discountsStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Hash,
  Lock,
  Building2,
  Tags,
  IndianRupee,
  Layers,
  AlertTriangle,
  Edit3,
  Search
} from 'lucide-react';

function EditProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [product, setProduct] = useState<ProductWithDetails | null>(null);

  // Options for Dropdowns
  const [companies, setCompanies] = useState<DropdownOption[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);

  // Search queries inside dropdown filter fields
  const [companySearch, setCompanySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Form Fields
  const [uniqueId, setUniqueId] = useState('');
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>(0);
  const [lowStock, setLowStock] = useState<number | ''>(10);
  const [unit, setUnit] = useState('PCS');

  useEffect(() => {
    let mounted = true;

    async function loadProductData() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace('/login');
        return;
      }

      if (!productId) {
        if (mounted) {
          setErrorMessage('No Product ID provided in URL parameters.');
          setLoading(false);
        }
        return;
      }

      try {
        const [foundProduct, compList, catList] = await Promise.all([
          getProductById(productId),
          getCompanyOptions(),
          getCategoryOptions(),
        ]);

        if (!foundProduct) {
          if (mounted) {
            setErrorMessage(`Product with ID "${productId}" was not found.`);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setProduct(foundProduct);
          setCompanies(compList);
          setCategories(catList);

          setUniqueId(foundProduct.unique_id || '');
          setName(foundProduct.name || '');
          setCompanyId(foundProduct.company_id || '');
          setCategoryId(foundProduct.category_id || '');
          setBasePrice(foundProduct.base_price ?? 0);
          setPurchasePrice(foundProduct.purchase_price ?? 0);
          setSellingPrice(foundProduct.selling_price ?? 0);
          setQuantity(foundProduct.quantity ?? 0);
          setLowStock(foundProduct.low_stock ?? 10);
          setUnit(foundProduct.unit || 'PCS');

          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to fetch product details.');
          setLoading(false);
        }
      }
    }

    loadProductData();

    return () => {
      mounted = false;
    };
  }, [productId, router]);

  const filteredCompanies = companies.filter((c) => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.unique_id && c.unique_id.toLowerCase().includes(q))
    );
  });

  const filteredCategories = categories.filter((c) => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.unique_id && c.unique_id.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!productId) {
      setErrorMessage('Missing Product ID.');
      return;
    }

    if (!uniqueId.trim()) {
      setErrorMessage('Product ID (unique_id) is required.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Product Name is required.');
      return;
    }

    if (!companyId) {
      setErrorMessage('Please select a Company.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Please select a Category.');
      return;
    }

    setSaving(true);

    try {
      let finalPurchasePrice = Number(purchasePrice || 0);

      // Check if discount exists for the selected company and category
      const discount = await getDiscountByCompanyAndCategory(companyId, categoryId);
      if (discount) {
        finalPurchasePrice = computePurchasePrice(
          Number(basePrice || 0),
          discount.d1,
          discount.d2,
          discount.d3,
          discount.d4
        );
      }

      await updateProduct(productId, {
        unique_id: uniqueId.trim(),
        name: name.trim(),
        company_id: companyId,
        category_id: categoryId,
        base_price: Number(basePrice || 0),
        purchase_price: finalPurchasePrice,
        selling_price: Number(sellingPrice || 0),
        quantity: Number(quantity || 0),
        low_stock: Number(lowStock ?? 10),
        unit: unit.trim() || 'PCS',
      });

      router.push('/admin/products/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update product in Supabase.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Loading Product Record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#5B4A3F] flex flex-col">
      <AdminHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 relative">
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
          />
        )}

        <AdminSidebar
          isSidebarOpen={isSidebarOpen}
          activeItem="Products"
          onSelect={(item: string) => {
            if (item === 'Products') router.push('/admin/products/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/admin/products/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Products Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <Edit3 className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Edit Product Record
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Update details for {name || 'Product'} ({uniqueId})
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Edit Form */}
          {product && (
            <form onSubmit={handleSubmit} className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product ID (unique_id) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Product ID *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={uniqueId}
                      onChange={(e) => setUniqueId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Product Name *
                  </label>
                  <div className="relative">
                    <Package className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Company Selection (Dropdown with Search) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Company * (UUID FK)
                  </label>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#8A7B70] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter companies..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none"
                      />
                    </div>

                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        required
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      >
                        {companies.length === 0 ? (
                          <option value="">-- No Companies Found --</option>
                        ) : filteredCompanies.length === 0 ? (
                          <option value="">-- No matching company --</option>
                        ) : (
                          filteredCompanies.map((comp) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.name} {comp.unique_id ? `(${comp.unique_id})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Category Selection (Dropdown with Search) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Category * (UUID FK)
                  </label>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#8A7B70] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none"
                      />
                    </div>

                    <div className="relative">
                      <Tags className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      >
                        {categories.length === 0 ? (
                          <option value="">-- No Categories Found --</option>
                        ) : filteredCategories.length === 0 ? (
                          <option value="">-- No matching category --</option>
                        ) : (
                          filteredCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} {cat.unique_id ? `(${cat.unique_id})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Base Price (b.p) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Base Price (b.p) (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Purchase Price (p.p) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Purchase Price (p.p) (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Selling Price (s.p) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Selling Price (s.p) (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Quantity (q) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Stock Quantity (q) *
                  </label>
                  <div className="relative">
                    <Layers className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Low Stock Limit */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Low Stock Alert Threshold
                  </label>
                  <div className="relative">
                    <AlertTriangle className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      min="0"
                      value={lowStock}
                      onChange={(e) => setLowStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#EEE7DD] flex items-center justify-end space-x-3">
                <Link
                  href="/admin/products/dashboard"
                  className="px-5 py-2.5 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-200" />
                      <span>Update Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">Loading Form...</p>
          </div>
        </div>
      }
    >
      <EditProductForm />
    </Suspense>
  );
}
