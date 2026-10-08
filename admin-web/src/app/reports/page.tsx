'use client';

import React, { useEffect, useState } from 'react';
import { FileBarChart, Download, Users, Truck, Clock } from 'lucide-react';
import api from '@/lib/api';

export default function ReportsPage() {
  const [driverReports, setDriverReports] = useState<any[]>([]);
  const [vehicleReports, setVehicleReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles'>('drivers');

  const fetchReports = async () => {
    try {
      const [drvRes, vehRes] = await Promise.all([
        api.get('/reports/drivers'),
        api.get('/reports/vehicles'),
      ]);
      setDriverReports(drvRes.data || []);
      setVehicleReports(vehRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const downloadCsv = (type: 'drivers' | 'vehicles') => {
    const url = `http://localhost:4000/api/v1/reports/${type}?format=csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-emerald-400" />
            Operational Reports & Export Center
          </h2>
          <p className="text-xs text-slate-400">
            Validated mileage, driver delivery times, and vehicle utilization records.
          </p>
        </div>

        <button
          onClick={() => downloadCsv(activeTab)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-colors"
        >
          <Download className="w-4 h-4" />
          Export {activeTab === 'drivers' ? 'Driver' : 'Vehicle'} CSV
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'drivers'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Driver Performance
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'vehicles'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          Vehicle Fleet Analytics
        </button>
      </div>

      {activeTab === 'drivers' ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Driver Name</th>
                <th className="py-3 px-4">License</th>
                <th className="py-3 px-4">Completed Jobs</th>
                <th className="py-3 px-4">Rejections</th>
                <th className="py-3 px-4">Validated KM</th>
                <th className="py-3 px-4">Avg Delivery Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {driverReports.map((d) => (
                <tr key={d.driver_id} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-bold text-slate-200">{d.driver_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{d.license_number}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{d.jobs_completed}</td>
                  <td className="py-3 px-4 text-amber-400">{d.jobs_rejected}</td>
                  <td className="py-3 px-4">{d.total_validated_km} km</td>
                  <td className="py-3 px-4">{Math.round(d.avg_delivery_time_mins)} mins</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4">Model & Type</th>
                <th className="py-3 px-4">Payload Limit</th>
                <th className="py-3 px-4">Total Trips</th>
                <th className="py-3 px-4">Cumulative KM</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {vehicleReports.map((v) => (
                <tr key={v.vehicle_id} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-bold text-slate-200">{v.registration_number}</td>
                  <td className="py-3 px-4">
                    {v.manufacturer} {v.model} ({v.vehicle_type})
                  </td>
                  <td className="py-3 px-4">{v.payload_capacity_kg} kg</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">{v.total_trips}</td>
                  <td className="py-3 px-4">{v.total_trip_distance_km} km</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
