'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getDealers, createDealers, CreateDealerInput } from '@/lib/dealersStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Users,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  Layers
} from 'lucide-react';

interface DealerRow {
  tempId: string;
  unique_id: string;
  name: string;
  shop_name: string;
  mobile: string;
  current_credit: number | '';
  credit_limit: number | '';
  address: string;
  details: string;
}

export default function AddDealerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sequence generator counter for unique_id
  const [nextSeqNum, setNextSeqNum] = useState<number>(1001);

  // Rows of dealers to add
  const [rows, setRows] = useState<DealerRow[]>([]);

  // Track the row to focus on name field
  const [rowToFocus, setRowToFocus] = useState<number | null>(null);

  // Auto-generate suggested unique_id: DLR-1001 + dealers.length
  useEffect(() => {
    let mounted = true;

    async function initializePage() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace('/login');
        return;
      }

      try {
        const dealersList = await getDealers();

        if (mounted) {
          const startingNum = 1001 + dealersList.length;
          setNextSeqNum(startingNum + 1);

          // Initial row
          setRows([
            {
              tempId: `dealer-row-${startingNum}`,
              unique_id: `DLR-${startingNum}`,
              name: '',
              shop_name: '',
              mobile: '',
              current_credit: '',
              credit_limit: '',
              address: '',
              details: '',
            },
          ]);

          setRowToFocus(0);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setRows([
            {
              tempId: 'dealer-row-1001',
              unique_id: 'DLR-1001',
              name: '',
              shop_name: '',
              mobile: '',
              current_credit: '',
              credit_limit: '',
              address: '',
              details: '',
            },
          ]);
          setNextSeqNum(1002);
          setRowToFocus(0);
          setLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Focus the dealer name input when requested
  useEffect(() => {
    if (rowToFocus !== null && !loading) {
      const timer = setTimeout(() => {
        const target = document.querySelector<HTMLElement>(
          `[data-dealer-row="${rowToFocus}"][data-dealer-col="1"]`
        );
        if (target) {
          target.focus();
        }
        setRowToFocus(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [rowToFocus, loading]);

  // Add a new row at the bottom
  const handleAddAnotherRow = () => {
    const newSeq = nextSeqNum;
    setNextSeqNum((prev) => prev + 1);

    const newIndex = rows.length;
    const newRow: DealerRow = {
      tempId: `dealer-row-${newSeq}`,
      unique_id: `DLR-${newSeq}`,
      name: '',
      shop_name: '',
      mobile: '',
      current_credit: '',
      credit_limit: '',
      address: '',
      details: '',
    };

    setRows((prev) => [...prev, newRow]);
    setRowToFocus(newIndex);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a field in a row
  const handleFieldChange = (index: number, field: keyof DealerRow, value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // Keyboard navigation: move between cells in the row using Left & Right Arrow keys
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    rowIndex: number,
    colIndex: number,
    totalCols: number = 8
  ) => {
    if (e.key === 'Enter') {
      if (colIndex === 7) {
        e.preventDefault();
        handleAddAnotherRow();
        return;
      }
    }

    if (e.key === 'ArrowRight') {
      const target = e.target as HTMLElement;
      let isAtEnd = true;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        isAtEnd = target.selectionStart === target.value.length || target.selectionStart === null;
      }

      if (isAtEnd && colIndex < totalCols - 1) {
        e.preventDefault();
        const nextElem = document.querySelector<HTMLElement>(
          `[data-dealer-row="${rowIndex}"][data-dealer-col="${colIndex + 1}"]`
        );
        if (nextElem) {
          nextElem.focus();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const target = e.target as HTMLElement;
      let isAtStart = true;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        isAtStart = target.selectionStart === 0 || target.selectionStart === null;
      }

      if (isAtStart && colIndex > 0) {
        e.preventDefault();
        const prevElem = document.querySelector<HTMLElement>(
          `[data-dealer-row="${rowIndex}"][data-dealer-col="${colIndex - 1}"]`
        );
        if (prevElem) {
          prevElem.focus();
        }
      }
    }
  };

  // Submit all dealers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rows.length === 0) {
      setErrorMessage('Please add at least one dealer row.');
      return;
    }

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.unique_id.trim()) {
        setErrorMessage(`Row #${rowNum}: Dealer ID (unique_id) is required.`);
        return;
      }
      if (!row.name.trim()) {
        setErrorMessage(`Row #${rowNum}: Dealer Name is required.`);
        return;
      }
      if (!row.shop_name.trim()) {
        setErrorMessage(`Row #${rowNum}: Shop Name is required.`);
        return;
      }
      if (!row.mobile.trim()) {
        setErrorMessage(`Row #${rowNum}: Mobile Number is required.`);
        return;
      }
    }

    // Check for duplicate unique_ids in the list
    const idSet = new Set<string>();
    for (const r of rows) {
      const cleanId = r.unique_id.trim().toLowerCase();
      if (idSet.has(cleanId)) {
        setErrorMessage(`Duplicate Dealer ID "${r.unique_id}" detected in rows. Each dealer must have a unique ID.`);
        return;
      }
      idSet.add(cleanId);
    }

    setSaving(true);

    try {
      const payload: CreateDealerInput[] = rows.map((r) => ({
        unique_id: r.unique_id.trim(),
        name: r.name.trim(),
        shop_name: r.shop_name.trim(),
        mobile: r.mobile.trim(),
        current_credit: Number(r.current_credit || 0),
        credit_limit: Number(r.credit_limit || 0),
        address: r.address.trim() || null,
        details: r.details.trim() || null,
      }));

      // createDealers inserts the dealers into Supabase
      // and automatically records a transaction in dealer_transactions if current_credit > 0
      await createDealers(payload);

      router.push('/admin/Dealers/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create dealers in Supabase.');
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

      <div className="flex flex-1 relative min-w-0">
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1550px] mx-auto w-full space-y-6 min-w-0">
          {/* Breadcrumb / Back Link */}
          <div>
            <Link
              href="/admin/Dealers/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dealers Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E]">
                  Add New Dealers
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5">
                  Enter dealer records in single-row format matching the dashboard layout, then confirm insertion
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-[#F8F4EE] px-4 py-2 rounded-xl border border-[#DDD3C6] self-start sm:self-auto">
              <Layers className="w-4 h-4 text-[#A67C52]" />
              <span className="text-xs font-bold text-[#2F241E]">
                Total Rows: {rows.length}
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-900">Validation / Creation Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Single-Row Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6 w-full min-w-0">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden w-full min-w-0">
              <div className="px-6 py-4 border-b border-[#EEE7DD] bg-[#F8F4EE] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#A67C52]" />
                  <span className="text-xs font-bold text-[#2F241E] uppercase tracking-wider">
                    Dealers Entry Table ({rows.length} {rows.length === 1 ? 'Dealer' : 'Dealers'})
                  </span>
                </div>
                <span className="text-[11px] text-[#8A7B70]">
                  Navigate with Left / Right arrow keys within each row
                </span>
              </div>

              {/* Scrollable Container for Row UI */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[1350px]">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-3 w-10 text-center">#</th>
                      <th className="py-3.5 px-3 w-32 min-w-[120px]">Dealer ID *</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Dealer Name *</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Shop Name *</th>
                      <th className="py-3.5 px-3 w-44 min-w-[150px]">Mobile *</th>
                      <th className="py-3.5 px-3 w-44 min-w-[150px]">Current Credit (₹)</th>
                      <th className="py-3.5 px-3 w-44 min-w-[150px]">Credit Limit (₹)</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Address</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Details / Notes</th>
                      <th className="py-3.5 px-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {rows.map((row, index) => (
                      <tr
                        key={row.tempId}
                        className="hover:bg-[#FDFBF7] transition-colors bg-[#FFFCF8]"
                      >
                        {/* Row Number */}
                        <td className="py-3 px-3 text-center font-bold text-[#8A7B70]">
                          {index + 1}
                        </td>

                        {/* Dealer ID (unique_id) - Col 0 */}
                        <td className="py-3 px-3 min-w-[120px]">
                          <input
                            type="text"
                            required
                            data-dealer-row={index}
                            data-dealer-col={0}
                            value={row.unique_id}
                            onChange={(e) =>
                              handleFieldChange(index, 'unique_id', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 0)}
                            placeholder="DLR-1001"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono font-bold text-[#4B352A] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Dealer Name - Col 1 */}
                        <td className="py-3 px-3 min-w-[200px]">
                          <input
                            type="text"
                            required
                            data-dealer-row={index}
                            data-dealer-col={1}
                            value={row.name}
                            onChange={(e) =>
                              handleFieldChange(index, 'name', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 1)}
                            placeholder="e.g. Rajesh Kumar"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Shop Name - Col 2 */}
                        <td className="py-3 px-3 min-w-[200px]">
                          <input
                            type="text"
                            required
                            data-dealer-row={index}
                            data-dealer-col={2}
                            value={row.shop_name}
                            onChange={(e) =>
                              handleFieldChange(index, 'shop_name', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 2)}
                            placeholder="e.g. Kanyaka Hardware"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Mobile - Col 3 */}
                        <td className="py-3 px-3 min-w-[150px]">
                          <input
                            type="tel"
                            required
                            data-dealer-row={index}
                            data-dealer-col={3}
                            value={row.mobile}
                            onChange={(e) =>
                              handleFieldChange(index, 'mobile', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 3)}
                            placeholder="9876543210"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Current Credit - Col 4 */}
                        <td className="py-3 px-3 min-w-[150px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            data-dealer-row={index}
                            data-dealer-col={4}
                            value={row.current_credit}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'current_credit',
                                e.target.value === '' ? '' : parseFloat(e.target.value)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 4)}
                            placeholder="0.00"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Credit Limit - Col 5 */}
                        <td className="py-3 px-3 min-w-[150px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            data-dealer-row={index}
                            data-dealer-col={5}
                            value={row.credit_limit}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'credit_limit',
                                e.target.value === '' ? '' : parseFloat(e.target.value)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 5)}
                            placeholder="0.00"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Address - Col 6 */}
                        <td className="py-3 px-3 min-w-[200px]">
                          <input
                            type="text"
                            data-dealer-row={index}
                            data-dealer-col={6}
                            value={row.address}
                            onChange={(e) =>
                              handleFieldChange(index, 'address', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 6)}
                            placeholder="City / Area"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Details / Notes - Col 7 */}
                        <td className="py-3 px-3 min-w-[200px]">
                          <input
                            type="text"
                            data-dealer-row={index}
                            data-dealer-col={7}
                            value={row.details}
                            onChange={(e) =>
                              handleFieldChange(index, 'details', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 7)}
                            placeholder="Notes..."
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Delete Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            disabled={rows.length <= 1}
                            title={rows.length <= 1 ? 'Must keep at least 1 dealer row' : 'Remove row'}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Add Another Dealer Row Button and Info */}
              <div className="p-4 bg-[#F8F4EE] border-t border-[#EEE7DD] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAddAnotherRow}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#4B352A] hover:bg-[#32231B] text-white border border-[#32231B] rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-200" />
                  <span>(+) Add Another Dealer Row</span>
                </button>

                <p className="text-[11px] text-[#8A7B70]">
                  Ready to insert <strong>{rows.length}</strong> dealer {rows.length === 1 ? 'record' : 'records'} into the database
                </p>
              </div>
            </div>

            {/* Bottom Actions: Cancel & Confirm dealers (Insert into dealers) */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/admin/Dealers/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#DDD3C6] text-xs font-bold text-[#5B4A3F] hover:bg-[#F8F4EE] transition-colors text-center"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#4B352A] hover:bg-[#32231B] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50 border border-[#32231B]"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Inserting {rows.length} Dealers into Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-amber-200" />
                    <span>Confirm dealers (Insert into dealers)</span>
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
