'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { createDistributor, getNextDistributorCode } from '@/lib/distributorsStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Truck,
  ArrowLeft,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Hash,
  Lock,
  User
} from 'lucide-react';

export default function AddDistributorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form Fields - All fields in distributors table
  const [distributorCode, setDistributorCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-generate distributor_code (e.g., distri-101, distri-102, etc.)
  useEffect(() => {
    let mounted = true;

    async function initializePage() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace('/login');
        return;
      }

      try {
        const nextCode = await getNextDistributorCode();
        if (mounted) {
          setDistributorCode(nextCode);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setDistributorCode('distri-101');
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

    if (!distributorCode.trim()) {
      setErrorMessage('Distributor ID is required.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Distributor Name is required.');
      return;
    }

    setSaving(true);

    try {
      await createDistributor({
        distributor_code: distributorCode.trim(),
        name: name.trim(),
        location: location.trim() || null,
        notes: notes.trim() || null,
      });

      router.push('/admin/distributors/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create distributor in Supabase.');
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
          activeItem="Distributors"
          onSelect={(item: string) => {
            if (item === 'Distributors') router.push('/admin/distributors/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link
              href="/admin/distributors/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Distributors Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Add New Distributor
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Register a new distributor into the ERP database
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

          {/* Add Distributor Form */}
          <form onSubmit={handleSubmit} className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-5">
              {/* Field 1: Distributor ID (auto-filled) */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Distributor ID (Auto-Generated) *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={distributorCode}
                    onChange={(e) => setDistributorCode(e.target.value)}
                    placeholder="e.g. distri-101"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Field 2: Name */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Distributor Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Chemical &amp; Polymer Distributors"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Field 3: Location */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Field 4: Notes */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Notes
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional distributor information, terms, or contact notes..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#EEE7DD] flex items-center justify-end space-x-3">
              <Link
                href="/admin/distributors/dashboard"
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
                    <span>Save Distributor</span>
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
