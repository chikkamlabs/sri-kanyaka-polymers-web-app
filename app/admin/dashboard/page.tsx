'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { Lock } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('Home');

  useEffect(() => {
    let mounted = true;

    async function verifyAuthSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session?.user) {
          if (mounted) {
            setUser(null);
            router.replace('/login');
          }
          return;
        }

        if (mounted) {
          setUser(data.session.user);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          router.replace('/login');
        }
      }
    }

    verifyAuthSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.replace('/login');
      } else if (session?.user) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] flex flex-col items-center justify-center p-4">
        <div className="bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 shadow-md text-center max-w-sm w-full space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#4B352A] text-[#A67C52] rounded-xl shadow-sm">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2F241E]">
              Authenticating...
            </h2>
            <p className="text-xs text-[#8A7B70] mt-1">
              Verifying session credentials for Admin Portal access.
            </p>
          </div>
          <div className="w-full bg-[#E8DFD8] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#A67C52] h-full w-2/3 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#5B4A3F] flex flex-col relative">
      {/* Attached Header with Sidebar Toggle for Mobile */}
      <AdminHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Layout with Responsive Sidebar */}
      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay when Sidebar is open */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Backdrop"
            className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        {/* Attached Sidebar (closed on mobile by default, openable via toggle) */}
        <AdminSidebar
          isSidebarOpen={isSidebarOpen}
          activeItem={activeItem}
          onSelect={(item: string) => {
            setActiveItem(item);
            if (item === 'Dealers') {
              router.push('/admin/Dealers/dashboard');
            } else if (item === 'Companies') {
              router.push('/admin/companies/dashboard');
            } else if (item === 'Categories') {
              router.push('/admin/categories/dashboard');
            } else if (item === 'Products') {
              router.push('/admin/products/dashboard');
            } else if (item === 'Discounts') {
              router.push('/admin/discounts/dashboard');
            }
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Blank Main Area - To fill later */}
        <main className="flex-1 p-6 bg-[#F8F4EE]">
          {/* Main space area left blank as requested */}
        </main>
      </div>
    </div>
  );
}
