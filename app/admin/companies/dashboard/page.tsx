'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCompanies, CompanyWithCounts } from '@/lib/companiesStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Building2,
  Plus,
  Search,
  Edit3,
  Lock,
  Tags,
  Package,
  Inbox,
  Layers,
  Phone
} from 'lucide-react';

export default function CompaniesDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyWithCounts[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCompaniesData() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const data = await getCompanies();
        if (mounted) {
          setCompanies(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setFetchError(err.message || 'Failed to fetch companies from Supabase.');
          setLoading(false);
        }
      }
    }

    loadCompaniesData();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Derived Values
  const totalCompaniesCount = companies.length;

  // Filtered List based on Search Query (Name, ID, Mobile)
  const filteredCompanies = companies.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.mobile && c.mobile.toLowerCase().includes(query)) ||
      (c.unique_id && c.unique_id.toLowerCase().includes(query)) ||
      (c.id && c.id.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Companies Data...
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
          activeItem="Companies"
          onSelect={(item: string) => {
            if (item === 'Companies') {
              router.push('/admin/companies/dashboard');
            } else if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Left Stats Bar: Total Companies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Companies
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalCompaniesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Add Company Button & Search Bar */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Add Company Button (One Horizontal Button) */}
            <div>
              <Link
                href="/admin/addcompany"
                className="w-full py-3 px-6 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 border border-[#32231B]"
              >
                <Plus className="w-5 h-5 text-amber-200" />
                <span>Add Company</span>
              </Link>
            </div>

            {/* Search Bar Row (Name, Mobile, ID) */}
            <div className="pt-2 border-t border-[#EEE7DD]">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company by Name, ID, or Mobile number..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>
            </div>
          </div>

          {/* Error Message if fetch failed */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <strong>Database Error:</strong> {fetchError}
            </div>
          )}

          {/* All Companies List Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] flex items-center justify-between bg-[#F8F4EE]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  All Companies List ({filteredCompanies.length})
                </h2>
              </div>
            </div>

            {/* Empty State Section if companies list is empty */}
            {filteredCompanies.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">
                  No Companies Found
                </h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery
                    ? 'No company records match your current search query.'
                    : 'There are currently no companies registered in the database. Click "Add Company" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-6">ID</th>
                      <th className="py-3.5 px-6">Company Name</th>
                      <th className="py-3.5 px-6">Mobile</th>
                      <th className="py-3.5 px-6">Total Categories</th>
                      <th className="py-3.5 px-6">Total Products</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredCompanies.map((c) => {
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-[#F8F4EE] transition-colors"
                        >
                          {/* ID (unique_id) */}
                          <td className="py-4 px-6 font-mono font-bold text-[#4B352A]">
                            {c.unique_id || c.id.substring(0, 8)}
                          </td>

                          {/* Company Name */}
                          <td className="py-4 px-6 font-semibold text-[#2F241E]">
                            {c.name}
                          </td>

                          {/* Mobile */}
                          <td className="py-4 px-6 text-[#5B4A3F]">
                            {c.mobile ? (
                              <span className="flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-[#8A7B70]" />
                                <span>{c.mobile}</span>
                              </span>
                            ) : (
                              <span className="text-[#A09388] italic">N/A</span>
                            )}
                          </td>

                          {/* Total Categories (from discounts table) */}
                          <td className="py-4 px-6 font-bold text-[#2F241E]">
                            <span className="inline-flex items-center space-x-1 bg-[#F8F4EE] px-2.5 py-1 rounded-lg border border-[#DDD3C6]">
                              <Tags className="w-3.5 h-3.5 text-[#A67C52]" />
                              <span>{c.total_categories || 0}</span>
                            </span>
                          </td>

                          {/* Total Products (where company.id == products.company_id) */}
                          <td className="py-4 px-6 font-bold text-[#2F241E]">
                            <span className="inline-flex items-center space-x-1 bg-[#F8F4EE] px-2.5 py-1 rounded-lg border border-[#DDD3C6]">
                              <Package className="w-3.5 h-3.5 text-[#A67C52]" />
                              <span>{c.total_products || 0}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                c.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : c.status === 'Inactive'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {c.status || 'Active'}
                            </span>
                          </td>

                          {/* Edit button */}
                          <td className="py-4 px-6 text-right">
                            <Link
                              href={`/admin/editcompany?id=${c.id}`}
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
