'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getDiscounts,
  DiscountWithDetails
} from '@/lib/discountsStore';
import {
  getCompanyOptions,
  getCategoryOptions,
  DropdownOption
} from '@/lib/productsStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Percent,
  Plus,
  Search,
  Edit3,
  Lock,
  Building2,
  Tags,
  Inbox,
  Layers,
  Filter
} from 'lucide-react';

export default function DiscountsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState<DiscountWithDetails[]>([]);
  const [companies, setCompanies] = useState<DropdownOption[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDiscountsData() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const [discountsData, compOptions, catOptions] = await Promise.all([
          getDiscounts(),
          getCompanyOptions(),
          getCategoryOptions(),
        ]);

        if (mounted) {
          setDiscounts(discountsData);
          setCompanies(compOptions);
          setCategories(catOptions);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setFetchError(err.message || 'Failed to fetch discounts from Supabase.');
          setLoading(false);
        }
      }
    }

    loadDiscountsData();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Total Count
  const totalDiscountsCount = discounts.length;

  // Filtered Discounts List
  const filteredDiscounts = discounts.filter((d) => {
    // 1. Search Query (Company Name or Category Name)
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const compMatch = d.company_name && d.company_name.toLowerCase().includes(query);
      const catMatch = d.category_name && d.category_name.toLowerCase().includes(query);
      if (!compMatch && !catMatch) {
        return false;
      }
    }

    // 2. Filter by Company
    if (selectedCompanyId && d.company_id !== selectedCompanyId) {
      return false;
    }

    // 3. Filter by Category
    if (selectedCategoryId && d.category_id !== selectedCategoryId) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Discounts Data...
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
          activeItem="Discounts"
          onSelect={(item: string) => {
            if (item === 'Discounts') {
              router.push('/admin/discounts/dashboard');
            } else if (item === 'Products') {
              router.push('/admin/products/dashboard');
            } else if (item === 'Companies') {
              router.push('/admin/companies/dashboard');
            } else if (item === 'Categories') {
              router.push('/admin/categories/dashboard');
            } else if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            } else if (item === 'Home' || item === 'Orders') {
              router.push('/admin/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Left Stats Bar: Total Discounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Percent className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Discounts
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalDiscountsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Add Discount Button & Search Bar / Filters */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Add Discount Button */}
            <div>
              <Link
                href="/admin/adddiscount"
                className="w-full py-3 px-6 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 border border-[#32231B]"
              >
                <Plus className="w-5 h-5 text-amber-200" />
                <span>Add Discount</span>
              </Link>
            </div>

            {/* Search Bar & Filter Controls Row */}
            <div className="pt-2 border-t border-[#EEE7DD] space-y-3">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discounts by Company Name or Category Name..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>

              {/* Filters Row: Company & Category Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Filter by Company */}
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#8A7B70] absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-semibold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  >
                    <option value="">All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Category */}
                <div className="relative">
                  <Tags className="w-4 h-4 text-[#8A7B70] absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-semibold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message if fetch failed */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <strong>Database Error:</strong> {fetchError}
            </div>
          )}

          {/* Discounts List Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] flex items-center justify-between bg-[#F8F4EE]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  All Discounts List ({filteredDiscounts.length})
                </h2>
              </div>
            </div>

            {/* Empty State Section if discounts list is empty */}
            {filteredDiscounts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">
                  No Discounts Found
                </h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery || selectedCompanyId || selectedCategoryId
                    ? 'No discounts match your active search or filter criteria.'
                    : 'There are currently no discount rules configured in the database. Click "Add Discount" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-6">S.No</th>
                      <th className="py-3.5 px-6">Company Name</th>
                      <th className="py-3.5 px-6">Category Name</th>
                      <th className="py-3.5 px-6 text-rose-800">d1 (-%)</th>
                      <th className="py-3.5 px-6 text-rose-800">d2 (-%)</th>
                      <th className="py-3.5 px-6 text-rose-800">d3 (-%)</th>
                      <th className="py-3.5 px-6 text-emerald-800">d4 (+%)</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredDiscounts.map((discount, index) => (
                      <tr
                        key={discount.id}
                        className="hover:bg-[#F8F4EE] transition-colors"
                      >
                        {/* s.no (1,2,3..) */}
                        <td className="py-4 px-6 font-mono font-bold text-[#4B352A]">
                          {index + 1}
                        </td>

                        {/* Company Name */}
                        <td className="py-4 px-6 font-semibold text-[#2F241E]">
                          {discount.company_name || 'Unassigned'}
                        </td>

                        {/* Category Name */}
                        <td className="py-4 px-6 font-semibold text-[#2F241E]">
                          {discount.category_name || 'Unassigned'}
                        </td>

                        {/* d1 */}
                        <td className="py-4 px-6 font-mono font-bold text-rose-700">
                          {discount.d1}%
                        </td>

                        {/* d2 */}
                        <td className="py-4 px-6 font-mono font-bold text-rose-700">
                          {discount.d2}%
                        </td>

                        {/* d3 */}
                        <td className="py-4 px-6 font-mono font-bold text-rose-700">
                          {discount.d3}%
                        </td>

                        {/* d4 */}
                        <td className="py-4 px-6 font-mono font-bold text-emerald-700">
                          {discount.d4}%
                        </td>

                        {/* Edit Button */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/admin/editdiscount?id=${discount.id}`}
                            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] bg-[#F8F4EE] hover:bg-[#F2ECE2] px-3 py-1.5 rounded-lg border border-[#DDD3C6] transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
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
