'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getProducts,
  getCompanyOptions,
  getCategoryOptions,
  createProducts,
  DropdownOption,
  CreateProductInput
} from '@/lib/productsStore';
import {
  getDiscounts,
  computePurchasePrice
} from '@/lib/discountsStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  Layers
} from 'lucide-react';

interface ProductRow {
  tempId: string;
  unique_id: string;
  name: string;
  company_id: string;
  category_id: string;
  base_price: number | '';
  purchase_price: number | '';
  selling_price: number | '';
  quantity: number | '';
  low_stock: number | '';
  unit: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Options for Dropdowns
  const [companies, setCompanies] = useState<DropdownOption[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);

  // Sequence generator counter
  const [nextSeqNum, setNextSeqNum] = useState<number>(101);

  // Rows of products to add
  const [rows, setRows] = useState<ProductRow[]>([]);

  // Track the row to focus on name field
  const [rowToFocus, setRowToFocus] = useState<number | null>(null);

  // Auto-generate suggested unique_id: Prod-101 + products.length
  useEffect(() => {
    let mounted = true;

    async function initializePage() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace('/login');
        return;
      }

      try {
        const [productsList, compList, catList] = await Promise.all([
          getProducts(),
          getCompanyOptions(),
          getCategoryOptions(),
        ]);

        if (mounted) {
          const startingNum = 101 + productsList.length;
          setCompanies(compList);
          setCategories(catList);
          setNextSeqNum(startingNum + 1);

          // Initial row
          setRows([
            {
              tempId: `prod-row-${startingNum}`,
              unique_id: `Prod-${startingNum}`,
              name: '',
              company_id: compList[0]?.id || '',
              category_id: catList[0]?.id || '',
              base_price: '',
              purchase_price: '',
              selling_price: '',
              quantity: 0,
              low_stock: 10,
              unit: 'PCS',
            },
          ]);

          setRowToFocus(0);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setRows([
            {
              tempId: 'prod-row-101',
              unique_id: 'Prod-101',
              name: '',
              company_id: '',
              category_id: '',
              base_price: '',
              purchase_price: '',
              selling_price: '',
              quantity: 0,
              low_stock: 10,
              unit: 'PCS',
            },
          ]);
          setNextSeqNum(102);
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

  // Focus the product name input when requested
  useEffect(() => {
    if (rowToFocus !== null && !loading) {
      const timer = setTimeout(() => {
        const target = document.querySelector<HTMLElement>(
          `[data-nav-row="${rowToFocus}"][data-nav-col="1"]`
        );
        if (target) {
          target.focus();
        }
        setRowToFocus(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [rowToFocus, loading]);

  // Add another product row (at the end)
  const handleAddAnotherRow = () => {
    const newSeq = nextSeqNum;
    setNextSeqNum((prev) => prev + 1);

    const newIndex = rows.length;
    const newRow: ProductRow = {
      tempId: `prod-row-${newSeq}`,
      unique_id: `Prod-${newSeq}`,
      name: '',
      company_id: companies[0]?.id || '',
      category_id: categories[0]?.id || '',
      base_price: '',
      purchase_price: '',
      selling_price: '',
      quantity: 0,
      low_stock: 10,
      unit: 'PCS',
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
  const handleFieldChange = (index: number, field: keyof ProductRow, value: any) => {
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
    totalCols: number = 10
  ) => {
    if (e.key === 'Enter') {
      if (colIndex === 9) {
        e.preventDefault();
        handleAddAnotherRow();
        return;
      }
    }

    if (e.key === 'ArrowRight') {
      const target = e.target as HTMLElement;
      let isAtEnd = true;
      if (target instanceof HTMLInputElement) {
        isAtEnd = target.selectionStart === target.value.length || target.selectionStart === null;
      }

      if (isAtEnd && colIndex < totalCols - 1) {
        e.preventDefault();
        const nextElem = document.querySelector<HTMLElement>(
          `[data-nav-row="${rowIndex}"][data-nav-col="${colIndex + 1}"]`
        );
        if (nextElem) {
          nextElem.focus();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const target = e.target as HTMLElement;
      let isAtStart = true;
      if (target instanceof HTMLInputElement) {
        isAtStart = target.selectionStart === 0 || target.selectionStart === null;
      }

      if (isAtStart && colIndex > 0) {
        e.preventDefault();
        const prevElem = document.querySelector<HTMLElement>(
          `[data-nav-row="${rowIndex}"][data-nav-col="${colIndex - 1}"]`
        );
        if (prevElem) {
          prevElem.focus();
        }
      }
    }
  };

  // Submit all products
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rows.length === 0) {
      setErrorMessage('Please add at least one product row.');
      return;
    }

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.unique_id.trim()) {
        setErrorMessage(`Row #${rowNum}: Product ID (unique_id) is required.`);
        return;
      }
      if (!row.name.trim()) {
        setErrorMessage(`Row #${rowNum}: Product Name is required.`);
        return;
      }
      if (!row.company_id) {
        setErrorMessage(`Row #${rowNum}: Please select a Company.`);
        return;
      }
      if (!row.category_id) {
        setErrorMessage(`Row #${rowNum}: Please select a Category.`);
        return;
      }
    }

    // Check for duplicate unique_ids in the list
    const idSet = new Set<string>();
    for (const r of rows) {
      const cleanId = r.unique_id.trim().toLowerCase();
      if (idSet.has(cleanId)) {
        setErrorMessage(`Duplicate Product ID "${r.unique_id}" detected in rows. Each product must have a unique ID.`);
        return;
      }
      idSet.add(cleanId);
    }

    setSaving(true);

    try {
      // 1. Fetch discounts to calculate purchase_price for combinations available
      const allDiscounts = await getDiscounts();
      const discountMap = new Map<string, any>();
      allDiscounts.forEach((d) => {
        discountMap.set(`${d.company_id}_${d.category_id}`, d);
      });

      // 2. Build payload with auto-calculated purchase_price if discount available
      const payload: CreateProductInput[] = rows.map((r) => {
        let finalPurchasePrice = Number(r.purchase_price || 0);
        const discount = discountMap.get(`${r.company_id}_${r.category_id}`);
        if (discount) {
          finalPurchasePrice = computePurchasePrice(
            Number(r.base_price || 0),
            discount.d1,
            discount.d2,
            discount.d3,
            discount.d4
          );
        }

        return {
          unique_id: r.unique_id.trim(),
          name: r.name.trim(),
          company_id: r.company_id,
          category_id: r.category_id,
          base_price: Number(r.base_price || 0),
          purchase_price: finalPurchasePrice,
          selling_price: Number(r.selling_price || 0),
          quantity: Number(r.quantity || 0),
          low_stock: Number(r.low_stock === '' ? 10 : r.low_stock),
          unit: r.unit.trim() || 'PCS',
        };
      });

      await createProducts(payload);

      router.push('/admin/products/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create products in Supabase.');
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
          activeItem="Products"
          onSelect={(item: string) => {
            if (item === 'Products') router.push('/admin/products/dashboard');
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1550px] mx-auto w-full space-y-6 min-w-0">
          {/* Breadcrumb / Back Link */}
          <div>
            <Link
              href="/admin/products/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#FFFCF8] px-3.5 py-2 rounded-xl border border-[#DDD3C6]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Products Dashboard</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2F241E]">
                  Add New Products
                </h1>
                <p className="text-xs text-[#8A7B70] mt-0.5">
                  Enter products in single-row format. Use Left / Right arrow keys to navigate across fields.
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
                  <Package className="w-4 h-4 text-[#A67C52]" />
                  <span className="text-xs font-bold text-[#2F241E] uppercase tracking-wider">
                    Product Entry Table ({rows.length} {rows.length === 1 ? 'Product' : 'Products'})
                  </span>
                </div>
                <span className="text-[11px] text-[#8A7B70]">
                  Navigate with Left / Right arrow keys within each row
                </span>
              </div>

              {/* Scrollable Container for Row UI */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[1300px]">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-3 w-10 text-center">#</th>
                      <th className="py-3.5 px-3 w-32 min-w-[120px]">Product ID *</th>
                      <th className="py-3.5 px-3 min-w-[220px]">Product Name *</th>
                      <th className="py-3.5 px-3 min-w-[170px]">Company *</th>
                      <th className="py-3.5 px-3 min-w-[170px]">Category *</th>
                      <th className="py-3.5 px-3 w-36 min-w-[135px]">b.p (₹)</th>
                      <th className="py-3.5 px-3 w-36 min-w-[135px]">p.p (₹)</th>
                      <th className="py-3.5 px-3 w-36 min-w-[135px]">s.p (₹)</th>
                      <th className="py-3.5 px-3 w-32 min-w-[110px]">q (Stock) *</th>
                      <th className="py-3.5 px-3 w-32 min-w-[110px]">Low Stock</th>
                      <th className="py-3.5 px-3 w-32 min-w-[110px]">Unit</th>
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

                        {/* Product ID (unique_id) - Col 0 */}
                        <td className="py-3 px-3 min-w-[120px]">
                          <input
                            type="text"
                            required
                            data-nav-row={index}
                            data-nav-col={0}
                            value={row.unique_id}
                            onChange={(e) =>
                              handleFieldChange(index, 'unique_id', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 0)}
                            placeholder="Prod-101"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono font-bold text-[#4B352A] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Product Name - Col 1 (Direct Focus) */}
                        <td className="py-3 px-3 min-w-[220px]">
                          <input
                            type="text"
                            required
                            data-nav-row={index}
                            data-nav-col={1}
                            value={row.name}
                            onChange={(e) =>
                              handleFieldChange(index, 'name', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 1)}
                            placeholder="e.g. PVC Conduit Pipe 25mm"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Company Dropdown - Col 2 */}
                        <td className="py-3 px-3 min-w-[170px]">
                          <select
                            required
                            data-nav-row={index}
                            data-nav-col={2}
                            value={row.company_id}
                            onChange={(e) =>
                              handleFieldChange(index, 'company_id', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 2)}
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          >
                            {companies.length === 0 ? (
                              <option value="">No Companies</option>
                            ) : (
                              companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))
                            )}
                          </select>
                        </td>

                        {/* Category Dropdown - Col 3 */}
                        <td className="py-3 px-3 min-w-[170px]">
                          <select
                            required
                            data-nav-row={index}
                            data-nav-col={3}
                            value={row.category_id}
                            onChange={(e) =>
                              handleFieldChange(index, 'category_id', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 3)}
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          >
                            {categories.length === 0 ? (
                              <option value="">No Categories</option>
                            ) : (
                              categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))
                            )}
                          </select>
                        </td>

                        {/* Base Price (b.p) - Col 4 */}
                        <td className="py-3 px-3 min-w-[135px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            data-nav-row={index}
                            data-nav-col={4}
                            value={row.base_price}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'base_price',
                                e.target.value === '' ? '' : parseFloat(e.target.value)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 4)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Purchase Price (p.p) - Col 5 */}
                        <td className="py-3 px-3 min-w-[135px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            data-nav-row={index}
                            data-nav-col={5}
                            value={row.purchase_price}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'purchase_price',
                                e.target.value === '' ? '' : parseFloat(e.target.value)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 5)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Selling Price (s.p) - Col 6 */}
                        <td className="py-3 px-3 min-w-[135px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            data-nav-row={index}
                            data-nav-col={6}
                            value={row.selling_price}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'selling_price',
                                e.target.value === '' ? '' : parseFloat(e.target.value)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 6)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-mono font-bold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Quantity (q) - Col 7 */}
                        <td className="py-3 px-3 min-w-[110px]">
                          <input
                            type="number"
                            required
                            min="0"
                            data-nav-row={index}
                            data-nav-col={7}
                            value={row.quantity}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'quantity',
                                e.target.value === '' ? '' : parseInt(e.target.value, 10)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 7)}
                            placeholder="0"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs font-semibold text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Low Stock - Col 8 */}
                        <td className="py-3 px-3 min-w-[110px]">
                          <input
                            type="number"
                            min="0"
                            data-nav-row={index}
                            data-nav-col={8}
                            value={row.low_stock}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                'low_stock',
                                e.target.value === '' ? '' : parseInt(e.target.value, 10)
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 8)}
                            placeholder="10"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Unit - Col 9 */}
                        <td className="py-3 px-3 min-w-[110px]">
                          <input
                            type="text"
                            data-nav-row={index}
                            data-nav-col={9}
                            value={row.unit}
                            onChange={(e) =>
                              handleFieldChange(index, 'unit', e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, index, 9)}
                            placeholder="PCS"
                            className="w-full px-2.5 py-2 bg-[#F8F4EE] border border-[#DDD3C6] rounded-lg text-xs text-[#2F241E] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                          />
                        </td>

                        {/* Delete Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            disabled={rows.length <= 1}
                            title={rows.length <= 1 ? 'Must keep at least 1 product row' : 'Remove row'}
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

              {/* Bottom Add Another Product Row Button and Info */}
              <div className="p-4 bg-[#F8F4EE] border-t border-[#EEE7DD] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAddAnotherRow}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#4B352A] hover:bg-[#32231B] text-white border border-[#32231B] rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-200" />
                  <span>(+) Add Another Product Row</span>
                </button>

                <p className="text-[11px] text-[#8A7B70]">
                  Ready to insert <strong>{rows.length}</strong> product {rows.length === 1 ? 'item' : 'items'} into the database
                </p>
              </div>
            </div>

            {/* Bottom Actions: Cancel & Confirm products(Insert into products) */}
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/admin/products/dashboard"
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
                    <span>Inserting {rows.length} Products into Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-amber-200" />
                    <span>Confirm products (Insert into products)</span>
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
