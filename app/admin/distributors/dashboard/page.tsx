'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getDistributors, DistributorWithPurchases } from '@/lib/distributorsStore';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  Truck,
  Plus,
  Search,
  ExternalLink,
  Layers,
  Inbox,
  Lock,
  MapPin,
  FileText,
  ShoppingBag
} from 'lucide-react';

export default function DistributorsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [distributors, setDistributors] = useState<DistributorWithPurchases[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDistributorsData() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace('/login');
          return;
        }

        const data = await getDistributors();
        if (mounted) {
          setDistributors(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setFetchError(err.message || 'Failed to fetch distributors from Supabase.');
          setLoading(false);
        }
      }
    }

    loadDistributorsData();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Derived Calculations
  const totalDistributorsCount = distributors.length;

  // Filtered List based on search (name, distributor_id)
  const filteredDistributors = distributors.filter((d) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const matchesName = d.name ? d.name.toLowerCase().includes(query) : false;
    const matchesCode = d.distributor_code ? d.distributor_code.toLowerCase().includes(query) : false;
    const matchesId = d.id ? d.id.toLowerCase().includes(query) : false;

    return matchesName || matchesCode || matchesId;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 text-center max-w-sm w-full space-y-3 shadow-sm">
          <Lock className="w-6 h-6 text-[#A67C52] animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-[#2F241E]">
            Loading Distributors Data...
          </p>
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
            if (item === 'Distributors') {
              router.push('/admin/distributors/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Stat Bar: Total Distributors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4B352A] text-white rounded-xl flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-[#A67C52]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A7B70] uppercase tracking-wider block">
                  Total Distributors
                </span>
                <span className="text-2xl font-black text-[#2F241E]">
                  {totalDistributorsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Add Distributor Button & Search */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Add Distributor Button */}
            <div>
              <Link
                href="/admin/adddistributor"
                className="w-full py-3 px-6 bg-[#4B352A] hover:bg-[#32231B] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 border border-[#32231B]"
              >
                <Plus className="w-5 h-5 text-amber-200" />
                <span>Add Distributor</span>
              </Link>
            </div>

            {/* Search Bar (name, distributor_id) */}
            <div className="pt-2 border-t border-[#EEE7DD]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8A7B70] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search distributor by Name or Distributor ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
                />
              </div>
            </div>
          </div>

          {/* Fetch Error Display */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <strong>Database Fetch Error:</strong> {fetchError}
            </div>
          )}

          {/* All Distributors List Table */}
          <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEE7DD] flex items-center justify-between bg-[#F8F4EE]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#A67C52]" />
                <h2 className="text-sm font-bold text-[#2F241E] uppercase tracking-wider">
                  All Distributors List ({filteredDistributors.length})
                </h2>
              </div>
            </div>

            {/* Empty Screen state when no distributors found */}
            {filteredDistributors.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-[#F8F4EE] text-[#8A7B70] rounded-2xl flex items-center justify-center mx-auto border border-[#DDD3C6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2F241E]">
                  No Distributors Found
                </h3>
                <p className="text-xs text-[#8A7B70] max-w-sm mx-auto">
                  {searchQuery
                    ? 'No distributor records match your search criteria.'
                    : 'There are currently no distributors registered in the database. Click "Add Distributor" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2ECE2] text-[#4B352A] uppercase tracking-wider font-bold border-b border-[#DDD3C6]">
                    <tr>
                      <th className="py-3.5 px-6">Id</th>
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6">Location</th>
                      <th className="py-3.5 px-6">Total Purchases</th>
                      <th className="py-3.5 px-6">Notes</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE7DD]">
                    {filteredDistributors.map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-[#F8F4EE] transition-colors"
                      >
                        {/* Id (distributor_code) */}
                        <td className="py-4 px-6 font-mono font-bold text-[#4B352A]">
                          {d.distributor_code || d.id.substring(0, 8)}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-6 font-semibold text-[#2F241E]">
                          {d.name}
                        </td>

                        {/* Location */}
                        <td className="py-4 px-6 text-[#5B4A3F]">
                          {d.location ? (
                            <span className="inline-flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-[#8A7B70] shrink-0" />
                              <span>{d.location}</span>
                            </span>
                          ) : (
                            <span className="text-[#A09388]">—</span>
                          )}
                        </td>

                        {/* Total purchases */}
                        <td className="py-4 px-6 font-bold text-[#2F241E]">
                          <span className="inline-flex items-center space-x-1.5 bg-[#F2ECE2] text-[#4B352A] px-2.5 py-1 rounded-lg border border-[#DDD3C6]">
                            <ShoppingBag className="w-3.5 h-3.5 text-[#A67C52]" />
                            <span>{d.total_purchases ?? 0}</span>
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="py-4 px-6 text-[#5B4A3F] max-w-xs truncate">
                          {d.notes ? (
                            <span className="inline-flex items-center space-x-1 truncate" title={d.notes}>
                              <FileText className="w-3.5 h-3.5 text-[#8A7B70] shrink-0" />
                              <span className="truncate">{d.notes}</span>
                            </span>
                          ) : (
                            <span className="text-[#A09388]">—</span>
                          )}
                        </td>

                        {/* Open button */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/admin/opendistributor?id=${d.id}`}
                            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#4B352A] hover:text-white bg-[#F8F4EE] hover:bg-[#4B352A] px-3.5 py-1.5 rounded-lg border border-[#DDD3C6] hover:border-[#4B352A] transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
