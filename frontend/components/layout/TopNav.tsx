'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Menu, ChevronRight } from 'lucide-react';

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    if (pathname === '/' || pathname === '/dashboard') {
      return { category: 'Dashboard', page: 'Overview' };
    }
    const parts = pathname.split('/').filter(Boolean);
    const category = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Dashboard';
    const page = parts[1] ? parts[1].toUpperCase() : 'Overview';
    return { category, page };
  };

  const { category, page } = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between font-sans">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Open Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="font-sans">{category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-bold text-slate-900">{page}</span>
        </div>
      </div>

      {/* Right: Search, Live Status, Notifications & Avatar */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative hidden md:block w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search consumer, meter ID..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden font-mono"
          />
        </div>

        {/* Notification Bell */}
        <button className="relative p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-md bg-sky-700 flex items-center justify-center text-white text-xs font-mono font-bold">
            SD
          </div>
          <div className="hidden sm:block text-left text-xs font-sans">
            <div className="font-bold text-slate-900">Sumit D.</div>
            <div className="text-[10px] font-mono text-slate-500">Grid Analyst</div>
          </div>
        </div>
      </div>
    </header>
  );
};
