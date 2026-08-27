'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  CustomerWithTotalBills,
} from '@/lib/customersStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  Coins,
  CreditCard,
  MapPin,
  FileText,
  Building,
  User,
  Trash2,
  History,
  Receipt,
  Clock
} from 'lucide-react';

function OpenCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [originalCustomer, setOriginalCustomer] = useState<CustomerWithTotalBills | null>(null);

  // Editable Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [points, setPoints] = useState<number | string>(0);
  const [credit, setCredit] = useState<number | string>(0);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCustomer() {
      if (!customerId) {
        setErrorMessage('No Customer ID provided in URL parameter.');
        setLoading(false);
        return;
      }

      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const data = await getCustomerById(customerId);
        if (!data) {
          if (mounted) {
            setErrorMessage(`Customer with ID "${customerId}" was not found.`);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setOriginalCustomer(data);
          setName(data.name || '');
          setMobile(data.mobile || '');
          setPoints(data.points !== undefined ? data.points : 0);
          setCredit(data.credit !== undefined ? data.credit : 0);
          setLocation(data.location || '');
          setAddress(data.address || '');
          setNotes(data.notes || '');
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to load customer details.');
          setLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      mounted = false;
    };
  }, [customerId, router]);

  // Update Customer Form Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalCustomer) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    try {
      setSaving(true);

      const updated = await updateCustomer(originalCustomer.id, {
        name: name.trim(),
        mobile: mobile.trim() || null,
        points: Number(points) || 0,
        credit: Number(credit) || 0,
        location: location.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      setOriginalCustomer((prev) => (prev ? { ...prev, ...updated } : null));
      setSuccessMessage('Customer details updated successfully.');
      setSaving(false);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      console.error('Error updating customer:', err);
      setErrorMessage(err.message || 'Failed to update customer.');
      setSaving(false);
    }
  };

  // Delete Customer Handler
  const handleDelete = async () => {
    if (!originalCustomer) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete customer "${originalCustomer.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteCustomer(originalCustomer.id);
      router.push('/admin/customers/dashboard');
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      setErrorMessage(err.message || 'Failed to delete customer.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Loading Customer Record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#5B4A3F] flex flex-col font-sans">
      <AdminHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 relative">
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Backdrop"
            className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        <AdminSidebar
          isSidebarOpen={isSidebarOpen}
          activeItem="Customers"
          onSelect={(item: string) => {
            if (item === 'Customers') router.push('/admin/customers/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Back Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/customers/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customers Dashboard</span>
            </Link>

            {originalCustomer && (
              <Link
                href={`/admin/customertransactions?customerId=${originalCustomer.id}`}
                className="inline-flex items-center space-x-2 text-xs font-bold text-[#4B352A] hover:text-[#2F241E] transition-colors bg-[#F2ECE2] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
              >
                <History className="w-4 h-4 text-[#A67C52]" />
                <span>View Transactions</span>
              </Link>
            )}
          </div>

          {/* Customer Overview Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E]">
                  Edit Customer: <span className="text-[#4B352A]">{originalCustomer?.name}</span>
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5 font-mono">
                  ID: {originalCustomer?.id}
                </p>
              </div>
            </div>

            {/* Total Bills Badge */}
            {originalCustomer && (
              <div className="flex items-center space-x-3 bg-[#F8F4EE] border border-[#DDD3C6] px-4 py-2 rounded-xl shrink-0">
                <Receipt className="w-4 h-4 text-[#A67C52]" />
                <div>
                  <span className="text-[10px] font-bold text-[#8A7B70] uppercase block">Total Billed</span>
                  <span className="text-sm font-black text-emerald-800">
                    ₹{originalCustomer.total_bills.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Edit Form */}
          {originalCustomer && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="text-xs font-black text-[#2F241E] uppercase tracking-wider border-b border-[#EEE7DD] pb-3">
                  Customer Profile &amp; Balances (All Fields)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Customer Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Loyalty Points
                    </label>
                    <div className="relative">
                      <Coins className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Credit */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Credit Balance (₹)
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={credit}
                        onChange={(e) => setCredit(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Location / Area
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                      Full Postal Address
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Customer Notes
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-[#8A7B70]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Created: {new Date(originalCustomer.created_at).toLocaleString()}</span>
                  </span>
                  {originalCustomer.updated_at && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last Updated: {new Date(originalCustomer.updated_at).toLocaleString()}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? 'Deleting...' : 'Delete Customer'}</span>
                </button>

                <div className="flex items-center space-x-3">
                  <Link
                    href="/admin/customers/dashboard"
                    className="px-5 py-2.5 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={saving || deleting}
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
                        <span>Update Customer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

export default function OpenCustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">Loading Customer...</p>
          </div>
        </div>
      }
    >
      <OpenCustomerContent />
    </Suspense>
  );
}
