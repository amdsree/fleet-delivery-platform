'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  Users,
  Send,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function DashboardPage() {
  const [data, setData] = useState<any>({
    orders: { total: 0, completed: 0, pending: 0, in_progress: 0, failed: 0, cancelled: 0 },
    active_jobs: 0,
    drivers: { available: 0, on_job: 0, at_pickup: 0, at_delivery: 0, returning: 0, offline: 0, total: 0 },
    vehicles: { available: 0, in_use: 0, maintenance: 0, inactive: 0, total: 0 },
  });
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (e) {
      console.warn('Dashboard fetch failed, using fallback metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const socket = getSocket();

    socket.on('job:status_updated', () => fetchSummary());
    socket.on('driver:status_changed', () => fetchSummary());

    return () => {
      socket.off('job:status_updated');
      socket.off('driver:status_changed');
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Operations Control Center</h2>
          <p className="text-sm text-slate-400">
            Real-time fleet telemetry, active dispatch pipelines, and delivery performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dispatch"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
            Dispatch Queue
          </Link>
          <Link
            href="/live-map"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            Live Map
          </Link>
        </div>
      </div>

      {/* 1. Orders KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Total Orders</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white">{data.orders.total}</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs uppercase font-semibold">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{data.orders.completed}</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs uppercase font-semibold">In Progress</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{data.orders.in_progress}</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs uppercase font-semibold">Pending Dispatch</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{data.orders.pending}</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs uppercase font-semibold">Failed</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{data.orders.failed}</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-semibold">Cancelled</span>
            <XCircle className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-400">{data.orders.cancelled}</p>
        </div>
      </div>

      {/* 2. Driver & Vehicle Fleet Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drivers Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Driver Status Breakdown</h3>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-full text-slate-300">
              {data.drivers.total} Total Drivers
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Available</p>
              <p className="text-xl font-bold text-emerald-400">{data.drivers.available}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">On Active Job</p>
              <p className="text-xl font-bold text-blue-400">{data.drivers.on_job}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">At Pickup</p>
              <p className="text-xl font-bold text-amber-400">{data.drivers.at_pickup}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">At Delivery</p>
              <p className="text-xl font-bold text-purple-400">{data.drivers.at_delivery}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Returning</p>
              <p className="text-xl font-bold text-teal-400">{data.drivers.returning}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Offline / Off Duty</p>
              <p className="text-xl font-bold text-slate-500">{data.drivers.offline}</p>
            </div>
          </div>
        </div>

        {/* Vehicles Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Vehicle Fleet Readiness</h3>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-full text-slate-300">
              {data.vehicles.total} Registered Vehicles
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Ready & Available</p>
              <p className="text-2xl font-bold text-emerald-400">{data.vehicles.available}</p>
              <p className="text-xs text-slate-500 mt-1">Ready for dispatch assignment</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Assigned / In Trip</p>
              <p className="text-2xl font-bold text-blue-400">{data.vehicles.in_use}</p>
              <p className="text-xs text-slate-500 mt-1">Actively executing jobs</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">In Maintenance</p>
              <p className="text-2xl font-bold text-amber-400">{data.vehicles.maintenance}</p>
              <p className="text-xs text-slate-500 mt-1">Scheduled workshop service</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Inactive / Grounded</p>
              <p className="text-2xl font-bold text-rose-400">{data.vehicles.inactive}</p>
              <p className="text-xs text-slate-500 mt-1">Fitness/permit renewal needed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
