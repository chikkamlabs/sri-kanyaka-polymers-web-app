'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, Menu, X } from 'lucide-react';

export default function HeaderPage(props: any) {
  const router = useRouter();
  const { onToggleSidebar, isSidebarOpen } = props || {};

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      router.replace('/login');
    }
  };

  return (
    <header className="bg-[#4B352A] text-[#E8DFD8] border-b border-[#3D2B22] px-4 sm:px-6 py-3.5 shadow-sm flex items-center justify-between sticky top-0 z-50">
      {/* Left side: Mobile Toggle Button & Logo & Greeting */}
      <div className="flex items-center space-x-3">
        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          className="md:hidden p-2 text-[#DCCFBE] hover:text-white bg-[#3D2B22] rounded-lg border border-[#A67C52]/40 focus:outline-none focus:ring-2 focus:ring-[#A67C52] transition-colors"
        >
          {isSidebarOpen ? (
            <X className="w-5 h-5 text-amber-300" />
          ) : (
            <Menu className="w-5 h-5 text-[#DCCFBE]" />
          )}
        </button>

        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-[#A67C52]/40 bg-[#3D2B22] flex items-center justify-center shrink-0">
          <Image
            src="/sk_logo.png"
            alt="Sri Kanyaka Polymers Logo"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        </div>
        <div>
          <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight leading-tight">
            Hello, Kanyaka Polymers
          </h1>
          <span className="text-[10px] sm:text-[11px] text-[#B8A89C] block">
            Admin Management Portal
          </span>
        </div>
      </div>

      {/* Right side: Log out button */}
      <div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center space-x-1.5 sm:space-x-2 text-xs font-semibold text-red-200 hover:text-white bg-red-950/50 hover:bg-red-900/80 border border-red-800/60 px-2.5 sm:px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Log out</span>
          <span className="sm:hidden">Logout</span>
        </button>
      </div>
    </header>
  );
}
