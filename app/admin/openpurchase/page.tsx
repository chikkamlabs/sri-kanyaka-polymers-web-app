'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getPurchaseById,
  updatePurchase,
  getDistributorsForPurchase,
  getProductsForPurchase,
  PurchaseDetail,
  DistributorOption,
  ProductPurchaseOption,
} from '@/lib/purchasesStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  ShoppingBag,
  ArrowLeft,
  Search,
  Truck,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Hash,
  X,
  FileText,
  Clock
} from 'lucide-react';

interface EditablePurchaseItem {
  id?: string;
  product_id: string;
  product_name: string;
  product_unique_id?: string;
  company_name?: string;
  category_name?: string;
  quantity: number;
}

function OpenPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseIdParam = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Original Purchase
  const [originalPurchase, setOriginalPurchase] = useState<PurchaseDetail | null>(null);

  // Editable Form Fields
  const [purchaseId, setPurchaseId] = useState('');
  const [status, setStatus] = useState('Submitted');
  const [notes, setNotes] = useState('');

  // Distributors dropdown state
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);
  const [distributorSearch, setDistributorSearch] = useState('');
  const [isDistributorDropdownOpen, setIsDistributorDropdownOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<DistributorOption | null>(null);
  const distributorDropdownRef = useRef<HTMLDivElement>(null);

  // Products dropdown state
  const [products, setProducts] = useState<ProductPurchaseOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductPurchaseOption | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number | ''>(1);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Editable items
  const [items, setItems] = useState<EditablePurchaseItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadPurchaseData() {
      if (!purchaseIdParam) {
        setErrorMessage('No Purchase ID provided in URL.');
        setLoading(false);
        return;
      }

      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const [purchaseData, distList, prodList] = await Promise.all([
          getPurchaseById(purchaseIdParam),
          getDistributorsForPurchase(),
          getProductsForPurchase(),
        ]);

        if (!purchaseData) {
          if (mounted) {
            setErrorMessage(`Purchase with ID "${purchaseIdParam}" was not found.`);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setOriginalPurchase(purchaseData);
          setPurchaseId(purchaseData.purchase_id || '');
          setStatus(purchaseData.status || 'Submitted');
          setNotes(purchaseData.notes || '');

          setDistributors(distList);
          const currentDist = distList.find((d) => d.id === purchaseData.distributor_id);
          if (currentDist) {
            setSelectedDistributor(currentDist);
          } else {
            setSelectedDistributor({
              id: purchaseData.distributor_id,
              distributor_code: purchaseData.distributor_code,
              name: purchaseData.distributor_name,
              location: purchaseData.distributor_location,
            });
          }

          setProducts(prodList);
          setItems(
            purchaseData.items.map((it) => ({
              id: it.id,
              product_id: it.product_id,
              product_name: it.product_name,
              product_unique_id: it.product_unique_id,
              company_name: it.company_name,
              category_name: it.category_name,
              quantity: it.quantity,
            }))
          );

          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to load purchase record.');
          setLoading(false);
        }
      }
    }

    loadPurchaseData();

    return () => {
      mounted = false;
    };
  }, [purchaseIdParam, router]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        distributorDropdownRef.current &&
        !distributorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDistributorDropdownOpen(false);
      }
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered distributors
  const filteredDistributors = distributors.filter((d) => {
    const q = distributorSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.distributor_code && d.distributor_code.toLowerCase().includes(q)) ||
      (d.location && d.location.toLowerCase().includes(q))
    );
  });

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.unique_id && p.unique_id.toLowerCase().includes(q)) ||
      (p.company_name && p.company_name.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  });

  // Select product to add
  const handleSelectProduct = (prod: ProductPurchaseOption) => {
    setSelectedProduct(prod);
    setItemQuantity(1);
    setIsProductDropdownOpen(false);
    setProductSearch('');
  };

  // Add Item to table
  const handleAddItem = () => {
    if (!selectedProduct) return;

    const qty = typeof itemQuantity === 'number' ? itemQuantity : parseInt(String(itemQuantity), 10);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }

    const existingIndex = items.findIndex((it) => it.product_id === selectedProduct.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_unique_id: selectedProduct.unique_id,
          company_name: selectedProduct.company_name,
          category_name: selectedProduct.category_name,
          quantity: qty,
        },
      ]);
    }

    setSelectedProduct(null);
    setItemQuantity(1);
    setProductSearch('');
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // Quantity Change
  const handleQuantityChange = (index: number, val: string) => {
    const num = val === '' ? 0 : Math.max(1, parseInt(val, 10) || 1);
    const updated = [...items];
    updated[index].quantity = num;
    setItems(updated);
  };

  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

  // Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!originalPurchase) {
      setErrorMessage('No purchase to update.');
      return;
    }

    if (!purchaseId.trim()) {
      setErrorMessage('Purchase ID is required.');
      return;
    }

    if (!selectedDistributor) {
      setErrorMessage('Distributor is required.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Purchase must have at least one item.');
      return;
    }

    setSaving(true);

    try {
      await updatePurchase(originalPurchase.id, {
        purchase_id: purchaseId.trim(),
        distributor_id: selectedDistributor.id,
        status: status || 'Submitted',
        notes: notes.trim() || null,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
        })),
      });

      setSuccessMessage('Purchase record successfully updated in Supabase.');
      setSaving(false);

      setTimeout(() => {
        router.push('/admin/purchases/dashboard');
      }, 800);
    } catch (err: any) {
      console.error('Error updating purchase:', err);
      setErrorMessage(err.message || 'Failed to update purchase.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Loading Purchase Details...</p>
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
          activeItem="Purchases"
          onSelect={(item: string) => {
            if (item === 'Purchases') router.push('/admin/purchases/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Back Navigation */}
          <div>
            <Link
              href="/admin/purchases/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Purchases Dashboard</span>
            </Link>
          </div>

          {/* Top Header Card */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E]">
                  Edit Purchase: <span className="font-mono text-[#4B352A]">{originalPurchase?.purchase_id}</span>
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5">
                  Created on {originalPurchase?.created_at ? new Date(originalPurchase.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Total Quantity Badge */}
            <div className="flex items-center space-x-2 bg-[#F8F4EE] border border-[#DDD3C6] px-4 py-2.5 rounded-xl shrink-0">
              <Package className="w-4 h-4 text-[#A67C52]" />
              <div>
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase block">Total Quantity</span>
                <span className="text-sm font-black text-[#2F241E]">{totalQuantity}</span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-900">Success</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Edit Form */}
          {originalPurchase && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Section 1: Purchases Table Fields */}
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="text-xs font-black text-[#2F241E] uppercase tracking-wider border-b border-[#EEE7DD] pb-3">
                  1. Purchase Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Purchase ID */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Purchase ID *
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={purchaseId}
                        onChange={(e) => setPurchaseId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Status *
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Received">Received</option>
                      <option value="Completed">Completed</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Distributor Search & Selection Dropdown */}
                <div className="relative" ref={distributorDropdownRef}>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Distributor *
                  </label>

                  {selectedDistributor ? (
                    <div className="flex items-center justify-between p-3.5 bg-[#F8F4EE] border border-[#A67C52] rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#4B352A] text-white rounded-lg flex items-center justify-center font-mono font-bold text-xs">
                          <Truck className="w-4 h-4 text-amber-200" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#2F241E]">
                            {selectedDistributor.name}
                          </div>
                          <div className="text-xs text-[#8A7B70] flex items-center space-x-2">
                            <span className="font-mono">{selectedDistributor.distributor_code}</span>
                            {selectedDistributor.location && (
                              <span>• {selectedDistributor.location}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDistributor(null);
                          setDistributorSearch('');
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#EEE7DD] text-[#8A7B70] hover:text-[#2F241E] transition-colors"
                        title="Change Distributor"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={distributorSearch}
                          onChange={(e) => {
                            setDistributorSearch(e.target.value);
                            setIsDistributorDropdownOpen(true);
                          }}
                          onFocus={() => setIsDistributorDropdownOpen(true)}
                          placeholder="Search distributor to change..."
                          className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                        />
                      </div>

                      {/* Dropdown Options */}
                      {isDistributorDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-[#EEE7DD]">
                          {filteredDistributors.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[#8A7B70]">
                              No distributors found matching &quot;{distributorSearch}&quot;
                            </div>
                          ) : (
                            filteredDistributors.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDistributor(d);
                                  setIsDistributorDropdownOpen(false);
                                  setDistributorSearch('');
                                }}
                                className="w-full p-3 text-left hover:bg-[#F8F4EE] transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <span className="text-sm font-bold text-[#2F241E] block">
                                    {d.name}
                                  </span>
                                  <span className="text-xs text-[#8A7B70] font-mono">
                                    {d.distributor_code} {d.location ? `• ${d.location}` : ''}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-[#A67C52] bg-[#F2ECE2] px-2.5 py-1 rounded-lg border border-[#DDD3C6]">
                                  Select
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Notes
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Purchase terms, invoice number, or delivery notes..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-[#8A7B70]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Created: {new Date(originalPurchase.created_at).toLocaleString()}</span>
                  </span>
                  {originalPurchase.updated_at && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last Updated: {new Date(originalPurchase.updated_at).toLocaleString()}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Section 2: Purchase Items */}
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="text-xs font-black text-[#2F241E] uppercase tracking-wider border-b border-[#EEE7DD] pb-3">
                  2. Purchase Items &amp; Quantities
                </h2>

                {/* Add Product Picker */}
                <div className="p-4 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-8 relative" ref={productDropdownRef}>
                      <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                        Add More Products
                      </label>

                      {selectedProduct ? (
                        <div className="flex items-center justify-between p-2.5 bg-[#FFFCF8] border border-[#A67C52] rounded-xl">
                          <div className="flex items-center space-x-2.5">
                            <Package className="w-4 h-4 text-[#A67C52] shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-[#2F241E] block">
                                {selectedProduct.name}
                              </span>
                              <span className="text-[11px] text-[#8A7B70]">
                                <span className="font-mono">{selectedProduct.unique_id}</span> • {selectedProduct.company_name} • {selectedProduct.category_name}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(null)}
                            className="p-1 text-[#8A7B70] hover:text-[#2F241E]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[#8A7B70] absolute left-3 top-3" />
                            <input
                              type="text"
                              value={productSearch}
                              onChange={(e) => {
                                setProductSearch(e.target.value);
                                setIsProductDropdownOpen(true);
                              }}
                              onFocus={() => setIsProductDropdownOpen(true)}
                              placeholder="Search by name, ID, company, category..."
                              className="w-full pl-9 pr-3 py-2 bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                            />
                          </div>

                          {isProductDropdownOpen && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-[#EEE7DD]">
                              {filteredProducts.length === 0 ? (
                                <div className="p-3 text-center text-xs text-[#8A7B70]">
                                  No products found
                                </div>
                              ) : (
                                filteredProducts.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProduct(p)}
                                    className="w-full p-2.5 text-left hover:bg-[#F8F4EE] transition-colors flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-[#2F241E]">
                                        {p.name}
                                      </div>
                                      <div className="text-[11px] text-[#8A7B70] flex items-center space-x-2 mt-0.5">
                                        <span className="font-mono bg-[#F2ECE2] px-1.5 py-0.5 rounded text-[10px] text-[#4B352A]">
                                          {p.unique_id}
                                        </span>
                                        <span>{p.company_name}</span>
                                        <span>•</span>
                                        <span>{p.category_name}</span>
                                      </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#4B352A] bg-[#F2ECE2] px-2 py-1 rounded border border-[#DDD3C6]">
                                      Pick
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!selectedProduct}
                        className="w-full py-2 bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-200" />
                        <span>Add Item</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-[#DDD3C6] rounded-xl overflow-hidden">
                  <div className="bg-[#F2ECE2] px-4 py-2.5 border-b border-[#DDD3C6] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4B352A] uppercase tracking-wider">
                      Purchase Items ({items.length})
                    </span>
                    <span className="text-xs font-black text-[#2F241E]">
                      Total Quantity: {totalQuantity}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#8A7B70]">
                      No items in this purchase. Add at least one item using the picker above.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8F4EE] text-[#4B352A] font-bold border-b border-[#DDD3C6]">
                          <tr>
                            <th className="py-2.5 px-4">Product ID</th>
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4">Company</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4 text-center">Quantity</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEE7DD]">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F4EE]">
                              <td className="py-3 px-4 font-mono font-bold text-[#4B352A]">
                                {item.product_unique_id || '—'}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[#2F241E]">
                                {item.product_name}
                              </td>
                              <td className="py-3 px-4 text-[#5B4A3F]">
                                {item.company_name || '—'}
                              </td>
                              <td className="py-3 px-4 text-[#5B4A3F]">
                                {item.category_name || '—'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                  className="w-20 px-2 py-1 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-bold text-center text-[#2F241E]"
                                />
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex items-center justify-end space-x-3">
                <Link
                  href="/admin/purchases/dashboard"
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
                      <span>Updating Purchase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-200" />
                      <span>Update Purchase</span>
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

export default function OpenPurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">Loading Purchase Form...</p>
          </div>
        </div>
      }
    >
      <OpenPurchaseContent />
    </Suspense>
  );
}
