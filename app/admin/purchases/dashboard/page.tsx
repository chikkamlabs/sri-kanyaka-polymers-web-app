'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getPurchases, PurchaseListItem } from '@/lib/purchasesStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  Layers,
  Inbox,
  Lock,
  RefreshCw,
  ExternalLink,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw
} from 'lucide-react';

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function PurchasesDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filters State: dates (from to default: today), search (name, distributor_id)
  const [fromDate, setFromDate] = useState<string>(getTodayString());
  const [toDate, setToDate] = useState<string>(getTodayString());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Purchases State
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace('/login');
        return;
      }
      setIsAuthenticated(true);
    }
    checkAuth();
  }, [router]);

  // Fetch Purchases from Supabase with debouncing on search/filters without screen reload
  const fetchPurchasesList = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const data = await getPurchases({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchQuery || undefined,
      });
      setPurchases(data);
    } catch (err: any) {
      console.error('Failed to load purchases:', err);
      setErrorMessage(err.message || 'Failed to load purchases from database.');
    } finally {
      setRefreshing(false);
    }
  }, [fromDate, toDate, searchQuery]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    const isFirstRun = loading;

    const timer = setTimeout(async () => {
      if (isFirstRun) setLoading(true);
      else setRefreshing(true);
      setErrorMessage(null);

      try {
        const data = await getPurchases({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: searchQuery || undefined,
        });
        if (active) {
          setPurchases(data);
        }
      } catch (err: any) {
        if (active) {
          setErrorMessage(err.message || 'Failed to load purchases.');
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }, isFirstRun ? 0 : 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, fromDate, toDate, searchQuery, loading]);

  // Handle Clear / Reset Dates
  const handleResetToToday = () => {
    const today = getTodayString();
    setFromDate(today);
    setToDate(today);
    setSearchQuery('');
  };

  const handleClearDates = () => {
    setFromDate('');
    setToDate('');
  };

  // Metrics: Total Purchases and Total Quantity
  const totalPurchasesCount = purchases.length;
  const totalQuantitySum = purchases.reduce((acc, p) => acc + (p.total_items_quantity || p.quantity || 0), 0);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'Submitted').toLowerCase();
    switch (s) {
      case 'completed':
      case 'received':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            {status}
          </span>
        );
      case 'approved':
      case 'in transit':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3 h-3 mr-1 text-blue-600" />
            {status}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
            Cancelled
          </span>
        );
      case 'submitted':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-700" />
            {status || 'Submitted'}
          </span>
        );
    }
  };

  // Format date & time helper
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Purchases...
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
          activeItem="Purchases"
          onSelect={(item: string) => {
            if (item === 'Purchases') {
              router.push('/admin/purchases/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Stat Cards: Total Purchases, Total Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Purchases Metric */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Purchases
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalPurchasesCount}
                </span>
              </div>
            </div>

            {/* Total Quantity Metric */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-amber-200" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Quantity
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalQuantitySum.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row & Filters (Add button, Dates filter default today, and Search bar) */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Top Action Row: Add Purchase Button and Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Link
                href="/admin/addpurchase"
                className="w-full sm:w-auto py-2.5 px-6 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 border border-[#32231B]"
              >
                <Plus className="w-4 h-4 text-amber-200" />
                <span>Add Purchase</span>
              </Link>

              <button
                type="button"
                onClick={() => fetchPurchasesList()}
                disabled={refreshing}
                title="Refresh purchases list"
                className="inline-flex items-center justify-center space-x-2 p-2.5 rounded-xl border border-[#DDD3C6] bg-[#F8F4EE] hover:bg-[#EEE7DD] text-[#5B4A3F] transition-colors text-xs font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#A67C52]' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Date Filters & Search Row */}
            <div className="pt-3 border-t border-[#EEE7DD] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
              {/* From Date (default today) */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>

              {/* To Date (default today) */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>

              {/* Search Bar (name, distributor_id) */}
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Search className="w-3.5 h-3.5 text-[#A67C52]" />
                  <span>Search Distributor / Purchase ID</span>
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8A7B70] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by distributor name or ID..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Quick Date Reset Controls */}
              <div className="lg:col-span-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetToToday}
                  className="flex-1 py-2 px-2.5 rounded-xl border border-[#DDD3C6] bg-[#F8F4EE] hover:bg-[#EEE7DD] text-[11px] font-bold text-[#4B352A] transition-colors flex items-center justify-center space-x-1"
                  title="Reset date filter to today"
                >
                  <RotateCcw className="w-3 h-3 text-[#A67C52]" />
                  <span>Today</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearDates}
                  className="py-2 px-2.5 rounded-xl border border-[#DDD3C6] bg-[#F8F4EE] hover:bg-[#EEE7DD] text-[11px] font-bold text-[#8A7B70] transition-colors"
                  title="Clear all date filters"
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* Database Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Database Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Purchases List Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] flex items-center justify-between bg-[#F8F4EE]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  Purchases List ({purchases.length})
                </h2>
              </div>
            </div>

            {/* Empty Screen if there are no purchases */}
            {purchases.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">
                  No Purchases Found
                </h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery || fromDate || toDate
                    ? 'No purchases match the selected date range or search query.'
                    : 'There are currently no purchases recorded in the database. Click "Add Purchase" above to record one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-6">Purchase ID</th>
                      <th className="py-3.5 px-6">Distributor</th>
                      <th className="py-3.5 px-6">Date &amp; Time</th>
                      <th className="py-3.5 px-6 text-center">Total Quantity</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {purchases.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-[#F8F4EE] transition-colors"
                      >
                        {/* purchase_Id */}
                        <td className="py-4 px-6 font-mono font-bold text-[#4B352A]">
                          {p.purchase_id}
                        </td>

                        {/* distributor */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-[#2F241E]">
                            {p.distributor_name}
                          </div>
                          <div className="text-[11px] font-mono text-[#8A7B70] mt-0.5">
                            {p.distributor_code}
                          </div>
                        </td>

                        {/* date&time */}
                        <td className="py-4 px-6 text-[#5B4A3F] whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1.5 text-xs text-[#5B4A3F]">
                            <Clock className="w-3.5 h-3.5 text-[#8A7B70] shrink-0" />
                            <span>{formatDateTime(p.created_at)}</span>
                          </span>
                        </td>

                        {/* Total quantity (fetched from purchase_items, if empty show 0) */}
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center space-x-1.5 bg-[#F2ECE2] text-[#4B352A] px-3 py-1 rounded-lg border border-[#DDD3C6] font-bold text-xs">
                            <Package className="w-3.5 h-3.5 text-[#A67C52]" />
                            <span>{p.total_items_quantity ?? p.quantity ?? 0}</span>
                          </span>
                        </td>

                        {/* status */}
                        <td className="py-4 px-6">
                          {getStatusBadge(p.status)}
                        </td>

                        {/* open button */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/admin/openpurchase?id=${p.id}`}
                            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#4B352A] hover:text-white bg-[#F8F4EE] hover:bg-[#4B352A] px-3.5 py-1.5 rounded-lg border border-[#DDD3C6] hover:border-[#4B352A] transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
