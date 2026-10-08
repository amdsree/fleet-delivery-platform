'use client';

import React from 'react';
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
  Settings,
  Warehouse,
  Download,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Live Fleet Map', href: '/live-map', icon: MapPin },
  { name: 'Dispatch Board', href: '/dispatch', icon: Send },
  { name: 'Orders', href: '/orders', icon: PackageCheck },
  { name: 'Godown Managers', href: '/managers', icon: Warehouse },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Vehicles', href: '/vehicles', icon: Truck },
  { name: 'Locations & Geofences', href: '/locations', icon: Building2 },
  { name: 'Driver App Download', href: '/download', icon: Download },
  { name: 'Reports & Analytics', href: '/reports', icon: FileBarChart },
  { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950">
            FD
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">FleetOps Pro</h1>
            <p className="text-xs text-slate-400">Enterprise Logistics</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p>PostgreSQL + PostGIS 3.4</p>
        <p>GPS Engine Active (WebSocket)</p>
      </div>
    </aside>
  );
}
