'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getCustomersWithTotalBills,
  createCustomerTransaction,
  updateCustomer,
  CustomerWithTotalBills,
} from '@/lib/customersStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  UserCheck,
  Plus,
  Search,
  ExternalLink,
  PlusCircle,
  Coins,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  History,
  Phone
} from 'lucide-react';

export default function CustomersDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithTotalBills[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Quick Add Transaction Modal State
  const [selectedCustomerForTrans, setSelectedCustomerForTrans] = useState<CustomerWithTotalBills | null>(null);
  const [transAmount, setTransAmount] = useState<string>('');
  const [transNotes, setTransNotes] = useState<string>('');
  const [submittingTrans, setSubmittingTrans] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);

  // Fetch Customers
  const loadCustomers = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getCustomersWithTotalBills(query);
      setCustomers(data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setErrorMessage(err.message || 'Failed to load customers from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkAuthAndLoad() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace('/login');
        return;
      }
      await loadCustomers(searchQuery);
    }

    checkAuthAndLoad();
  }, [router, loadCustomers, searchQuery]);

  // Handle Search Input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Open Add Transaction Modal for a customer
  const handleOpenAddTrans = (customer: CustomerWithTotalBills) => {
    setSelectedCustomerForTrans(customer);
    setTransAmount('');
    setTransNotes('');
    setTransError(null);
  };

  const handleCloseAddTrans = () => {
    setSelectedCustomerForTrans(null);
    setTransAmount('');
    setTransNotes('');
    setTransError(null);
  };

  // Submit Add Transaction (only amount & notes, adds points: customers.points + (1*amount/100))
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForTrans) return;

    const amountNum = parseFloat(transAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTransError('Please enter a valid positive amount.');
      return;
    }

    try {
      setSubmittingTrans(true);
      setTransError(null);

      // 1. Create the transaction record
      await createCustomerTransaction({
        customer_id: selectedCustomerForTrans.id,
        calculation: 'sum',
        amount: amountNum,
        notes: transNotes.trim() || null,
      });

      // 2. Add points: customers.points = customers.points + (1 * amount / 100)
      const currentPoints = Number(selectedCustomerForTrans.points || 0);
      const pointsToAdd = (1 * amountNum) / 100;
      const updatedPoints = currentPoints + pointsToAdd;

      await updateCustomer(selectedCustomerForTrans.id, {
        points: updatedPoints,
      });

      setSuccessMessage(
        `Added ₹${amountNum.toLocaleString()} transaction for ${selectedCustomerForTrans.name}. Added +${pointsToAdd} loyalty points (Total: ${updatedPoints}).`
      );
      handleCloseAddTrans();
      // Reload customers to reflect points and transaction
      await loadCustomers(searchQuery);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      setTransError(err.message || 'Failed to record transaction.');
    } finally {
      setSubmittingTrans(false);
    }
  };

  // Calculate totals
  const totalCustomersCount = customers.length;

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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Header Banner */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <UserCheck className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E] flex items-center gap-3">
                  <span>Customers Dashboard</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F2ECE2] text-[#4B352A] border border-[#DDD3C6] font-bold">
                    Total: {totalCustomersCount}
                  </span>
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5">
                  Manage retail customers, track loyalty points, and transaction records
                </p>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/addcustomer"
                className="px-4 py-2.5 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-amber-200" />
                <span>Add Customer</span>
              </Link>
            </div>
          </div>

          {/* Metric Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] p-4 rounded-xl shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F8F4EE] border border-[#DDD3C6] flex items-center justify-center text-[#4B352A]">
                <UserCheck className="w-5 h-5 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Customers
                </span>
                <span className="text-xl font-extrabold text-[#2F241E]">
                  {totalCustomersCount}
                </span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search customers by name or mobile number..."
                className="w-full pl-10 pr-4 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-2 text-xs font-bold text-[#8A7B70] hover:text-[#2F241E] bg-[#F2ECE2] rounded-xl border border-[#DDD3C6]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Customers Table or Empty State */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
                <p className="text-xs font-semibold text-[#2F241E]">Loading Customers Data...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F8F4EE] border border-[#DDD3C6] flex items-center justify-center mx-auto text-[#8A7B70]">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#2F241E]">No Customers Found</h3>
                  <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                    {searchQuery
                      ? `No customers matched your search query "${searchQuery}".`
                      : 'No customer records have been created yet.'}
                  </p>
                </div>
                <div>
                  <Link
                    href="/admin/addcustomer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#4B352A] text-white text-xs font-bold rounded-xl hover:bg-[#32231B] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-200" />
                    <span>Add New Customer</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Name &amp; Mobile</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Location</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-right">Points</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Notes</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F8F4EE] transition-colors">
                        {/* Name & Mobile */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#2F241E] text-xs flex items-center gap-1.5">
                            <span>{c.name}</span>
                          </div>
                          {c.mobile ? (
                            <div className="text-[11px] text-[#8A7B70] flex items-center space-x-1 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-[#A67C52]" />
                              <span>{c.mobile}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#A09388] italic">No phone</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-[#5B4A3F]">
                          {c.location ? (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-[#A67C52] shrink-0" />
                              <span className="truncate max-w-[150px]" title={c.location}>{c.location}</span>
                            </div>
                          ) : (
                            <span className="text-[#A09388]">—</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F2ECE2] text-[#4B352A] font-bold text-xs border border-[#DDD3C6]">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            {Number(c.points || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-[#5B4A3F] max-w-[180px]">
                          {c.notes ? (
                            <span className="truncate block text-[11px]" title={c.notes}>
                              {c.notes}
                            </span>
                          ) : (
                            <span className="text-[#A09388]">—</span>
                          )}
                        </td>

                        {/* Actions (Add Trans, Transactions, Open) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Add Trans Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAddTrans(c)}
                              title="Add Customer Transaction"
                              className="px-2.5 py-1 bg-[#4B352A] hover:bg-[#32231B] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1 shadow-xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-amber-200" />
                              <span>Add Trans</span>
                            </button>

                            {/* Transactions Button */}
                            <Link
                              href={`/admin/customertransactions?customerId=${c.id}`}
                              title="View Customer Transactions"
                              className="px-2.5 py-1 bg-[#F2ECE2] hover:bg-[#E8DFD3] text-[#4B352A] border border-[#DDD3C6] text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1"
                            >
                              <History className="w-3.5 h-3.5 text-[#A67C52]" />
                              <span>Transactions</span>
                            </Link>

                            {/* Open Button */}
                            <Link
                              href={`/admin/opencustomer?id=${c.id}`}
                              title="Edit Customer"
                              className="px-2.5 py-1 bg-[#FFFCF8] hover:bg-[#F8F4EE] text-[#5B4A3F] border border-[#DDD3C6] text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#A67C52]" />
                              <span>Open</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Add Transaction Modal (Only Amount & Notes, calculates points) */}
          {selectedCustomerForTrans && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-[#EEE7DD] pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2F241E] flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-[#A67C52]" />
                      <span>Add Customer Transaction</span>
                    </h3>
                    <p className="text-xs text-[#8A7B70] mt-0.5">
                      For <span className="font-bold text-[#4B352A]">{selectedCustomerForTrans.name}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseAddTrans}
                    className="p-1 rounded-lg text-[#8A7B70] hover:text-[#2F241E] hover:bg-[#F8F4EE]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {transError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{transError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveTransaction} className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                      Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#8A7B70]">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={transAmount}
                        onChange={(e) => setTransAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                    {parseFloat(transAmount) > 0 && (
                      <p className="text-[11px] text-amber-800 mt-1 flex items-center gap-1 font-medium">
                        <Coins className="w-3 h-3 text-amber-600" />
                        <span>Loyalty Points to earn: <strong>+{(1 * parseFloat(transAmount) / 100).toFixed(2)}</strong></span>
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={transNotes}
                      onChange={(e) => setTransNotes(e.target.value)}
                      placeholder="Optional bill reference or notes..."
                      className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#EEE7DD]">
                    <button
                      type="button"
                      onClick={handleCloseAddTrans}
                      className="px-4 py-2 text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] rounded-xl border border-[#DDD3C6]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingTrans}
                      className="px-5 py-2 bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {submittingTrans ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />
                          <span>Done</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
