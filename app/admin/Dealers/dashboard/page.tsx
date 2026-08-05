'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getDealers } from '@/lib/dealersStore';
import { Dealer } from '@/lib/types';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Users,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit3,
  Lock,
  IndianRupee,
  Layers,
  Inbox
} from 'lucide-react';

export default function DealersDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [limitCrossedOnly, setLimitCrossedOnly] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDealersData() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const data = await getDealers();
        if (mounted) {
          setDealers(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setFetchError(err.message || 'Failed to fetch dealers from Supabase.');
          setLoading(false);
        }
      }
    }

    loadDealersData();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Derived Calculations
  const totalDealersCount = dealers.length;
  const totalCreditAmount = dealers.reduce(
    (acc, d) => acc + (Number(d.current_credit) || 0),
    0
  );

  // Filtered List
  const filteredDealers = dealers.filter((d) => {
    // Check search query against Name, Mobile, or Unique ID / ID
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (d.name && d.name.toLowerCase().includes(query)) ||
      (d.mobile && d.mobile.toLowerCase().includes(query)) ||
      (d.unique_id && d.unique_id.toLowerCase().includes(query)) ||
      (d.id && d.id.toLowerCase().includes(query));

    // Check limit crossed filter: current_credit > credit_limit
    const currentCredit = Number(d.current_credit) || 0;
    const creditLimit = Number(d.credit_limit) || 0;
    const matchesLimitCrossed = !limitCrossedOnly || currentCredit > creditLimit;

    return matchesSearch && matchesLimitCrossed;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Dealers Data...
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
          activeItem="Dealers"
          onSelect={(item: string) => {
            if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Left Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Dealers Card */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Dealers
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalDealersCount}
                </span>
              </div>
            </div>

            {/* Total Credit Card */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <IndianRupee className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Credit
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  ₹{totalCreditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Add Dealer Button (Horizontal) & Filter & Search */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Add Dealer Button (One Horizontal Button) */}
            <div>
              <Link
                href="/admin/adddealer"
                className="w-full py-3 px-6 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 border border-[#32231B]"
              >
                <Plus className="w-5 h-5 text-amber-200" />
                <span>Add Dealer</span>
              </Link>
            </div>

            {/* Filter & Search Bar Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2 border-t border-[#EEE7DD]">
              {/* Search Bar (Name, Mobile, ID) */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dealer by Name, Mobile number, or ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>

              {/* Filter: Lim crossed dealers (current_credit > credit_limit) */}
              <div className="flex items-center space-x-2.5 bg-[#F8F4EE] border border-[#DDD3C6] px-4 py-2 rounded-xl shrink-0">
                <input
                  type="checkbox"
                  id="filter-limit-crossed"
                  checked={limitCrossedOnly}
                  onChange={(e) => setLimitCrossedOnly(e.target.checked)}
                  className="w-4 h-4 text-[#4B352A] rounded border-[#DDD3C6] focus:ring-[#A67C52] cursor-pointer"
                />
                <label
                  htmlFor="filter-limit-crossed"
                  className="text-xs font-bold text-[#4B352A] flex items-center space-x-1.5 cursor-pointer select-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Lim crossed dealers (current_credit &gt; credit_limit)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Fetch Error Display */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <strong>Database Fetch Error:</strong> {fetchError}
            </div>
          )}

          {/* All Dealers List Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] flex items-center justify-between bg-[#F8F4EE]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  All Dealers List ({filteredDealers.length})
                </h2>
              </div>
            </div>

            {/* Empty State Section if dealers list is empty */}
            {filteredDealers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">
                  No Dealers Found
                </h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery || limitCrossedOnly
                    ? 'No dealer records match your current search criteria or limit filter.'
                    : 'There are currently no dealers registered in the database. Click "Add Dealer" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-6">ID</th>
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6">Shop Name / Mobile</th>
                      <th className="py-3.5 px-6">Current Credit</th>
                      <th className="py-3.5 px-6">Credit Limit</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredDealers.map((d) => {
                      const isOverLimit = Number(d.current_credit) > Number(d.credit_limit);

                      return (
                        <tr
                          key={d.id}
                          className="hover:bg-[#F8F4EE] transition-colors"
                        >
                          {/* ID (unique_id) */}
                          <td className="py-4 px-6 font-mono font-bold text-[#4B352A]">
                            {d.unique_id || d.id.substring(0, 8)}
                          </td>

                          {/* Name */}
                          <td className="py-4 px-6 font-semibold text-[#2F241E]">
                            {d.name}
                          </td>

                          {/* Shop Name / Mobile */}
                          <td className="py-4 px-6">
                            <span className="font-medium text-[#2F241E] block">
                              {d.shop_name}
                            </span>
                            <span className="text-[#8A7B70] block text-[11px]">
                              {d.mobile}
                            </span>
                          </td>

                          {/* current_credit */}
                          <td className="py-4 px-6 font-bold">
                            <span
                              className={
                                isOverLimit ? 'text-red-600' : 'text-[#2F241E]'
                              }
                            >
                              ₹{Number(d.current_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            {isOverLimit && (
                              <span className="ml-2 inline-flex items-center text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                                Exceeded
                              </span>
                            )}
                          </td>

                          {/* credit_limit */}
                          <td className="py-4 px-6 text-[#8A7B70]">
                            ₹{Number(d.credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Edit button */}
                          <td className="py-4 px-6 text-right">
                            <Link
                              href={`/admin/editdealer?id=${d.id}`}
                              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] bg-[#F8F4EE] hover:bg-[#F2ECE2] px-3 py-1.5 rounded-lg border border-[#DDD3C6] transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
