'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrders, OrderListItem } from '@/lib/orderStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  ShoppingCart,
  Search,
  Calendar,
  Eye,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Truck,
  Hash,
  User,
  Package,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react';

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filters State (default dates to today)
  const [fromDate, setFromDate] = useState<string>(getTodayString());
  const [toDate, setToDate] = useState<string>(getTodayString());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Orders State
  const [orders, setOrders] = useState<OrderListItem[]>([]);

  // Fetch orders from Supabase using lib/orderStore.ts
  const fetchOrdersList = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true);
    else setRefreshing(true);
    setErrorMessage(null);

    try {
      const data = await getOrders({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchQuery || undefined,
      });
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setErrorMessage(err.message || 'Failed to load orders from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate, searchQuery]);

  useEffect(() => {
    let mounted = true;

    async function checkAuthAndLoad() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace('/login');
        return;
      }

      if (mounted) {
        fetchOrdersList(true);
      }
    }

    checkAuthAndLoad();

    return () => {
      mounted = false;
    };
  }, [router, fetchOrdersList]);

  // Handle Clear Filter Dates
  const handleResetToToday = () => {
    const today = getTodayString();
    setFromDate(today);
    setToDate(today);
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Delivered
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3 h-3 mr-1 text-blue-600" />
            Approved
          </span>
        );
      case 'Submitted':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-700" />
            Submitted
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#5B4A3F] flex flex-col">
      {/* Header */}
      <AdminHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
          />
        )}

        {/* Sidebar */}
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

        {/* Main Orders Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-28 sm:pb-12">
          {/* Top Bar: Title, Count, & + New Order */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#2F241E] tracking-tight">
                  Orders Management
                </h1>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-bold text-[#8A7B70]">
                    Total Orders:
                  </span>
                  <span className="text-xs font-black text-[#4B352A] bg-[#F2ECE2] px-2.5 py-0.5 rounded-full border border-[#DDD3C6]">
                    {orders.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => fetchOrdersList(false)}
                disabled={refreshing}
                title="Refresh orders"
                className="p-2.5 rounded-xl border border-[#DDD3C6] bg-[#F8F4EE] hover:bg-[#EEE7DD] text-[#5B4A3F] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#A67C52]' : ''}`} />
              </button>

              <Link
                href="/admin/createorder"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#4B352A] hover:bg-[#32231B] text-white font-black text-xs sm:text-sm rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-amber-200" />
                <span>+ Create Order</span>
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Error Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Filter Bar: From Date, To Date, Search */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 sm:p-5 shadow-sm mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
              {/* From Date */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-semibold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>

              {/* To Date */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-semibold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>

              {/* Search Order ID, Dealer Name, Dealer ID */}
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Search className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>Search Order ID / Dealer Name / Dealer ID</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, Dealer Name, Dealer ID..."
                    className="w-full pl-3 pr-8 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-semibold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[#8A7B70] hover:text-[#2F241E]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reset/Today Button */}
              <div className="lg:col-span-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetToToday}
                  className="w-full py-2 px-3 bg-[#F2ECE2] hover:bg-[#E8DFD3] border border-[#DDD3C6] rounded-xl text-xs font-bold text-[#4B352A] transition-colors text-center"
                >
                  Reset Today
                </button>
              </div>
            </div>
          </div>

          {/* Orders Display List / Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8A7B70] space-y-2">
                <ShoppingCart className="w-8 h-8 text-[#DDD3C6] mx-auto mb-2" />
                <p className="font-semibold text-sm text-[#4B352A]">No orders found</p>
                <p className="text-xs text-[#8A7B70]">
                  No orders match the selected date range ({fromDate} to {toDate}) or search query.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F2ECE2] border-b border-[#DDD3C6] text-[11px] font-bold text-[#4B352A] uppercase tracking-wider">
                        <th className="py-3.5 px-4">Order ID</th>
                        <th className="py-3.5 px-4">Dealer Name</th>
                        <th className="py-3.5 px-4">Dealer ID</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-center">Count of Items</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEE7DD] text-xs">
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-[#F8F4EE] transition-colors"
                        >
                          {/* Order ID */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-sm text-[#2F241E]">
                              {order.unique_id}
                            </span>
                            <span className="block text-[10px] text-[#8A7B70] mt-0.5">
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          {/* Dealer Name */}
                          <td className="py-3.5 px-4 font-bold text-[#2F241E] text-sm">
                            <div className="flex items-center space-x-1.5">
                              <User className="w-3.5 h-3.5 text-[#A67C52] shrink-0" />
                              <span>{order.dealer_name}</span>
                            </div>
                          </td>

                          {/* Dealer ID */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[#A67C52] bg-[#F8F4EE] px-2 py-0.5 rounded border border-[#DDD3C6]">
                              {order.dealer_unique_id}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {getStatusBadge(order.status)}
                          </td>

                          {/* Count of Items */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full bg-[#F2ECE2] text-[#4B352A] border border-[#DDD3C6]">
                              <Package className="w-3 h-3 mr-1 text-[#A67C52]" />
                              {order.items_count}
                            </span>
                          </td>

                          {/* Action (Open) */}
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/admin/openorder?id=${order.id}`}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl transition-all shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-200" />
                              <span>Open</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-[#EEE7DD]">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 space-y-3 hover:bg-[#F8F4EE] transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#8A7B70] uppercase">
                            Order ID
                          </span>
                          <h3 className="text-base font-black text-[#2F241E] font-mono">
                            {order.unique_id}
                          </h3>
                        </div>
                        <div>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#EEE7DD]">
                        <div>
                          <span className="text-[10px] font-bold text-[#8A7B70] uppercase block">
                            Dealer Name
                          </span>
                          <span className="font-bold text-[#2F241E]">
                            {order.dealer_name}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-[#8A7B70] uppercase block">
                            Dealer ID
                          </span>
                          <span className="font-mono font-bold text-[#A67C52]">
                            {order.dealer_unique_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#EEE7DD]">
                        <div className="text-xs">
                          <span className="text-[#8A7B70]">Items: </span>
                          <span className="font-bold text-[#2F241E]">
                            {order.items_count} items
                          </span>
                        </div>

                        <Link
                          href={`/admin/openorder?id=${order.id}`}
                          className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#4B352A] text-white text-xs font-bold rounded-xl shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-200" />
                          <span>Open</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
