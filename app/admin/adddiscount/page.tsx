'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  createDiscount,
  calculatepp
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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Building2,
  Tags,
  Search,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

export default function AddDiscountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Options for Dropdowns
  const [companies, setCompanies] = useState<DropdownOption[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);

  // Search queries inside dropdown filter fields
  const [companySearch, setCompanySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Form Fields - All fields in discounts table
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [d1, setD1] = useState<number | ''>(0);
  const [d2, setD2] = useState<number | ''>(0);
  const [d3, setD3] = useState<number | ''>(0);
  const [d4, setD4] = useState<number | ''>(0);

  useEffect(() => {
    let mounted = true;

    async function initializePage() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace('/login');
        return;
      }

      try {
        const [compList, catList] = await Promise.all([
          getCompanyOptions(),
          getCategoryOptions(),
        ]);

        if (mounted) {
          setCompanies(compList);
          setCategories(catList);

          // Default select first items if available
          if (compList.length > 0) setCompanyId(compList[0].id);
          if (catList.length > 0) setCategoryId(catList[0].id);

          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage('Failed to initialize form options.');
          setLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredCompanies = companies.filter((c) => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.unique_id && c.unique_id.toLowerCase().includes(q))
    );
  });

  const filteredCategories = categories.filter((c) => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.unique_id && c.unique_id.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyId) {
      setErrorMessage('Please select a Company.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Please select a Category.');
      return;
    }

    const valD1 = Number(d1 === '' ? 0 : d1);
    const valD2 = Number(d2 === '' ? 0 : d2);
    const valD3 = Number(d3 === '' ? 0 : d3);
    const valD4 = Number(d4 === '' ? 0 : d4);

    setSaving(true);

    try {
      // 1. Create discount record in discounts table
      await createDiscount({
        company_id: companyId,
        category_id: categoryId,
        d1: valD1,
        d2: valD2,
        d3: valD3,
        d4: valD4,
      });

      // 2. Call calculatepp to recalculate purchase price for all products in this company & category
      await calculatepp(companyId, categoryId, valD1, valD2, valD3, valD4);

      router.push('/admin/discounts/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create discount rule in Supabase.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Verifying Admin Access...</p>
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
            if (item === 'Discounts') router.push('/admin/discounts/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/admin/discounts/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Discounts Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <Percent className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Add New Discount Rule
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Set discount percentages (d1, d2, d3, d4) for a specific Company & Category combination
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Creation Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Add Discount Form */}
          <form onSubmit={handleSubmit} className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Discount Calculation Explanation Alert Box */}
            <div className="p-4 rounded-xl bg-[#F8F4EE] border border-[#DDD3C6] flex items-start space-x-3 text-xs text-[#4B352A]">
              <HelpCircle className="w-5 h-5 text-[#A67C52] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-[#2F241E] block">
                  Discount Formula Rules:
                </span>
                <p>
                  • <strong>d1, d2, and d3</strong> will subtract (<span className="text-rose-700 font-bold">-</span>) discount percentages.
                </p>
                <p>
                  • <strong>d4</strong> will add (<span className="text-emerald-700 font-bold">+</span>) discount percentage.
                </p>
                <p>
                  • If no discount applies for a field, simply enter <strong>0</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Selection (Dropdown with Search) */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Company * (UUID FK)
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8A7B70] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search company..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none"
                    />
                  </div>

                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3 pointer-events-none" />
                    <select
                      required
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    >
                      {companies.length === 0 ? (
                        <option value="">-- No Companies Found --</option>
                      ) : filteredCompanies.length === 0 ? (
                        <option value="">-- No matching company --</option>
                      ) : (
                        filteredCompanies.map((comp) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.name} {comp.unique_id ? `(${comp.unique_id})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Selection (Dropdown with Search) */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Category * (UUID FK)
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8A7B70] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search category..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none"
                    />
                  </div>

                  <div className="relative">
                    <Tags className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3 pointer-events-none" />
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    >
                      {categories.length === 0 ? (
                        <option value="">-- No Categories Found --</option>
                      ) : filteredCategories.length === 0 ? (
                        <option value="">-- No matching category --</option>
                      ) : (
                        filteredCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.unique_id ? `(${cat.unique_id})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* d1 */}
              <div>
                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
                  Discount d1 (-%) *
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={d1}
                    onChange={(e) => setD1(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
                <p className="text-[11px] text-rose-700 mt-1 font-medium">Subtracts discount (-)</p>
              </div>

              {/* d2 */}
              <div>
                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
                  Discount d2 (-%) *
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={d2}
                    onChange={(e) => setD2(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
                <p className="text-[11px] text-rose-700 mt-1 font-medium">Subtracts discount (-)</p>
              </div>

              {/* d3 */}
              <div>
                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
                  Discount d3 (-%) *
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={d3}
                    onChange={(e) => setD3(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
                <p className="text-[11px] text-rose-700 mt-1 font-medium">Subtract discount (-)</p>
              </div>

              {/* d4 */}
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  Discount d4 (+%) *
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={d4}
                    onChange={(e) => setD4(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
                <p className="text-[11px] text-emerald-700 mt-1 font-medium">Adds discount (+)</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#EEE7DD] flex items-center justify-end space-x-3">
              <Link
                href="/admin/discounts/dashboard"
                className="px-5 py-2.5 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving & Recalculating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-200" />
                    <span>Save Discount Rule</span>
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
