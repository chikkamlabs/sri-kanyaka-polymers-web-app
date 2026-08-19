'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  generateOrderUniqueId,
  getDealersForOrder,
  getProductsForOrder,
  createOrder,
  DealerOrderOption,
  ProductOrderOption,
  NewOrderItem,
} from '@/lib/createorderStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  ShoppingCart,
  ArrowLeft,
  Search,
  Users,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Wallet,
  Hash,
  X,
  CreditCard,
  Building2,
  Check,
} from 'lucide-react';

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Top Unique ID
  const [uniqueId, setUniqueId] = useState('');

  // Data Options
  const [dealers, setDealers] = useState<DealerOrderOption[]>([]);
  const [products, setProducts] = useState<ProductOrderOption[]>([]);

  // Dealer Search & Selection State
  const [dealerSearchQuery, setDealerSearchQuery] = useState('');
  const [isDealerDropdownOpen, setIsDealerDropdownOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<DealerOrderOption | null>(null);

  // Product Search & Selection State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<ProductOrderOption | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number | ''>(1);

  // Added Order Items List
  const [orderItems, setOrderItems] = useState<NewOrderItem[]>([]);

  // Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initializeCreateOrder() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const [generatedId, dealersList, productsList] = await Promise.all([
          generateOrderUniqueId(),
          getDealersForOrder(),
          getProductsForOrder(),
        ]);

        if (mounted) {
          setUniqueId(generatedId);
          setDealers(dealersList);
          setProducts(productsList);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to initialize order creation form.');
          setLoading(false);
        }
      }
    }

    initializeCreateOrder();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Filtered dealers for search dropdown
  const filteredDealers = dealers.filter((d) => {
    const q = dealerSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.unique_id && d.unique_id.toLowerCase().includes(q)) ||
      (d.shop_name && d.shop_name.toLowerCase().includes(q))
    );
  });

  // Filtered products for search dropdown
  const filteredProducts = products.filter((p) => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.unique_id && p.unique_id.toLowerCase().includes(q)) ||
      (p.company_name && p.company_name.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  });

  // Handle selecting a product from dropdown
  const handleSelectProduct = (product: ProductOrderOption) => {
    setSelectedProductToAdd(product);
    setItemQuantity(1);
    setIsProductDropdownOpen(false);
    setProductSearchQuery('');
  };

  // Add Item to Order
  const handleAddItem = () => {
    if (!selectedProductToAdd) return;

    const qty = Number(itemQuantity);
    if (!qty || qty <= 0) {
      setErrorMessage('Please enter a valid requested quantity greater than 0.');
      return;
    }

    // Check if product already added
    const existingIndex = orderItems.findIndex(
      (item) => item.product_id === selectedProductToAdd.id
    );

    if (existingIndex > -1) {
      // Update quantity
      const updated = [...orderItems];
      updated[existingIndex].requested_quantity += qty;
      setOrderItems(updated);
    } else {
      // Add new item
      setOrderItems([
        ...orderItems,
        {
          product_id: selectedProductToAdd.id,
          product_name: selectedProductToAdd.name,
          product_unique_id: selectedProductToAdd.unique_id,
          purchase_price: selectedProductToAdd.purchase_price,
          requested_quantity: qty,
          unit: selectedProductToAdd.unit,
        },
      ]);
    }

    // Reset current selection
    setSelectedProductToAdd(null);
    setItemQuantity(1);
    setErrorMessage(null);
  };

  // Update item quantity in list
  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...orderItems];
    updated[index].requested_quantity = Math.floor(newQty);
    setOrderItems(updated);
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    const updated = orderItems.filter((_, i) => i !== index);
    setOrderItems(updated);
  };

  // Calculate grand total purchase value
  const totalPurchaseValue = orderItems.reduce(
    (sum, item) => sum + item.purchase_price * item.requested_quantity,
    0
  );

  const totalQuantity = orderItems.reduce(
    (sum, item) => sum + item.requested_quantity,
    0
  );

  // Submit Order (Done)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDealer) {
      setErrorMessage('Please search and select a Dealer for this order.');
      return;
    }

    if (orderItems.length === 0) {
      setErrorMessage('Please add at least one product item to the order.');
      return;
    }

    setSubmitting(true);

    try {
      await createOrder({
        unique_id: uniqueId,
        dealer_id: selectedDealer.id,
        notes: notes.trim() || null,
        items: orderItems.map((item) => ({
          product_id: item.product_id,
          requested_quantity: item.requested_quantity,
          purchase_price: item.purchase_price,
        })),
      });

      router.push('/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit order to Supabase.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Initializing Order Form...
          </p>
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
          activeItem="Orders"
          onSelect={(item: string) => {
            if (item === 'Home' || item === 'Orders') {
              router.push('/admin/dashboard');
            } else if (item === 'Discounts') {
              router.push('/admin/discounts/dashboard');
            } else if (item === 'Products') {
              router.push('/admin/products/dashboard');
            } else if (item === 'Companies') {
              router.push('/admin/companies/dashboard');
            } else if (item === 'Categories') {
              router.push('/admin/categories/dashboard');
            } else if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-28 sm:pb-12">
          {/* Back to Dashboard Link */}
          <div className="mb-4">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Top Banner Displaying Order Unique ID */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                New Order Reference
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-[#2F241E] font-mono tracking-tight">
                  {uniqueId}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Validation Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Step 1: Search and Select Dealer */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEE7DD] pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#A67C52]" />
                  <h2 className="text-xs font-bold text-[#2F241E] uppercase tracking-wider">
                    1. Select Dealer *
                  </h2>
                </div>
                {selectedDealer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDealer(null);
                      setIsDealerDropdownOpen(true);
                    }}
                    className="text-xs font-semibold text-[#A67C52] hover:text-[#6F4E37] underline"
                  >
                    Change Dealer
                  </button>
                )}
              </div>

              {!selectedDealer ? (
                <div className="relative">
                  <label className="block text-xs font-semibold text-[#4B352A] mb-1.5">
                    Search and select dealer by Name or Dealer ID:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={dealerSearchQuery}
                      onChange={(e) => {
                        setDealerSearchQuery(e.target.value);
                        setIsDealerDropdownOpen(true);
                      }}
                      onFocus={() => setIsDealerDropdownOpen(true)}
                      placeholder="Type dealer name or dealer ID (e.g. DLR-1001)..."
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                    {dealerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDealerSearchQuery('')}
                        className="absolute right-3 top-3 text-[#8A7B70] hover:text-[#2F241E]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dealer Search Dropdown List */}
                  {isDealerDropdownOpen && (
                    <div className="absolute z-20 mt-1.5 w-full bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-[#EEE7DD]">
                      {filteredDealers.length === 0 ? (
                        <div className="p-4 text-xs text-center text-[#8A7B70]">
                          No matching dealers found.
                        </div>
                      ) : (
                        filteredDealers.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setSelectedDealer(d);
                              setIsDealerDropdownOpen(false);
                              setDealerSearchQuery('');
                              setErrorMessage(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-[#F8F4EE] flex items-center justify-between text-xs transition-colors"
                          >
                            <span className="font-bold text-[#2F241E] text-sm">
                              {d.name}
                            </span>
                            <span className="font-mono font-bold text-[#A67C52] bg-[#F8F4EE] px-2 py-0.5 rounded border border-[#DDD3C6]">
                              {d.unique_id}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* When selected, show just the dealer name, credit, dealer_id */
                <div className="bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Dealer Name */}
                    <div>
                      <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                        Dealer Name
                      </span>
                      <span className="text-base font-bold text-[#2F241E] mt-0.5 block">
                        {selectedDealer.name}
                      </span>
                    </div>

                    {/* Credit */}
                    <div>
                      <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                        Credit
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <Wallet className="w-4 h-4 text-[#A67C52]" />
                        <span className="text-base font-black text-emerald-800 font-mono">
                          ₹{selectedDealer.current_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Dealer ID */}
                    <div>
                      <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                        Dealer ID
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <Hash className="w-4 h-4 text-[#8A7B70]" />
                        <span className="text-base font-mono font-bold text-[#4B352A]">
                          {selectedDealer.unique_id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Search, Select and Add Items */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#EEE7DD] pb-3">
                <Package className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-xs font-bold text-[#2F241E] uppercase tracking-wider">
                  2. Search & Add Items*
                </h2>
              </div>

              {/* Product Search Input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-[#4B352A] mb-1.5">
                  Search product by Name, ID, or Category:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    placeholder="Type to search products..."
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProductSearchQuery('')}
                      className="absolute right-3 top-3 text-[#8A7B70] hover:text-[#2F241E]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Product Search Dropdown List */}
                {isProductDropdownOpen && (
                  <div className="absolute z-20 mt-1.5 w-full bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-[#EEE7DD]">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-xs text-center text-[#8A7B70]">
                        No matching products found.
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="w-full px-4 py-3 text-left hover:bg-[#F8F4EE] flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-[#2F241E] text-sm">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[#8A7B70] mt-0.5">
                              {p.unique_id} • {p.company_name || 'Generic'} • {p.category_name || 'Category'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-800 font-mono block">
                              ₹{p.purchase_price.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#8A7B70]">
                              Stock: {p.quantity} {p.unit}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Product Card for Inputting requested_quantity */}
              {selectedProductToAdd && (
                <div className="bg-[#F8F4EE] border-2 border-[#A67C52] rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A67C52]">
                        Selected Product
                      </span>
                      <h3 className="text-base font-black text-[#2F241E]">
                        {selectedProductToAdd.name}
                      </h3>
                      <p className="text-xs text-[#8A7B70] font-mono">
                        {selectedProductToAdd.unique_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProductToAdd(null)}
                      className="text-[#8A7B70] hover:text-[#2F241E] p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-2 border-t border-[#DDD3C6]">
                    {/* Purchase Price Display */}
                    <div>
                      <span className="text-xs font-bold text-[#4B352A] uppercase tracking-wider block mb-1">
                        Purchase Price
                      </span>
                      <div className="text-lg font-black text-emerald-800 font-mono bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]">
                        ₹{selectedProductToAdd.purchase_price.toFixed(3)}
                      </div>
                    </div>

                    {/* Requested Quantity Input */}
                    <div>
                      <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-1">
                        Requested Quantity ({selectedProductToAdd.unit}) *
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={itemQuantity}
                          onChange={(e) =>
                            setItemQuantity(
                              e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10))
                            )
                          }
                          className="w-full px-3.5 py-2 bg-[#FFFCF8] border border-[#DDD3C6] rounded-xl text-sm font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                        />
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="px-5 py-2.5 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 shrink-0"
                        >
                          <Plus className="w-4 h-4 text-amber-200" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items Table / List */}
              <div className="pt-2">
                <span className="text-xs font-bold text-[#4B352A] uppercase tracking-wider block mb-2">
                  Order Items List ({orderItems.length})
                </span>

                {orderItems.length === 0 ? (
                  <div className="border border-dashed border-[#DDD3C6] rounded-xl p-8 text-center text-xs text-[#8A7B70] bg-[#FAF8F5]">
                    No items added yet. Search and select a product above to add items to this order.
                  </div>
                ) : (
                  <div className="border border-[#DDD3C6] rounded-xl overflow-hidden bg-[#FFFCF8]">
                    <div className="divide-y divide-[#EEE7DD]">
                      {orderItems.map((item, index) => (
                        <div
                          key={item.product_id}
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F4EE] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-[#A67C52] bg-[#F2ECE2] px-1.5 py-0.5 rounded">
                                #{index + 1}
                              </span>
                              <h4 className="text-sm font-bold text-[#2F241E] truncate">
                                {item.product_name}
                              </h4>
                            </div>
                            <div className="text-[11px] text-[#8A7B70] mt-0.5 font-mono">
                              {item.product_unique_id} • Purchase Price: ₹{item.purchase_price.toFixed(3)} / {item.unit}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end space-x-4">
                            {/* Quantity Editor */}
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-semibold text-[#8A7B70]">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.requested_quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(
                                    index,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-16 px-2 py-1 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-bold text-center text-[#2F241E] focus:outline-none focus:ring-1 focus:ring-[#A67C52]"
                              />
                            </div>

                            {/* Item Subtotal */}
                            <div className="text-right min-w-[80px]">
                              <span className="text-xs font-black text-emerald-800 font-mono">
                                ₹{(item.purchase_price * item.requested_quantity).toFixed(2)}
                              </span>
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-[#F2ECE2] p-4 border-t border-[#DDD3C6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-[#4B352A]">Total Items: </span>
                        <span className="font-bold text-[#2F241E]">{orderItems.length} products</span>
                        <span className="text-[#8A7B70] ml-2">({totalQuantity} total qty)</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-[#4B352A]">Total Estimated Value: </span>
                        <span className="text-base font-black text-emerald-900 font-mono">
                          ₹{totalPurchaseValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider">
                Order Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any instructions, delivery preferences, or reference notes..."
                className="w-full px-3.5 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
              />
            </div>

            {/* Done / Action Buttons Bar */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Link
                href="/admin/dashboard"
                className="px-5 py-3 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-[#4B352A] hover:bg-[#32231B] text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Order...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-amber-200" />
                    <span>Done</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* Sticky Mobile "Done" Bar if items are added */}
      {orderItems.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-[#FFFCF8] border-t border-[#DDD3C6] shadow-lg flex items-center justify-between z-20">
          <div>
            <span className="text-[10px] text-[#8A7B70] uppercase font-bold block">
              {orderItems.length} items ({totalQuantity} qty)
            </span>
            <span className="text-sm font-black text-emerald-900 font-mono">
              ₹{totalPurchaseValue.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#4B352A] text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5"
          >
            {submitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4 text-amber-200" />
                <span>Done</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
