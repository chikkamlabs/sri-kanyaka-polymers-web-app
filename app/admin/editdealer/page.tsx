'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getDealerById, updateDealer } from '@/lib/dealersStore';
import { Dealer } from '@/lib/types';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Users,
  ArrowLeft,
  Phone,
  Store,
  DollarSign,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Hash,
  Lock,
  Edit3
} from 'lucide-react';

function EditDealerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealerId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dealer, setDealer] = useState<Dealer | null>(null);

  // Form Fields
  const [uniqueId, setUniqueId] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [details, setDetails] = useState('');
  const [currentCredit, setCurrentCredit] = useState('0');
  const [creditLimit, setCreditLimit] = useState('0');
  const [address, setAddress] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDealerData() {
      // Auth verification
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace('/login');
        return;
      }

      if (!dealerId) {
        if (mounted) {
          setErrorMessage('No Dealer ID provided.');
          setLoading(false);
        }
        return;
      }

      try {
        const foundDealer = await getDealerById(dealerId);
        if (!foundDealer) {
          if (mounted) {
            setErrorMessage(`Dealer with ID "${dealerId}" was not found.`);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setDealer(foundDealer);
          setUniqueId(foundDealer.unique_id || '');
          setName(foundDealer.name || '');
          setMobile(foundDealer.mobile || '');
          setShopName(foundDealer.shop_name || '');
          setDetails(foundDealer.details || '');
          setCurrentCredit(String(foundDealer.current_credit ?? 0));
          setCreditLimit(String(foundDealer.credit_limit ?? 0));
          setAddress(foundDealer.address || '');
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to fetch dealer details.');
          setLoading(false);
        }
      }
    }

    loadDealerData();

    return () => {
      mounted = false;
    };
  }, [dealerId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!dealerId) {
      setErrorMessage('Missing Dealer ID.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Dealer Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setErrorMessage('Mobile Number is required.');
      return;
    }
    if (!shopName.trim()) {
      setErrorMessage('Shop Name is required.');
      return;
    }

    setSaving(true);

    try {
      await updateDealer(dealerId, {
        unique_id: uniqueId.trim(),
        name: name.trim(),
        mobile: mobile.trim(),
        shop_name: shopName.trim(),
        details: details.trim() || null,
        current_credit: parseFloat(currentCredit) || 0,
        credit_limit: parseFloat(creditLimit) || 0,
        address: address.trim() || null,
      });

      router.push('/admin/Dealers/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update dealer in Supabase.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Loading Dealer Record...</p>
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
            if (item === 'Dealers') router.push('/admin/Dealers/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/admin/Dealers/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dealers Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <Edit3 className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Edit Dealer Profile
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Update dealer details for {name || 'Dealer Record'} ({uniqueId})
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Edit Form */}
          {dealer && (
            <form onSubmit={handleSubmit} className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Field 1: Unique ID */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Unique Dealer ID
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={uniqueId}
                      onChange={(e) => setUniqueId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Field 2: Dealer Name */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Dealer Name *
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Field 3: Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Field 4: Shop Name */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Shop Name *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Field 5: Current Credit (Locked / Read-only) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider">
                      Current Credit (₹)
                    </label>
                    <span className="text-[11px] font-semibold text-[#8A7B70] flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-[#A67C52]" />
                      <span>Non-editable</span>
                    </span>
                  </div>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      disabled
                      readOnly
                      value={currentCredit}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#EDE6DC] border border-[#DDD3C6] rounded-xl text-sm font-bold text-[#4B352A] cursor-not-allowed opacity-80"
                    />
                  </div>
                  <p className="text-[11px] text-[#8A7B70] mt-1.5">
                    Credit balance is managed through dealer transactions.
                  </p>
                </div>

                {/* Field 6: Credit Limit */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Credit Limit (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>
              </div>

              {/* Field 7: Address */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Field 8: Details / Notes */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                  Details / Notes
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                  <textarea
                    rows={2}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#EEE7DD] flex items-center justify-end space-x-3">
                <Link
                  href="/admin/Dealers/dashboard"
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
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-200" />
                      <span>Update Dealer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

export default function EditDealerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">Loading Form...</p>
          </div>
        </div>
      }
    >
      <EditDealerForm />
    </Suspense>
  );
}
