'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  LayoutDashboard,
  Network,
  Cpu,
  Users,
  AlertTriangle,
  SearchCode,
  Radio,
  FileText,
  Settings,
  X,
  Activity,
  LucideIcon,
} from 'lucide-react';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  live?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SummaryCounts {
  flaggedConsumers: number;
  suspiciousDts: number;
  totalConsumers: number;
  totalDts: number;
  computedAt: string;
  online: boolean;
}

// ------------------------------------------------------------
// Live counts hook
// ------------------------------------------------------------
function useSidebarCounts(): SummaryCounts {
  const [counts, setCounts] = useState<SummaryCounts>({
    flaggedConsumers: 0,
    suspiciousDts: 0,
    totalConsumers: 0,
    totalDts: 0,
    computedAt: '',
    online: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/backend/api/v1/scores/summary', {
          cache: 'no-store',
        });

        // 404 = backend up but no data yet → treat as zero, still "online"
        if (r.status === 404) {
          if (!cancelled) {
            setCounts((c) => ({ ...c, online: true }));
          }
          return;
        }

        if (!r.ok) throw new Error(`API ${r.status}`);

        const data = await r.json();
        if (cancelled) return;

        setCounts({
          flaggedConsumers: Number(data?.consumers?.flagged ?? 0),
          suspiciousDts:    Number(data?.dts?.suspicious ?? 0),
          totalConsumers:   Number(data?.consumers?.total ?? 0),
          totalDts:         Number(data?.dts?.total ?? 0),
          computedAt:       data?.computed_at ?? '',
          online:           true,
        });
      } catch {
        if (!cancelled) {
          setCounts((c) => ({ ...c, online: false }));
        }
      }
    }

    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return counts;
}

// ------------------------------------------------------------
// Sidebar
// ------------------------------------------------------------
export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const pathname = usePathname();
  const counts = useSidebarCounts();

  // Build nav with live badges
  const navGroups: NavGroup[] = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'NETWORK',
      items: [
        { name: 'Network', href: '/network', icon: Network },
        { name: 'Transformers', href: '/transformers', icon: Cpu },
        { name: 'Consumers', href: '/consumers', icon: Users },
      ],
    },
    {
      label: 'INVESTIGATION',
      items: [
        {
          name: 'Alerts',
          href: '/alerts',
          icon: AlertTriangle,
          badge: counts.flaggedConsumers > 0 ? String(counts.flaggedConsumers) : undefined,
        },
        {
          name: 'Investigations',
          href: '/investigations',
          icon: SearchCode,
          badge: counts.suspiciousDts > 0 ? String(counts.suspiciousDts) : undefined,
        },
        { name: 'Live Monitoring', href: '/live', icon: Radio, live: true },
      ],
    },
    {
      label: 'REPORTING',
      items: [
        { name: 'Reports', href: '/reports', icon: FileText },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Footer status text derived from live data
  const statusLabel = !counts.online
    ? 'Backend Offline'
    : counts.totalConsumers === 0
    ? 'Awaiting evaluation'
    : `${counts.totalDts} DTs · ${counts.totalConsumers} consumers`;

  const statusDotClass = !counts.online
    ? 'bg-rose-600'
    : counts.suspiciousDts > 0
    ? 'bg-amber-500'
    : 'bg-emerald-600';

  const navContent = (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200 w-64 select-none font-sans">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="p-2 bg-sky-50 border border-sky-200 rounded-md text-sky-700">
            <Zap className="w-5 h-5 fill-sky-700 text-sky-700" />
          </div>
          <div>
            <div className="font-bold text-slate-900 tracking-tight text-base flex items-center gap-1.5 font-sans">
              GridGuard
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              Utility Intelligence
            </div>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase mb-1.5">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all ${
                      active
                        ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? 'text-sky-700' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold ${
                          active
                            ? 'bg-sky-700 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.live && (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        LIVE
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status — live */}
      <div className="p-3.5 border-t border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-mono truncate">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} />
            <span className="font-semibold text-[11px] truncate" title={statusLabel}>
              {statusLabel}
            </span>
          </div>
          <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>System Settings</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">{navContent}</div>
        </div>
      )}
    </>
  );
};