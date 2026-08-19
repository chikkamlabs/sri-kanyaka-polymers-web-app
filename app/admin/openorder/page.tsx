'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getOrderDetailsById,
  updateOrderItems,
  OpenOrderDetail,
  UpdateOrderItemPayload,
} from '@/lib/orderStore';
import { OrderStatus } from '@/lib/types';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  ShoppingCart,
  ArrowLeft,
  Users,
  Package,
  Wallet,
  Hash,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Clock,
  Truck,
  Check,
} from 'lucide-react';

interface EditableItemState {
  id: string;
  product_id: string;
  product_name: string;
  product_unique_id: string;
  unit: string;
  purchase_price: number; // p.p
  requested_quantity: number;
  released_quantity: number;
  selling_price: number;
}

function OpenOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [order, setOrder] = useState<OpenOrderDetail | null>(null);
  const [editableItems, setEditableItems] = useState<EditableItemState[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Submitted');

  useEffect(() => {
    let mounted = true;

    async function loadOrder() {
      if (!orderId) {
        setErrorMessage('No Order ID provided in URL.');
        setLoading(false);
        return;
      }

      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const orderData = await getOrderDetailsById(orderId);

        if (mounted) {
          setOrder(orderData);
          setOrderStatus(orderData.status);
          setEditableItems(
            orderData.items.map((it) => ({
              id: it.id,
              product_id: it.product_id,
              product_name: it.product_name,
              product_unique_id: it.product_unique_id,
              unit: it.unit,
              purchase_price: it.purchase_price,
              requested_quantity: it.requested_quantity,
              // If released_quantity is 0 and status is Submitted, default to requested_quantity for convenience
              released_quantity: it.released_quantity !== undefined ? it.released_quantity : it.requested_quantity,
              selling_price: it.selling_price || it.purchase_price || 0,
            }))
          );
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to load order details.');
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      mounted = false;
    };
  }, [orderId, router]);

  // Update released quantity for a specific item
  const handleReleasedQuantityChange = (index: number, val: string) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    const updated = [...editableItems];
    updated[index].released_quantity = num;
    setEditableItems(updated);
  };

  // Update selling price for a specific item
  const handleSellingPriceChange = (index: number, val: string) => {
    const num = val === '' ? 0 : Math.max(0, parseFloat(val) || 0);
    const updated = [...editableItems];
    updated[index].selling_price = num;
    setEditableItems(updated);
  };

  // Handle Save / Update
  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateOrderItemPayload[] = editableItems.map((it) => ({
        id: it.id,
        released_quantity: it.released_quantity,
        selling_price: it.selling_price,
      }));

      await updateOrderItems(orderId, payload, orderStatus);

      setSuccessMessage('Order items and details updated successfully in Supabase!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error updating order:', err);
      setErrorMessage(err.message || 'Failed to update order in Supabase.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate live totals
  const totalReleasedQuantity = editableItems.reduce(
    (sum, item) => sum + item.released_quantity,
    0
  );
  const totalSellingValue = editableItems.reduce(
    (sum, item) => sum + item.released_quantity * item.selling_price,
    0
  );
  const totalPurchaseValue = editableItems.reduce(
    (sum, item) => sum + item.requested_quantity * item.purchase_price,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Order Details...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-md w-full space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-[#2F241E]">Order Not Found</h2>
          <p className="text-xs text-[#8A7B70]">{errorMessage || 'The requested order does not exist.'}</p>
          <Link
            href="/admin/orders"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#4B352A] text-white text-xs font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Orders</span>
          </Link>
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
            if (item === 'Home') {
              router.push('/admin/dashboard');
            } else if (item === 'Orders') {
              router.push('/admin/orders');
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
          {/* Back to Orders Link */}
          <div className="mb-4">
            <Link
              href="/admin/orders"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Orders List</span>
            </Link>
          </div>

          {/* Top Banner Displaying Order ID */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Order Reference ID
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-[#2F241E] font-mono tracking-tight">
                    {order.unique_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#4B352A]">Status:</span>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className="px-3 py-1.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
              >
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-900">Success</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Error Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdateOrder} className="space-y-6">
            {/* Dealer Details Card (same like createorder/page.tsx: Dealer Name, Credit, Dealer ID) */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#EEE7DD] pb-3">
                <Users className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-xs font-bold text-[#2F241E] uppercase tracking-wider">
                  Dealer Details
                </h2>
              </div>

              <div className="bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Dealer Name */}
                  <div>
                    <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                      Dealer Name
                    </span>
                    <span className="text-base font-bold text-[#2F241E] mt-0.5 block">
                      {order.dealer.name}
                    </span>
                    {order.dealer.shop_name && (
                      <span className="text-xs text-[#8A7B70] block mt-0.5">
                        {order.dealer.shop_name}
                      </span>
                    )}
                  </div>

                  {/* Credit */}
                  <div>
                    <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                      Credit
                    </span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <Wallet className="w-4 h-4 text-[#A67C52]" />
                      <span className="text-base font-black text-emerald-800 font-mono">
                        ₹{order.dealer.current_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                        {order.dealer.unique_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Display All order_items: requested quantity, p.p, ask released_quantity and selling price */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEE7DD] pb-3">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#A67C52]" />
                  <h2 className="text-xs font-bold text-[#2F241E] uppercase tracking-wider">
                    Order Items ({editableItems.length})
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {editableItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl p-4 sm:p-5 space-y-3"
                  >
                    {/* Item Header: Name & ID */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E5DCDB] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[#A67C52] bg-[#FFFCF8] px-2 py-0.5 rounded border border-[#DDD3C6]">
                          #{index + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[#2F241E]">
                          {item.product_name}
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#8A7B70]">
                        {item.product_unique_id}
                      </span>
                    </div>

                    {/* Requested Qty & p.p (Purchase Price) Display */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {/* Requested Quantity */}
                      <div className="bg-[#FFFCF8] p-3 rounded-xl border border-[#DDD3C6]">
                        <span className="text-[10px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                          Requested Qty
                        </span>
                        <span className="text-sm font-black text-[#2F241E] font-mono mt-0.5 block">
                          {item.requested_quantity} {item.unit}
                        </span>
                      </div>

                      {/* Purchase Price (p.p) */}
                      <div className="bg-[#FFFCF8] p-3 rounded-xl border border-[#DDD3C6]">
                        <span className="text-[10px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                          Purchase Price (p.p)
                        </span>
                        <span className="text-sm font-black text-emerald-800 font-mono mt-0.5 block">
                          ₹{item.purchase_price.toFixed(3)}
                        </span>
                      </div>

                      {/* Input: Released Quantity */}
                      <div className="bg-[#FFFCF8] p-3 rounded-xl border-2 border-[#A67C52]">
                        <label className="text-[10px] font-bold text-[#4B352A] uppercase tracking-wider block mb-1">
                          Released Qty ({item.unit}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={item.released_quantity}
                          onChange={(e) => handleReleasedQuantityChange(index, e.target.value)}
                          className="w-full px-2.5 py-1 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-black text-[#2F241E] focus:outline-none focus:ring-1 focus:ring-[#A67C52]"
                        />
                      </div>

                      {/* Input: Selling Price */}
                      <div className="bg-[#FFFCF8] p-3 rounded-xl border-2 border-[#A67C52]">
                        <label className="text-[10px] font-bold text-[#4B352A] uppercase tracking-wider block mb-1">
                          Selling Price (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.selling_price}
                          onChange={(e) => handleSellingPriceChange(index, e.target.value)}
                          className="w-full px-2.5 py-1 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-black text-emerald-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#A67C52]"
                        />
                      </div>
                    </div>

                    {/* Item Total Display */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E5DCDB] text-[#8A7B70]">
                      <span>
                        Estimated Released Subtotal:
                      </span>
                      <span className="font-mono font-bold text-[#2F241E]">
                        {item.released_quantity} × ₹{item.selling_price.toFixed(2)} = ₹
                        {(item.released_quantity * item.selling_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Calculations Footer */}
              <div className="bg-[#F2ECE2] p-4 rounded-xl border border-[#DDD3C6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#4B352A]">Total Released Qty: </span>
                  <span className="font-black text-[#2F241E]">{totalReleasedQuantity}</span>
                  <span className="text-[#8A7B70] ml-2">across {editableItems.length} items</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-[#4B352A]">Total Selling Value: </span>
                  <span className="text-base font-black text-emerald-900 font-mono">
                    ₹{totalSellingValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes if available */}
            {order.notes && (
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-1.5">
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Order Notes
                </span>
                <p className="text-xs text-[#2F241E] bg-[#F8F4EE] p-3 rounded-xl border border-[#DDD3C6]">
                  {order.notes}
                </p>
              </div>
            )}

            {/* Update / Save Button */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Link
                href="/admin/orders"
                className="px-5 py-3 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-[#4B352A] hover:bg-[#32231B] text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating in Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 text-amber-200" />
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* Sticky Mobile "Update" Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-[#FFFCF8] border-t border-[#DDD3C6] shadow-lg flex items-center justify-between z-20">
        <div>
          <span className="text-[10px] text-[#8A7B70] uppercase font-bold block">
            {totalReleasedQuantity} released qty
          </span>
          <span className="text-sm font-black text-emerald-900 font-mono">
            ₹{totalSellingValue.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleUpdateOrder}
          disabled={saving}
          className="px-6 py-2.5 bg-[#4B352A] text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5"
        >
          {saving ? (
            <span>Updating...</span>
          ) : (
            <>
              <Check className="w-4 h-4 text-amber-200" />
              <span>Update</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function OpenOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <OpenOrderContent />
    </Suspense>
  );
}
