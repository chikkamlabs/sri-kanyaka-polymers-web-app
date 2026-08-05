'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCategories, createCategory } from '@/lib/categoriesStore';
import { CategoryStatus } from '@/lib/types';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Tags,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Hash,
  Lock,
  Activity
} from 'lucide-react';

export default function AddCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form Fields - All fields in categories table
  const [uniqueId, setUniqueId] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CategoryStatus>('Active');

  // Auto-generate suggested unique_id: CAT-101 + categories.length
  useEffect(() => {
    let mounted = true;

    async function initializePage() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace('/login');
        return;
      }

      try {
        const categoriesList = await getCategories();
        if (mounted) {
          const suggestedNum = 101 + categoriesList.length;
          setUniqueId(`CAT-${suggestedNum}`);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setUniqueId('CAT-101');
          setLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!uniqueId.trim()) {
      setErrorMessage('Category ID is required.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Category Name is required.');
      return;
    }

    setSaving(true);

    try {
      await createCategory({
        unique_id: uniqueId.trim(),
        name: name.trim(),
        status: status,
      });

      router.push('/admin/categories/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create category in Supabase.');
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
          activeItem="Categories"
          onSelect={(item: string) => {
            if (item === 'Categories') router.push('/admin/categories/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/admin/categories/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Categories Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <Tags className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Add New Category
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Register a new product category into Sri Kanyaka Polymers ERP
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

          {/* Add Category Form */}
          <form onSubmit={handleSubmit} className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unique ID */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Category ID *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={uniqueId}
                    onChange={(e) => setUniqueId(e.target.value)}
                    placeholder="e.g. CAT-101"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
                <p className="text-[11px] text-[#8A7B70] mt-1">
                  Suggested automatically as CAT-101+count. You can edit if needed.
                </p>
              </div>

              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Category Name *
                </label>
                <div className="relative">
                  <Tags className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. PVC Pipes &amp; Fittings"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Status *
                </label>
                <div className="relative max-w-xs">
                  <Activity className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CategoryStatus)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#EEE7DD] flex items-center justify-end space-x-3">
              <Link
                href="/admin/categories/dashboard"
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
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-200" />
                    <span>Save Category</span>
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
