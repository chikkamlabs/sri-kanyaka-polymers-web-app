'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCategories, CategoryWithCounts } from '@/lib/categoriesStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Tags,
  Plus,
  Search,
  Edit3,
  Lock,
  Package,
  Building2,
  Inbox,
  Layers
} from 'lucide-react';

export default function CategoriesDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithCounts[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCategoriesData() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const data = await getCategories();
        if (mounted) {
          setCategories(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setFetchError(err.message || 'Failed to fetch categories from Supabase.');
          setLoading(false);
        }
      }
    }

    loadCategoriesData();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Derived Values
  const totalCategoriesCount = categories.length;

  // Filtered List based on Search Query (Name, ID)
  const filteredCategories = categories.filter((cat) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      (cat.name && cat.name.toLowerCase().includes(query)) ||
      (cat.unique_id && cat.unique_id.toLowerCase().includes(query)) ||
      (cat.id && cat.id.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Categories Data...
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
          activeItem="Categories"
          onSelect={(item: string) => {
            if (item === 'Categories') {
              router.push('/admin/categories/dashboard');
            } else if (item === 'Companies') {
              router.push('/admin/companies/dashboard');
            } else if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Left Stats Bar: Total Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Tags className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Categories
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalCategoriesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Add Category Button & Search Bar */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Add Category Button */}
            <div>
              <Link
                href="/admin/addcategory"
                className="w-full py-3 px-6 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 border border-[#32231B]"
              >
                <Plus className="w-5 h-5 text-amber-200" />
                <span>Add Category</span>
              </Link>
            </div>

            {/* Search Bar Row (Name, ID) */}
            <div className="pt-2 border-t border-[#EEE7DD]">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search category by Name or ID..."
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

          {/* All Categories List Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] flex items-center justify-between bg-[#F8F4EE]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  All Categories List ({filteredCategories.length})
                </h2>
              </div>
            </div>

            {/* Empty State Section if categories list is empty */}
            {filteredCategories.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">
                  No Categories Found
                </h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery
                    ? 'No category records match your current search query.'
                    : 'There are currently no categories registered in the database. Click "Add Category" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-6">ID</th>
                      <th className="py-3.5 px-6">Category Name</th>
                      <th className="py-3.5 px-6">Total Products</th>
                      <th className="py-3.5 px-6">Total Companies</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredCategories.map((cat) => {
                      return (
                        <tr
                          key={cat.id}
                          className="hover:bg-[#F8F4EE] transition-colors"
                        >
                          {/* ID (unique_id) */}
                          <td className="py-4 px-6 font-mono font-bold text-[#4B352A]">
                            {cat.unique_id || cat.id.substring(0, 8)}
                          </td>

                          {/* Category Name */}
                          <td className="py-4 px-6 font-semibold text-[#2F241E]">
                            {cat.name}
                          </td>

                          {/* Total Products (where products.category_id == category.id) */}
                          <td className="py-4 px-6 font-bold text-[#2F241E]">
                            <span className="inline-flex items-center space-x-1 bg-[#F8F4EE] px-2.5 py-1 rounded-lg border border-[#DDD3C6]">
                              <Package className="w-3.5 h-3.5 text-[#A67C52]" />
                              <span>{cat.total_products || 0}</span>
                            </span>
                          </td>

                          {/* Total Companies (where category.id == discounts.category_id) */}
                          <td className="py-4 px-6 font-bold text-[#2F241E]">
                            <span className="inline-flex items-center space-x-1 bg-[#F8F4EE] px-2.5 py-1 rounded-lg border border-[#DDD3C6]">
                              <Building2 className="w-3.5 h-3.5 text-[#A67C52]" />
                              <span>{cat.total_companies || 0}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                cat.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {cat.status || 'Active'}
                            </span>
                          </td>

                          {/* Edit button */}
                          <td className="py-4 px-6 text-right">
                            <Link
                              href={`/admin/editcategory?id=${cat.id}`}
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
