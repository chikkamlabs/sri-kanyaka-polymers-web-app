'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { createCustomer } from '@/lib/customersStore';
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
  User
} from 'lucide-react';

export default function AddCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form Fields for customers table:
  // name (required), mobile, points, credit, location, address, notes
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [points, setPoints] = useState<number | string>(0);
  const [credit, setCredit] = useState<number | string>(0);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace('/login');
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    try {
      setSubmitting(true);

      await createCustomer({
        name: name.trim(),
        mobile: mobile.trim() || null,
        points: Number(points) || 0,
        credit: Number(credit) || 0,
        location: location.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      router.push('/admin/customers/dashboard');
    } catch (err: any) {
      console.error('Error creating customer:', err);
      setErrorMessage(err.message || 'Failed to create customer record in Supabase.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Initializing Customer Form...</p>
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
          <div>
            <Link
              href="/admin/customers/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customers Dashboard</span>
            </Link>
          </div>

          {/* Title Header Card */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-[#A67C52]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#2F241E]">
                Add New Customer
              </h1>
              <p className="text-xs text-[#8A7B70] mt-0.5">
                Register a new customer with contact information, loyalty points, and credit limits
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Creation Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-xs font-black text-[#2F241E] uppercase tracking-wider border-b border-[#EEE7DD] pb-3">
                Customer Details (All Table Fields)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer Name (Required) */}
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
                      placeholder="e.g. Ramesh Kumar"
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
                      placeholder="e.g. +91 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Points */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Initial Loyalty Points
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] font-medium focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>
                </div>

                {/* Credit */}
                <div>
                  <label className="block text-xs font-bold text-[#4B352A] uppercase tracking-wider mb-2">
                    Initial Credit Balance (₹)
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={credit}
                      onChange={(e) => setCredit(e.target.value)}
                      placeholder="0.00"
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
                      placeholder="e.g. Tenali, Guntur District"
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
                      placeholder="e.g. D.No 12-34, Main Bazaar, Market Street"
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
                    placeholder="Optional notes, preferences, customer category, or references..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex items-center justify-end space-x-3">
              <Link
                href="/admin/customers/dashboard"
                className="px-5 py-2.5 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Customer...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-200" />
                    <span>Create Customer</span>
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
