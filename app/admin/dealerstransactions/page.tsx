'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getDealers,
  getDealerTransactions,
  createDealerTransaction,
  deleteDealerTransaction,
} from '@/lib/dealersStore';
import { Dealer, DealerTransaction, DealerTransactionType } from '@/lib/types';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Users,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  Receipt,
  Layers,
  Calculator,
  Calendar,
  Building2,
  Phone
} from 'lucide-react';

function DealerTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealerId = searchParams.get('dealer_id') || '';

  const [loading, setLoading] = useState(true);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [transactions, setTransactions] = useState<DealerTransaction[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>(initialDealerId);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add Transaction Modal / Popover State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDealerId, setModalDealerId] = useState('');
  const [modalCalc, setModalCalc] = useState<DealerTransactionType>('Credit');
  const [modalAmount, setModalAmount] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch data
  const loadData = useCallback(async (dealerFilterId?: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [dealerList, txList] = await Promise.all([
        getDealers(),
        getDealerTransactions(dealerFilterId || undefined),
      ]);

      setDealers(dealerList);
      setTransactions(txList);
    } catch (err: any) {
      console.error('Error loading dealer transactions:', err);
      setErrorMessage(err.message || 'Failed to load dealer transactions.');
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
      await loadData(selectedDealerId);
    }

    checkAuthAndLoad();
  }, [router, loadData, selectedDealerId]);

  // Selected dealer object
  const selectedDealerObj = dealers.find((d) => d.id === selectedDealerId);

  // Calculated Stats
  const totalTransactionsCount = transactions.length;
  const currentDealerCredit = selectedDealerObj
    ? Number(selectedDealerObj.current_credit || 0)
    : dealers.reduce((sum, d) => sum + Number(d.current_credit || 0), 0);

  // Modal active dealer object for auto-calculating credit_after_transaction
  const activeModalDealer = dealers.find((d) => d.id === modalDealerId) || selectedDealerObj || dealers[0];
  const activeModalCurrentCredit = Number(activeModalDealer?.current_credit || 0);
  const parsedModalAmount = parseFloat(modalAmount) || 0;
  
  // Auto calculate credit_after_transaction: if Credit add, if Debit subtract
  const calculatedCreditAfter = modalCalc === 'Credit'
    ? activeModalCurrentCredit + parsedModalAmount
    : activeModalCurrentCredit - parsedModalAmount;

  // Open Add Transaction Modal
  const handleOpenAddModal = () => {
    const defaultId = selectedDealerId || (dealers[0]?.id || '');
    setModalDealerId(defaultId);
    setModalCalc('Credit');
    setModalAmount('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  // Submit Add Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalDealerId) {
      setModalError('Please select a dealer.');
      return;
    }

    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Please enter a valid positive transaction amount.');
      return;
    }

    try {
      setModalSubmitting(true);

      await createDealerTransaction({
        dealer_id: modalDealerId,
        calc: modalCalc,
        amount: amt,
      });

      setSuccessMessage(
        `Successfully recorded ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${modalCalc} transaction for ${activeModalDealer?.name || 'Dealer'}.`
      );
      handleCloseModal();
      await loadData(selectedDealerId);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving dealer transaction:', err);
      setModalError(err.message || 'Failed to save transaction.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This will reverse the credit balance.')) {
      return;
    }

    try {
      await deleteDealerTransaction(txId);
      setSuccessMessage('Transaction deleted and dealer credit adjusted.');
      await loadData(selectedDealerId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting dealer transaction:', err);
      setErrorMessage(err.message || 'Failed to delete transaction.');
    }
  };

  // Filtered transactions for search
  const filteredTransactions = transactions.filter((tx) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const dealerName = tx.dealer?.name?.toLowerCase() || '';
    const dealerUniqueId = tx.dealer?.unique_id?.toLowerCase() || '';
    const dealerShop = tx.dealer?.shop_name?.toLowerCase() || '';
    const calcType = tx.calc?.toLowerCase() || '';
    const amountStr = String(tx.amount || '');
    return (
      dealerName.includes(q) ||
      dealerUniqueId.includes(q) ||
      dealerShop.includes(q) ||
      calcType.includes(q) ||
      amountStr.includes(q)
    );
  });

  if (loading && dealers.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">Loading Dealer Transactions...</p>
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Back Navigation & Dealer Select */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/admin/Dealers/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6] shadow-2xs self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dealers Dashboard</span>
            </Link>

            {/* Dealer Filter Selector */}
            <div className="flex items-center space-x-2 bg-[#FFFCF8] border border-[#DDD3C6] p-1.5 rounded-xl shadow-2xs">
              <Users className="w-4 h-4 text-[#8A7B70] ml-2 shrink-0" />
              <select
                value={selectedDealerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDealerId(newId);
                  loadData(newId);
                }}
                className="bg-transparent text-xs font-bold text-[#2F241E] pr-3 py-1 focus:outline-none cursor-pointer"
              >
                <option value="">All Dealers ({dealers.length})</option>
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.shop_name ? `• ${d.shop_name}` : ''} ({d.unique_id || 'ID'})
                  </option>
                ))}
              </select>
              {selectedDealerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDealerId('');
                    loadData('');
                  }}
                  className="p-1 text-[#8A7B70] hover:text-[#2F241E]"
                  title="Show All Dealers"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Top Title Banner */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E] flex items-center gap-2 flex-wrap">
                  <span>Dealers Transactions</span>
                  {selectedDealerObj && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F2ECE2] text-[#4B352A] border border-[#DDD3C6] font-bold">
                      {selectedDealerObj.name} ({selectedDealerObj.shop_name})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5">
                  Manage credit &amp; debit ledgers, auto-calculate balances, and track payment history.
                </p>
              </div>
            </div>

            {/* Add Transaction Action Button */}
            <div className="relative group">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-xs transition-all shadow-sm border border-[#32231B]"
                title="Add a new Credit or Debit transaction"
              >
                <Plus className="w-4 h-4 text-amber-200" />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>

          {/* Metric Stats Bar: Total no. transactions & Current_credit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total no. transactions */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#F2ECE2] text-[#4B352A] rounded-xl flex items-center justify-center shrink-0 border border-[#DDD3C6]">
                <Receipt className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total no. Transactions
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalTransactionsCount}
                </span>
              </div>
            </div>

            {/* Current_credit */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#F2ECE2] text-[#4B352A] rounded-xl flex items-center justify-center shrink-0 border border-[#DDD3C6]">
                <IndianRupee className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  {selectedDealerObj ? `${selectedDealerObj.name}'s Current Credit` : 'Total Current Credit'}
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  ₹{currentDealerCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {selectedDealerObj && (
                  <span className="text-[11px] text-[#8A7B70] block font-medium">
                    Limit: ₹{Number(selectedDealerObj.credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search / Filter Row */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by Dealer Name, Shop, ID, or amount..."
                className="w-full pl-10 pr-4 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
              />
            </div>
          </div>

          {/* Transactions Table: Display all things in dealers_transactions (except id, dealer_id) */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] bg-[#F8F4EE] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  Transactions Ledger ({filteredTransactions.length})
                </h2>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">No Transactions Found</h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery
                    ? 'No transaction records match your search criteria.'
                    : 'No dealer transactions have been recorded yet. Click "Add Transaction" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      {!selectedDealerId && <th className="py-3.5 px-5">Dealer</th>}
                      <th className="py-3.5 px-5">Type (Calc)</th>
                      <th className="py-3.5 px-5">Amount (₹)</th>
                      <th className="py-3.5 px-5">Credit After Transaction (₹)</th>
                      <th className="py-3.5 px-5">Date &amp; Time</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredTransactions.map((tx) => {
                      const isCredit = tx.calc === 'Credit';
                      const formattedDate = tx.created_at
                        ? new Date(tx.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A';

                      return (
                        <tr key={tx.id} className="hover:bg-[#F8F4EE] transition-colors">
                          {/* Dealer Name & Shop (if not filtered) */}
                          {!selectedDealerId && (
                            <td className="py-3.5 px-5">
                              <span className="font-bold text-[#2F241E] block">
                                {tx.dealer?.name || 'Unknown Dealer'}
                              </span>
                              <span className="text-[#8A7B70] text-[11px] block">
                                {tx.dealer?.shop_name} {tx.dealer?.unique_id ? `• ${tx.dealer.unique_id}` : ''}
                              </span>
                            </td>
                          )}

                          {/* Calc (Type: Credit / Debit) */}
                          <td className="py-3.5 px-5">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                isCredit
                                  ? 'bg-amber-100/70 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              )}
                              <span>{tx.calc}</span>
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-5 font-mono font-bold text-sm text-[#2F241E]">
                            ₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* credit_after_transaction */}
                          <td className="py-3.5 px-5 font-mono font-bold text-[#4B352A]">
                            ₹{Number(tx.credit_after_transaction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* created_at */}
                          <td className="py-3.5 px-5 text-[#8A7B70]">
                            {formattedDate}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EEE7DD] pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#4B352A] text-white flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-[#A67C52]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2F241E]">Add Dealer Transaction</h3>
                  <p className="text-[11px] text-[#8A7B70]">Record a Credit or Debit entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 text-[#8A7B70] hover:text-[#2F241E] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Field 1: Dealer */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] mb-1">
                  Dealer *
                </label>
                <select
                  value={modalDealerId}
                  onChange={(e) => setModalDealerId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-xs font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                >
                  <option value="">-- Select Dealer --</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} • {d.shop_name} ({d.unique_id || 'ID'}) - Current Credit: ₹{Number(d.current_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Transaction Type (calc: Credit / Debit) */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] mb-1.5">
                  Calculation / Type (calc) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalCalc('Credit')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                      modalCalc === 'Credit'
                        ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs ring-2 ring-amber-300'
                        : 'bg-[#F8F4EE] text-[#5B4A3F] border-[#DDD3C6] hover:bg-[#F2ECE2]'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-700" />
                    <span>Credit (Add to Credit)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCalc('Debit')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                      modalCalc === 'Debit'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-2xs ring-2 ring-emerald-300'
                        : 'bg-[#F8F4EE] text-[#5B4A3F] border-[#DDD3C6] hover:bg-[#F2ECE2]'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
                    <span>Debit (Subtract Payment)</span>
                  </button>
                </div>
              </div>

              {/* Field 3: Amount */}
              <div>
                <label className="block text-xs font-bold text-[#4B352A] mb-1">
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
                    className="w-full pl-8 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm font-mono font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                  />
                </div>
              </div>

              {/* Auto-Calculated credit_after_transaction Display */}
              <div className="bg-[#F2ECE2] border border-[#DDD3C6] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#8A7B70]">
                  <span>Current Dealer Credit:</span>
                  <span className="font-mono font-bold text-[#2F241E]">
                    ₹{activeModalCurrentCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8A7B70]">
                  <span>Transaction Adjustment:</span>
                  <span className={`font-mono font-bold ${modalCalc === 'Credit' ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {modalCalc === 'Credit' ? '+' : '-'} ₹{parsedModalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#DDD3C6] flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#4B352A] flex items-center space-x-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#A67C52]" />
                    <span>Credit After Transaction:</span>
                  </span>
                  <span className="font-mono text-sm font-black text-[#2F241E]">
                    ₹{calculatedCreditAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 bg-[#F8F4EE] hover:bg-[#F2ECE2] text-[#4B352A] border border-[#DDD3C6] rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 bg-[#4B352A] hover:bg-[#32231B] text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-200" />
                      <span>Save Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DealerTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
            <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
            <p className="text-xs font-semibold text-[#2F241E]">Loading Dealer Transactions...</p>
          </div>
        </div>
      }
    >
      <DealerTransactionsContent />
    </Suspense>
  );
}
