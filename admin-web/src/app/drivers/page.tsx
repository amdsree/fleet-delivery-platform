'use client';

import React, { useEffect, useState } from 'react';
import { Users, Truck, Phone, Shield, CheckCircle, Plus, X } from 'lucide-react';
import api from '@/lib/api';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: '',
    emergency_contact: '',
    password: '',
  });

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleStatusChange = async (driverId: string, newStatus: string) => {
    try {
      await api.patch(`/drivers/${driverId}/duty-status`, { duty_status: newStatus });
      fetchDrivers();
    } catch (err: any) {
      alert(`Status update error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/drivers', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        license_number: formData.license_number,
        license_expiry: formData.license_expiry || undefined,
        emergency_contact: formData.emergency_contact || undefined,
        password: formData.password || 'Driver@123',
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        license_number: '',
        license_expiry: '',
        emergency_contact: '',
        password: '',
      });
      fetchDrivers();
    } catch (err: any) {
      alert(`Failed to add driver: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Driver Roster & Operational Duty
          </h2>
          <p className="text-xs text-slate-400">
            Manage driver profiles, licenses, live coordinates, and duty statuses.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((d) => (
          <div key={d.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">{d.user?.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {d.user?.phone}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  d.duty_status === 'AVAILABLE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : d.duty_status === 'BUSY' || d.duty_status === 'IN_TRANSIT'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}
              >
                {d.duty_status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>License:</span>
                <span className="font-mono text-slate-200">{d.license_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Coordinates:</span>
                <span className="font-mono text-slate-200">
                  {d.current_latitude?.toFixed(4)}, {d.current_longitude?.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Current Speed:</span>
                <span className="text-slate-200">{d.current_speed || 0} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>Emergency Contact:</span>
                <span className="text-slate-200">{d.emergency_contact || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span>Consecutive Rejections:</span>
                <span className="text-slate-200">{d.consecutive_rejections || 0}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[10px] text-slate-500 mb-1">Set Duty Status (Admin Override)</label>
              <select
                value={d.duty_status}
                onChange={(e) => handleStatusChange(d.id, e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="BREAK">BREAK</option>
                <option value="OFF_DUTY">OFF_DUTY</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Add Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Add Driver to Fleet
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kiran Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 11223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    placeholder="+91 98450 99887"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="KA04-20210009876"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Driver App Login Password</label>
                <input
                  type="password"
                  placeholder="Defaults to Driver@123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 flex items-center gap-2"
                >
                  {isLoading ? 'Creating...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
