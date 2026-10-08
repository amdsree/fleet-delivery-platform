'use client';

import React, { useEffect, useState } from 'react';
import { Warehouse, Plus, Mail, Phone, ShieldCheck, X, CheckCircle, UserCheck } from 'lucide-react';
import api from '@/lib/api';

export default function GodownManagersPage() {
  const [managers, setManagers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_code: '',
    password: '',
    warehouse_name: 'Central Warehouse Yeshwanthpur',
  });

  const fetchRoles = async () => {
    try {
      const res = await api.get('/users/roles');
      setRoles(res.data.data || []);
    } catch (e) {
      console.error('Error fetching roles:', e);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/users?role=GODOWN_MANAGER');
      setManagers(res.data.data || []);
    } catch (e) {
      console.error('Error fetching managers:', e);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const gmRole = roles.find((r) => r.name === 'GODOWN_MANAGER');
      const role_id = gmRole?.id || roles[0]?.id;

      await api.post('/users', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || 'Manager@123',
        employee_code: formData.employee_code || `GM-${Math.floor(100 + Math.random() * 900)}`,
        role_id,
        status: 'ACTIVE',
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        employee_code: '',
        password: '',
        warehouse_name: 'Central Warehouse Yeshwanthpur',
      });
      fetchManagers();
    } catch (err: any) {
      alert(`Failed to add Godown Manager: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-400" />
            Godown Managers & Warehouse Supervisors
          </h2>
          <p className="text-xs text-slate-400">
            Manage warehouse supervisors responsible for inventory, dispatch allocation, and driver check-in.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" /> Add Godown Manager
        </button>
      </div>

      {/* Managers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {managers.length === 0 ? (
          <div className="col-span-full bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
            No Godown Managers registered yet. Click &quot;Add Godown Manager&quot; to create one.
          </div>
        ) : (
          managers.map((m) => (
            <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" /> {m.name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {m.employee_code || 'GM-ASSIGNED'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {m.status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{m.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{m.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">Hub: Central Godown Facility</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Role: GODOWN_MANAGER</span>
                <span>Active Shift</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Godown Manager Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-emerald-400" /> Add Godown Manager
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rajesh Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="rajesh.godown@fleet.internal"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Employee Code</label>
                  <input
                    type="text"
                    placeholder="GM-101"
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Assigned Warehouse Depot</label>
                <select
                  value={formData.warehouse_name}
                  onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Central Warehouse Yeshwanthpur">Central Warehouse (Yeshwanthpur)</option>
                  <option value="Peenya Depot Suburb">Peenya Industrial Depot</option>
                  <option value="Whitefield Logistics Hub">Whitefield Logistics Hub</option>
                  <option value="Electronic City Storage">Electronic City Godown</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Initial Password</label>
                <input
                  type="password"
                  placeholder="Defaults to Manager@123"
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
                  {isLoading ? 'Creating...' : 'Save Godown Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
