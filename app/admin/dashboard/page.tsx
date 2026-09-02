'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { getDashboardMetrics, DashboardMetrics } from '@/lib/dashboardStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Lock,
  Plus,
  Package,
  Users,
  ShoppingCart,
  IndianRupee,
  CreditCard,
  UserPlus,
  RefreshCw,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('Home');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    totalCustomers: 0,
    todayOrders: 0,
    todayPayments: 0,
    totalCredit: 0,
  });

  const loadMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function verifyAuthSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session?.user) {
          if (mounted) {
            setUser(null);
            router.replace('/login');
          }
          return;
        }

        if (mounted) {
          setUser(data.session.user);
          setLoading(false);
          await loadMetrics();
        }
      } catch (err) {
        if (mounted) {
          router.replace('/login');
        }
      }
    }

    verifyAuthSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.replace('/login');
      } else if (session?.user) {
        setUser(session.user);
        setLoading(false);
        loadMetrics();
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, loadMetrics]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex flex-col items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 shadow-md text-center max-w-sm w-full space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#4B352A] text-[#A67C52] rounded-xl shadow-sm">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2F241E]">
              Authenticating...
            </h2>
            <p className="text-xs text-[#8A7B70] mt-1">
              Verifying session credentials for Admin Portal access.
            </p>
          </div>
          <div className="w-full bg-[#E8DFD8] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#A67C52] h-full w-2/3 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#5B4A3F] flex flex-col relative">
      {/* Attached Header with Sidebar Toggle for Mobile */}
      <AdminHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Layout with Responsive Sidebar */}
      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay when Sidebar is open */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Backdrop"
            className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        {/* Attached Sidebar */}
        <AdminSidebar
          isSidebarOpen={isSidebarOpen}
          activeItem={activeItem}
          onSelect={(item: string) => {
            setActiveItem(item);
            if (item === 'Orders') {
              router.push('/admin/orders');
            } else if (item === 'Purchases') {
              router.push('/admin/purchases/dashboard');
            } else if (item === 'Customers') {
              router.push('/admin/customers/dashboard');
            } else if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            } else if (item === 'Distributors') {
              router.push('/admin/distributors/dashboard');
            } else if (item === 'Companies') {
              router.push('/admin/companies/dashboard');
            } else if (item === 'Categories') {
              router.push('/admin/categories/dashboard');
            } else if (item === 'Products') {
              router.push('/admin/products/dashboard');
            } else if (item === 'Discounts') {
              router.push('/admin/discounts/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Main Dashboard Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#F8F4EE] relative min-h-[calc(100vh-64px)] pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Overview Banner */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6 text-[#A67C52]" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-[#2F241E]">
                    Sri Kanyaka Polymers Dashboard
                  </h1>
                  <p className="text-xs text-[#8A7B70] mt-0.5">
                    Live operational metrics, order volumes, inventory, and payment balances.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadMetrics}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#F8F4EE] hover:bg-[#F2ECE2] text-[#4B352A] font-bold text-xs rounded-xl border border-[#DDD3C6] transition-colors self-start sm:self-auto"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#A67C52] ${metricsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* 1. Total Products (count) */}
              <Link
                href="/admin/products/dashboard"
                className="bg-[#FFFCF8] border border-[#DDD3C6] hover:border-[#A67C52] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[#F2ECE2] text-[#4B352A] group-hover:bg-[#4B352A] group-hover:text-white rounded-xl flex items-center justify-center transition-colors border border-[#DDD3C6]">
                    <Package className="w-5 h-5 text-[#A67C52] group-hover:text-amber-200" />
                  </div>
                  <span className="text-[11px] font-bold text-[#A67C52] group-hover:translate-x-0.5 transition-transform flex items-center">
                    View <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                    Total Products
                  </span>
                  <span className="text-2xl font-black text-[#2F241E] mt-1 block">
                    {metricsLoading ? (
                      <span className="inline-block w-12 h-6 bg-[#E8DFD8] animate-pulse rounded"></span>
                    ) : (
                      metrics.totalProducts
                    )}
                  </span>
                  <span className="text-[11px] text-[#8A7B70] mt-0.5 block">
                    Active Catalog Items
                  </span>
                </div>
              </Link>

              {/* 2. Total Customers (count) */}
              <Link
                href="/admin/customers/dashboard"
                className="bg-[#FFFCF8] border border-[#DDD3C6] hover:border-[#A67C52] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[#F2ECE2] text-[#4B352A] group-hover:bg-[#4B352A] group-hover:text-white rounded-xl flex items-center justify-center transition-colors border border-[#DDD3C6]">
                    <Users className="w-5 h-5 text-[#A67C52] group-hover:text-amber-200" />
                  </div>
                  <span className="text-[11px] font-bold text-[#A67C52] group-hover:translate-x-0.5 transition-transform flex items-center">
                    View <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                    Total Customers
                  </span>
                  <span className="text-2xl font-black text-[#2F241E] mt-1 block">
                    {metricsLoading ? (
                      <span className="inline-block w-12 h-6 bg-[#E8DFD8] animate-pulse rounded"></span>
                    ) : (
                      metrics.totalCustomers
                    )}
                  </span>
                  <span className="text-[11px] text-[#8A7B70] mt-0.5 block">
                    Registered Accounts
                  </span>
                </div>
              </Link>

              {/* 3. Today Orders (count) */}
              <Link
                href="/admin/orders"
                className="bg-[#FFFCF8] border border-[#DDD3C6] hover:border-[#A67C52] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[#F2ECE2] text-[#4B352A] group-hover:bg-[#4B352A] group-hover:text-white rounded-xl flex items-center justify-center transition-colors border border-[#DDD3C6]">
                    <ShoppingCart className="w-5 h-5 text-[#A67C52] group-hover:text-amber-200" />
                  </div>
                  <span className="text-[11px] font-bold text-[#A67C52] group-hover:translate-x-0.5 transition-transform flex items-center">
                    View <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                    Today Orders
                  </span>
                  <span className="text-2xl font-black text-[#2F241E] mt-1 block">
                    {metricsLoading ? (
                      <span className="inline-block w-12 h-6 bg-[#E8DFD8] animate-pulse rounded"></span>
                    ) : (
                      metrics.todayOrders
                    )}
                  </span>
                  <span className="text-[11px] text-[#8A7B70] mt-0.5 block">
                    Placed Today
                  </span>
                </div>
              </Link>

              {/* 4. Today Payments (sum of value of dealers transactions where type = sum and date is today) */}
              <Link
                href="/admin/dealerstransactions"
                className="bg-[#FFFCF8] border border-[#DDD3C6] hover:border-[#A67C52] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[#F2ECE2] text-[#4B352A] group-hover:bg-[#4B352A] group-hover:text-white rounded-xl flex items-center justify-center transition-colors border border-[#DDD3C6]">
                    <IndianRupee className="w-5 h-5 text-[#A67C52] group-hover:text-amber-200" />
                  </div>
                  <span className="text-[11px] font-bold text-[#A67C52] group-hover:translate-x-0.5 transition-transform flex items-center">
                    Ledger <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                    Today Payments
                  </span>
                  <span className="text-2xl font-black text-emerald-700 mt-1 block font-mono">
                    {metricsLoading ? (
                      <span className="inline-block w-16 h-6 bg-[#E8DFD8] animate-pulse rounded"></span>
                    ) : (
                      `₹${metrics.todayPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    )}
                  </span>
                  <span className="text-[11px] text-[#8A7B70] mt-0.5 block">
                    Received Today
                  </span>
                </div>
              </Link>

              {/* 5. Total Credit (sum of dealers.current_credit) */}
              <Link
                href="/admin/Dealers/dashboard"
                className="bg-[#FFFCF8] border border-[#DDD3C6] hover:border-[#A67C52] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group flex flex-col justify-between sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[#F2ECE2] text-[#4B352A] group-hover:bg-[#4B352A] group-hover:text-white rounded-xl flex items-center justify-center transition-colors border border-[#DDD3C6]">
                    <CreditCard className="w-5 h-5 text-[#A67C52] group-hover:text-amber-200" />
                  </div>
                  <span className="text-[11px] font-bold text-[#A67C52] group-hover:translate-x-0.5 transition-transform flex items-center">
                    Dealers <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                    Total Credit
                  </span>
                  <span className="text-2xl font-black text-[#4B352A] mt-1 block font-mono">
                    {metricsLoading ? (
                      <span className="inline-block w-16 h-6 bg-[#E8DFD8] animate-pulse rounded"></span>
                    ) : (
                      `₹${metrics.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    )}
                  </span>
                  <span className="text-[11px] text-[#8A7B70] mt-0.5 block">
                    Outstanding Dealer Credit
                  </span>
                </div>
              </Link>
            </div>

            {/* Quick Navigation Cards */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                Quick Shortcuts
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/admin/addcustomer"
                  className="p-3.5 bg-[#F8F4EE] hover:bg-[#F2ECE2] rounded-xl border border-[#DDD3C6] transition-colors flex items-center space-x-2.5"
                >
                  <UserPlus className="w-4 h-4 text-[#A67C52]" />
                  <span className="text-xs font-bold text-[#2F241E]">Add Customer</span>
                </Link>

                <Link
                  href="/admin/createorder"
                  className="p-3.5 bg-[#F8F4EE] hover:bg-[#F2ECE2] rounded-xl border border-[#DDD3C6] transition-colors flex items-center space-x-2.5"
                >
                  <ShoppingCart className="w-4 h-4 text-[#A67C52]" />
                  <span className="text-xs font-bold text-[#2F241E]">Create Order</span>
                </Link>

                <Link
                  href="/admin/adddealer"
                  className="p-3.5 bg-[#F8F4EE] hover:bg-[#F2ECE2] rounded-xl border border-[#DDD3C6] transition-colors flex items-center space-x-2.5"
                >
                  <Users className="w-4 h-4 text-[#A67C52]" />
                  <span className="text-xs font-bold text-[#2F241E]">Add Dealer</span>
                </Link>

                <Link
                  href="/admin/addpurchase"
                  className="p-3.5 bg-[#F8F4EE] hover:bg-[#F2ECE2] rounded-xl border border-[#DDD3C6] transition-colors flex items-center space-x-2.5"
                >
                  <Package className="w-4 h-4 text-[#A67C52]" />
                  <span className="text-xs font-bold text-[#2F241E]">Add Purchase</span>
                </Link>
              </div>
            </div>
          </div>

          

          {/* Bottom Right + Order Button */}
          <div className="fixed bottom-6 right-6 z-20">
            <Link
              href="/admin/createorder"
              className="inline-flex items-center space-x-2 px-5 py-3.5 bg-[#4B352A] hover:bg-[#32231B] text-white font-black text-sm rounded-2xl shadow-lg border border-[#32231B] transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5 text-amber-200" />
              <span>+ Order</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
