'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Send,
  PackageCheck,
  Users,
  Truck,
  Building2,
  FileBarChart,
  ShieldAlert,
  Warehouse,
  Download,
  PlusCircle,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[]; // Allowed roles (if undefined, all roles)
}

const allNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Live Fleet Map', href: '/live-map', icon: MapPin },
  { name: 'Jobs & Dispatch', href: '/dispatch', icon: Send },
  { name: 'Orders', href: '/orders', icon: PackageCheck },
  { name: 'Godown & Sales Staff', href: '/managers', icon: Users, roles: ['ADMIN'] },
  { name: 'Drivers Roster', href: '/drivers', icon: Users, roles: ['ADMIN', 'GODOWN_MANAGER'] },
  { name: 'Fleet Vehicles', href: '/vehicles', icon: Truck, roles: ['ADMIN', 'GODOWN_MANAGER'] },
  { name: 'Warehouses & Godowns', href: '/locations', icon: Building2 },
  { name: 'Driver App Download', href: '/download', icon: Download },
  { name: 'Reports & Analytics', href: '/reports', icon: FileBarChart, roles: ['ADMIN', 'GODOWN_MANAGER', 'SALES_STAFF'] },
  { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('ADMIN');
  const [userName, setUserName] = useState<string>('Edwin');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fleet_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.role) setUserRole(parsed.role);
          if (parsed.role === 'ADMIN') {
            setUserName('Edwin');
          } else if (parsed.name) {
            setUserName(parsed.name);
          }
        } catch {}
      }
    }
  }, []);

  const filteredNavItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'SuperAdmin', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-800' };
      case 'GODOWN_MANAGER':
        return { label: 'Godown Manager', color: 'bg-amber-950/80 text-amber-400 border-amber-800' };
      case 'SALES_STAFF':
        return { label: 'Sales Staff', color: 'bg-sky-950/80 text-sky-400 border-sky-800' };
      default:
        return { label: role, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const badge = getRoleBadge(userRole);

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950">
            FD
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base tracking-tight text-white truncate">FleetOps Pro</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action: Add Delivery Job Button */}
        <div className="mt-4">
          <Link
            href="/dispatch?action=new-job"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/60 hover:scale-[1.01]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Delivery Job</span>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Role Navigation ({badge.label})
        </div>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p className="font-medium text-slate-400">{userName}</p>
        <p className="text-[11px] mt-0.5">PostGIS Dispatch Active</p>
      </div>
    </aside>
  );
}
