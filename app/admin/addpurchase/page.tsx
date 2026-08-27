'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  generatePurchaseId,
  getDistributorsForPurchase,
  getProductsForPurchase,
  createPurchase,
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
  Building2,
  Tags,
  Check,
  FileText,
  Clock
} from 'lucide-react';

interface AddedPurchaseItem {
  product_id: string;
  product_name: string;
  product_unique_id: string;
  company_name: string;
  category_name: string;
  unit: string;
  quantity: number;
}

export default function AddPurchasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form Fields - purchases table
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

  // Added Purchase Items list for purchase_items table
  const [purchaseItems, setPurchaseItems] = useState<AddedPurchaseItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function initializeAddPurchase() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const [generatedId, distList, prodList] = await Promise.all([
          generatePurchaseId(),
          getDistributorsForPurchase(),
          getProductsForPurchase(),
        ]);

        if (mounted) {
          setPurchaseId(generatedId);
          setDistributors(distList);
          setProducts(prodList);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to initialize purchase creation form.');
          setLoading(false);
        }
      }
    }

    initializeAddPurchase();

    return () => {
      mounted = false;
    };
  }, [router]);

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

  // Filtered distributors for search & select
  const filteredDistributors = distributors.filter((d) => {
    const q = distributorSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.distributor_code && d.distributor_code.toLowerCase().includes(q)) ||
      (d.location && d.location.toLowerCase().includes(q))
    );
  });

  // Filtered products for search & select (display name, id, category, company)
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

  // Select Product
  const handleSelectProduct = (prod: ProductPurchaseOption) => {
    setSelectedProduct(prod);
    setItemQuantity(1);
    setIsProductDropdownOpen(false);
    setProductSearch('');
  };

  // Add Item to purchaseItems
  const handleAddProductItem = () => {
    if (!selectedProduct) return;

    const qty = typeof itemQuantity === 'number' ? itemQuantity : parseInt(String(itemQuantity), 10);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }

    // Check if already in list
    const existingIndex = purchaseItems.findIndex((it) => it.product_id === selectedProduct.id);
    if (existingIndex > -1) {
      const updated = [...purchaseItems];
      updated[existingIndex].quantity += qty;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems([
        ...purchaseItems,
        {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_unique_id: selectedProduct.unique_id,
          company_name: selectedProduct.company_name,
          category_name: selectedProduct.category_name,
          unit: selectedProduct.unit,
          quantity: qty,
        },
      ]);
    }

    // Reset picker
    setSelectedProduct(null);
    setItemQuantity(1);
    setProductSearch('');
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = [...purchaseItems];
    updated.splice(index, 1);
    setPurchaseItems(updated);
  };

  // Update Item Quantity in table
  const handleQuantityChange = (index: number, val: string) => {
    const num = val === '' ? 0 : Math.max(1, parseInt(val, 10) || 1);
    const updated = [...purchaseItems];
    updated[index].quantity = num;
    setPurchaseItems(updated);
  };

  // Total quantity calculation
  const totalQuantity = purchaseItems.reduce((acc, it) => acc + (it.quantity || 0), 0);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!purchaseId.trim()) {
      setErrorMessage('Purchase ID is required.');
      return;
    }

    if (!selectedDistributor) {
      setErrorMessage('Please search and select a distributor.');
      return;
    }

    if (purchaseItems.length === 0) {
      setErrorMessage('Please add at least one product to the purchase.');
      return;
    }

    setSubmitting(true);

    try {
      await createPurchase({
        purchase_id: purchaseId.trim(),
        distributor_id: selectedDistributor.id,
        status: status || 'Submitted',
        notes: notes.trim() || null,
        items: purchaseItems.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
        })),
      });

      router.push('/admin/purchases/dashboard');
    } catch (err: any) {
      console.error('Error creating purchase:', err);
      setErrorMessage(err.message || 'Failed to create purchase.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Initializing Purchase Entry...</p>
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

          {/* Title Header Banner */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Add New Purchase
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Record new inventory purchase from distributor and insert items
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Creation Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Add Purchase Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Purchase Header Details */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-xs font-black text-[#2F241E] uppercase tracking-wider border-b border-[#EEE7DD] pb-3">
                1. Purchase &amp; Distributor Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Purchase ID (auto-filled: purchase-yymm-101) */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Purchase ID (Auto-Filled) *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={purchaseId}
                      onChange={(e) => setPurchaseId(e.target.value)}
                      placeholder="e.g. purchase-2608-101"
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
                  Select Distributor *
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
                        placeholder="Search distributor by name, code or location..."
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
                  Purchase Notes
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional purchase details, invoice numbers, or delivery notes..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Add Products & Purchase Items */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-xs font-black text-[#2F241E] uppercase tracking-wider border-b border-[#EEE7DD] pb-3">
                2. Add Products to Purchase Items
              </h2>

              {/* Product Picker & Quantity Form */}
              <div className="p-4 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Product Search & Dropdown (display: Name, ID, Category, Company) */}
                  <div className="md:col-span-8 relative" ref={productDropdownRef}>
                    <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                      Search &amp; Select Product
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
                            placeholder="Search by product name, ID, company, or category..."
                            className="w-full pl-9 pr-3 py-2 bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </div>

                        {/* Product Dropdown displaying Name, ID, Category, Company */}
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

                  {/* Quantity Input */}
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

                  {/* Add Button */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddProductItem}
                      disabled={!selectedProduct}
                      className="w-full py-2 bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-200" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Products Table */}
              <div className="border border-[#DDD3C6] rounded-xl overflow-hidden">
                <div className="bg-[#F2ECE2] px-4 py-2.5 border-b border-[#DDD3C6] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4B352A] uppercase tracking-wider">
                    Added Items ({purchaseItems.length})
                  </span>
                  <span className="text-xs font-black text-[#2F241E]">
                    Total Quantity: {totalQuantity}
                  </span>
                </div>

                {purchaseItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8A7B70]">
                    No items added yet. Select a product above and click &quot;Add Item&quot;.
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
                        {purchaseItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#F8F4EE]">
                            <td className="py-3 px-4 font-mono font-bold text-[#4B352A]">
                              {item.product_unique_id}
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#2F241E]">
                              {item.product_name}
                            </td>
                            <td className="py-3 px-4 text-[#5B4A3F]">
                              {item.company_name}
                            </td>
                            <td className="py-3 px-4 text-[#5B4A3F]">
                              {item.category_name}
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

            {/* Submit / Cancel Actions */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex items-center justify-end space-x-3">
              <Link
                href="/admin/purchases/dashboard"
                className="px-5 py-2.5 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Purchase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-200" />
                    <span>Save Purchase</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
