'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  ShoppingCart,
  Percent,
  Package,
  Users,
  Building2,
  Tags,
  X
} from 'lucide-react';

export default function SidebarPage(props: any) {
  const router = useRouter();
  const { isSidebarOpen, activeItem = 'Home', onSelect, onCloseMobile } = props || {};
  const [selected, setSelected] = useState(activeItem);

  const menuItems = [
    { name: 'Home', icon: Home, route: '/admin/dashboard' },
    { name: 'Orders', icon: ShoppingCart, route: '/admin/dashboard' },
    { name: 'Discounts', icon: Percent, route: '/admin/discounts/dashboard' },
    { name: 'Products', icon: Package, route: '/admin/products/dashboard' },
    { name: 'Dealers', icon: Users, route: '/admin/Dealers/dashboard' },
    { name: 'Companies', icon: Building2, route: '/admin/companies/dashboard' },
    { name: 'Categories', icon: Tags, route: '/admin/categories/dashboard' },
  ];

  const handleItemClick = (name: string, route: string) => {
    setSelected(name);
    if (route) {
      router.push(route);
    }
    if (onSelect) {
      onSelect(name);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`bg-[#4B352A] text-[#E8DFD8] border-r border-[#3D2B22] flex flex-col shrink-0 transition-all duration-200 ${
        isSidebarOpen
          ? 'fixed inset-y-0 left-0 z-40 w-64 pt-16 md:pt-0 flex shadow-2xl md:shadow-none md:relative md:inset-auto md:z-auto md:min-h-screen'
          : 'hidden md:flex md:w-64 md:min-h-screen'
      }`}
    >
      <div className="p-4 border-b border-[#3D2B22] flex items-center justify-between">
        <p className="text-xs font-bold text-[#A67C52] uppercase tracking-wider">
          Admin Navigation
        </p>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close Mobile Sidebar"
            className="md:hidden p-1 text-[#B8A89C] hover:text-white rounded-md hover:bg-[#3D2B22]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = selected === item.name;

          return (
            <button
              key={item.name}
              onClick={() => handleItemClick(item.name, item.route)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-[#A67C52] text-white shadow-sm font-semibold'
                  : 'text-[#DCCFBE] hover:bg-[#3D2B22] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#A67C52]'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
