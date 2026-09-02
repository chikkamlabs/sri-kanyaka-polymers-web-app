'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getCustomerTransactions,
  createCustomerTransaction,
  updateCustomerTransaction,
  deleteCustomerTransaction,
  getCustomersWithTotalBills,
  CustomerWithTotalBills,
} from '@/lib/customersStore';
import { CustomerTransaction, CustomerTransactionCalculation } from '@/lib/types';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Receipt,
  ArrowLeft,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

function CustomerTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerWithTotalBills[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CustomerTransaction | null>(null);
  const [modalCustomerId, setModalCustomerId] = useState('');
  const [modalCalculation, setModalCalculation] = useState<CustomerTransactionCalculation>('sum');
  const [modalAmount, setModalAmount] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch data
  const loadData = useCallback(async (custFilterId?: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [txList, custList] = await Promise.all([
        getCustomerTransactions(custFilterId || undefined),
        getCustomersWithTotalBills(),
      ]);

      setTransactions(txList);
      setCustomers(custList);
    } catch (err: any) {
      console.error('Error loading customer transactions:', err);
      setErrorMessage(err.message || 'Failed to load transactions.');
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
      await loadData(selectedCustomerId);
    }

    checkAuthAndLoad();
  }, [router, loadData, selectedCustomerId]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setModalCustomerId(selectedCustomerId || (customers[0]?.id || ''));
    setModalCalculation('sum');
    setModalAmount('');
    setModalNotes('');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (tx: CustomerTransaction) => {
    setEditingTransaction(tx);
    setModalCustomerId(tx.customer_id);
    setModalCalculation(tx.calculation);
    setModalAmount(String(tx.amount));
    setModalNotes(tx.notes || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setModalError(null);
  };

  // Save (Create or Update)
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalCustomerId) {
      setModalError('Please select a customer.');
      return;
    }

    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Please enter a valid positive transaction amount.');
      return;
    }

    try {
      setModalSubmitting(true);

      if (editingTransaction) {
        // Update
        await updateCustomerTransaction(editingTransaction.id, {
          customer_id: modalCustomerId,
          calculation: modalCalculation,
          amount: amt,
          notes: modalNotes.trim() || null,
        });
        setSuccessMessage('Transaction successfully updated.');
      } else {
        // Create
        await createCustomerTransaction({
          customer_id: modalCustomerId,
          calculation: modalCalculation,
          amount: amt,
          notes: modalNotes.trim() || null,
        });
        setSuccessMessage('New customer transaction recorded.');
      }

      handleCloseModal();
      await loadData(selectedCustomerId);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      setModalError(err.message || 'Failed to save transaction.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this transaction record?');
    if (!confirmed) return;

    try {
      await deleteCustomerTransaction(id);
      setSuccessMessage('Transaction record deleted.');
      await loadData(selectedCustomerId);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      setErrorMessage(err.message || 'Failed to delete transaction.');
    }
  };

  // Filtered transactions by search query
  const filteredTransactions = transactions.filter((tx) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const custName = tx.customer?.name?.toLowerCase() || '';
    const custMobile = tx.customer?.mobile?.toLowerCase() || '';
    const notes = tx.notes?.toLowerCase() || '';
    const calc = tx.calculation.toLowerCase();

    return (
      custName.includes(q) ||
      custMobile.includes(q) ||
      notes.includes(q) ||
      calc.includes(q) ||
      String(tx.amount).includes(q)
    );
  });

  // Metric computations
  const totalSumAmount = transactions
    .filter((t) => t.calculation === 'sum')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalSubtractAmount = transactions
    .filter((t) => t.calculation === 'subtract')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

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
          {/* Back Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/customers/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customers Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-amber-200" />
              <span>New Transaction</span>
            </button>
          </div>

          {/* Header Card */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E] flex items-center gap-3">
                  <span>Customer Transactions</span>
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5">
                  View and manage customer billing records (sum) and payments / deductions (subtract)
                </p>
              </div>
            </div>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] p-4 rounded-xl shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F8F4EE] border border-[#DDD3C6] flex items-center justify-center text-[#4B352A]">
                <Receipt className="w-5 h-5 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Transactions
                </span>
                <span className="text-xl font-extrabold text-[#2F241E]">
                  {transactions.length}
                </span>
              </div>
            </div>

            <div className="bg-[#FFFCF8] border border-[#DDD3C6] p-4 rounded-xl shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Sum (Bills / Additions)
                </span>
                <span className="text-xl font-extrabold text-emerald-800">
                  ₹{totalSumAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-[#FFFCF8] border border-[#DDD3C6] p-4 rounded-xl shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Subtractions (Payments)
                </span>
                <span className="text-xl font-extrabold text-amber-900">
                  ₹{totalSubtractAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* Search Box */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by customer, notes, amount, or calculation type..."
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

          {/* Transactions Table or Empty State */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
                <p className="text-xs font-semibold text-[#2F241E]">Loading Transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F8F4EE] border border-[#DDD3C6] flex items-center justify-center mx-auto text-[#8A7B70]">
                  <Receipt className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#2F241E]">No Transactions Found</h3>
                  <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                    {searchQuery
                      ? `No transactions match your search filter "${searchQuery}".`
                      : selectedCustomerId
                      ? 'No transactions found for the selected customer.'
                      : 'No customer transactions recorded yet in the system.'}
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#4B352A] text-white text-xs font-bold rounded-xl hover:bg-[#32231B] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-200" />
                    <span>Add New Transaction</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Customer</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Type / Calculation</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-right">Amount</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Notes / Ref</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Date &amp; Time</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F8F4EE] transition-colors">
                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#2F241E] text-xs">
                            {tx.customer?.name || 'Unknown Customer'}
                          </div>
                          {tx.customer?.mobile && (
                            <div className="text-[10px] text-[#8A7B70] font-mono">
                              {tx.customer.mobile}
                            </div>
                          )}
                        </td>

                        {/* Calculation Type */}
                        <td className="py-3.5 px-4">
                          {tx.calculation === 'sum' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              <span>Sum (Bill / Add)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              <ArrowDownLeft className="w-3 h-3 text-amber-600" />
                              <span>Subtract (Payment)</span>
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-black font-mono text-xs ${
                              tx.calculation === 'sum' ? 'text-emerald-800' : 'text-amber-900'
                            }`}
                          >
                            {tx.calculation === 'sum' ? '+' : '-'} ₹{Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-[#5B4A3F] max-w-[200px]">
                          {tx.notes ? (
                            <span className="truncate block" title={tx.notes}>
                              {tx.notes}
                            </span>
                          ) : (
                            <span className="text-[#A09388]">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[11px] text-[#8A7B70] whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>

                        {/* Actions (Edit & Delete) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(tx)}
                              title="Edit Transaction"
                              className="p-1.5 text-[#4B352A] hover:bg-[#F2ECE2] rounded-lg transition-colors border border-[#DDD3C6]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              title="Delete Transaction"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add / Edit Transaction Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-[#EEE7DD] pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2F241E]">
                      {editingTransaction ? 'Edit Customer Transaction' : 'New Customer Transaction'}
                    </h3>
                    <p className="text-xs text-[#8A7B70] mt-0.5">
                      {editingTransaction ? 'Modify calculation, amount, or notes' : 'Record a new customer bill or payment transaction'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1 rounded-lg text-[#8A7B70] hover:text-[#2F241E] hover:bg-[#F8F4EE]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveModal} className="space-y-4">
                  {/* Select Customer */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                      Customer *
                    </label>
                    <select
                      required
                      value={modalCustomerId}
                      onChange={(e) => setModalCustomerId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-medium text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    >
                      <option value="" disabled>Select a customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.mobile ? `(${c.mobile})` : ''} - {c.location || 'No location'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Calculation Type ('sum' | 'subtract') */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                      Calculation Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalCalculation('sum')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                          modalCalculation === 'sum'
                            ? 'bg-[#4B352A] text-white border-[#4B352A] shadow-xs'
                            : 'bg-[#F8F4EE] text-[#5B4A3F] border-[#DDD3C6] hover:bg-[#F2ECE2]'
                        }`}
                      >
                        <span>+ Sum (Bill / Add)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalCalculation('subtract')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                          modalCalculation === 'subtract'
                            ? 'bg-[#4B352A] text-white border-[#4B352A] shadow-xs'
                            : 'bg-[#F8F4EE] text-[#5B4A3F] border-[#DDD3C6] hover:bg-[#F2ECE2]'
                        }`}
                      >
                        <span>- Subtract (Payment)</span>
                      </button>
                    </div>
                  </div>

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
                        value={modalAmount}
                        onChange={(e) => setModalAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B352A] uppercase tracking-wider mb-1.5">
                      Transaction Notes / Bill Reference
                    </label>
                    <textarea
                      rows={2}
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Optional bill number, payment mode, or reason..."
                      className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#EEE7DD]">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] rounded-xl border border-[#DDD3C6]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalSubmitting}
                      className="px-5 py-2 bg-[#4B352A] hover:bg-[#32231B] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {modalSubmitting ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />
                          <span>{editingTransaction ? 'Save Changes' : 'Save Transaction'}</span>
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

export default function CustomerTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">Loading Customer Transactions...</p>
          </div>
        </div>
      }
    >
      <CustomerTransactionsContent />
    </Suspense>
  );
}
