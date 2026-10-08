'use client';

import React, { useEffect, useState } from 'react';
import {
  Warehouse,
  Plus,
  Mail,
  Phone,
  ShieldCheck,
  X,
  CheckCircle,
  UserCheck,
  Trash2,
  Users,
  Briefcase,
  BadgeCheck,
} from 'lucide-react';
import api from '@/lib/api';

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<'GODOWN_MANAGERS' | 'SALES_STAFF'>('GODOWN_MANAGERS');
  const [godownManagers, setGodownManagers] = useState<any[]>([]);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
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
    warehouse_name: 'Peenya Central Godown',
    territory: 'Bengaluru North & Industrial Zone',
  });

  const fetchRoles = async () => {
    try {
      const res = await api.get('/users/roles');
      setRoles(res.data.data || []);
    } catch (e) {
      console.error('Error fetching roles:', e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations?type=GODOWN');
      setGodowns(res.data.data || []);
    } catch (e) {
      console.error('Error fetching godowns:', e);
    }
  };

  const fetchStaff = async () => {
    try {
      const [gmRes, salesRes] = await Promise.all([
        api.get('/users?role=GODOWN_MANAGER'),
        api.get('/users?role=SALES_STAFF'),
      ]);
      setGodownManagers(gmRes.data.data || []);
      setSalesStaff(salesRes.data.data || []);
    } catch (e) {
      console.error('Error fetching staff users:', e);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchLocations();
    fetchStaff();
  }, []);

  const handleDeleteUser = async (id: string, name: string, roleName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${roleName} "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchStaff();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const targetRoleName = activeTab === 'GODOWN_MANAGERS' ? 'GODOWN_MANAGER' : 'SALES_STAFF';
      const matchedRole = roles.find((r) => r.name === targetRoleName);
      const role_id = matchedRole?.id || roles[0]?.id;

      await api.post('/users', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || (activeTab === 'GODOWN_MANAGERS' ? 'Manager@123' : 'Sales@123'),
        employee_code:
          formData.employee_code ||
          (activeTab === 'GODOWN_MANAGERS'
            ? `GM-${Math.floor(100 + Math.random() * 900)}`
            : `SL-${Math.floor(100 + Math.random() * 900)}`),
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
        warehouse_name: 'Peenya Central Godown',
        territory: 'Bengaluru North & Industrial Zone',
      });
      fetchStaff();
    } catch (err: any) {
      alert(`Failed to create staff member: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentList = activeTab === 'GODOWN_MANAGERS' ? godownManagers : salesStaff;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Operations Staff & Stakeholders Management
          </h2>
          <p className="text-xs text-slate-400">
            Create, assign, or delete warehouse godown managers and commercial sales representatives.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />{' '}
          {activeTab === 'GODOWN_MANAGERS' ? 'Add Godown Manager' : 'Add Sales Staff'}
        </button>
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('GODOWN_MANAGERS')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'GODOWN_MANAGERS'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Godown Managers ({godownManagers.length})
        </button>

        <button
          onClick={() => setActiveTab('SALES_STAFF')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'SALES_STAFF'
              ? 'border-sky-500 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Sales Staff ({salesStaff.length})
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentList.length === 0 ? (
          <div className="col-span-full bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
            No {activeTab === 'GODOWN_MANAGERS' ? 'Godown Managers' : 'Sales Staff'} registered yet. Click &quot;Add{' '}
            {activeTab === 'GODOWN_MANAGERS' ? 'Godown Manager' : 'Sales Staff'}&quot; to create one.
          </div>
        ) : (
          currentList.map((m) => (
            <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <UserCheck
                        className={`w-4 h-4 ${
                          activeTab === 'GODOWN_MANAGERS' ? 'text-amber-400' : 'text-sky-400'
                        }`}
                      />{' '}
                      {m.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {m.employee_code || (activeTab === 'GODOWN_MANAGERS' ? 'GM-ACTIVE' : 'SL-ACTIVE')}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeTab === 'GODOWN_MANAGERS'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-sky-950 text-sky-400 border border-sky-800'
                    }`}
                  >
                    {m.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-400 mt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-300">{m.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-300">{m.phone || '+91 98450 12345'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === 'GODOWN_MANAGERS' ? (
                      <>
                        <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-400">Assigned: Peenya Central Godown</span>
                      </>
                    ) : (
                      <>
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-400">Territory: Bengaluru Commercial Zone</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  {activeTab === 'GODOWN_MANAGERS' ? 'Godown Supervisor' : 'Sales Representative'}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteUser(
                      m.id,
                      m.name,
                      activeTab === 'GODOWN_MANAGERS' ? 'Godown Manager' : 'Sales Representative'
                    )
                  }
                  title="Delete Personnel"
                  className="p-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-400 hover:text-red-200 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Staff Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {activeTab === 'GODOWN_MANAGERS' ? (
                  <>
                    <Warehouse className="w-5 h-5 text-amber-400" /> Add Godown Manager
                  </>
                ) : (
                  <>
                    <Briefcase className="w-5 h-5 text-sky-400" /> Add Sales Representative
                  </>
                )}
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
                  placeholder={activeTab === 'GODOWN_MANAGERS' ? 'e.g., Rajesh Sharma' : 'e.g., Priya Sundaram'}
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
                  placeholder={
                    activeTab === 'GODOWN_MANAGERS'
                      ? 'rajesh.godown@fleetplatform.com'
                      : 'priya.sales@fleetplatform.com'
                  }
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
                    placeholder={activeTab === 'GODOWN_MANAGERS' ? 'GM-101' : 'SL-101'}
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {activeTab === 'GODOWN_MANAGERS' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Assigned Warehouse / Godown</label>
                  <select
                    value={formData.warehouse_name}
                    onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Peenya Central Godown">Peenya Central Godown</option>
                    <option value="Whitefield Depot">Whitefield Depot</option>
                    <option value="Electronic City Warehouse">Electronic City Warehouse</option>
                    <option value="Yeshwanthpur Rail Terminal Hub">Yeshwanthpur Rail Terminal Hub</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Assigned Sales Territory</label>
                  <select
                    value={formData.territory}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Bengaluru North & Industrial Zone">Bengaluru North & Industrial Zone</option>
                    <option value="Bengaluru South & IT Corridor">Bengaluru South & IT Corridor</option>
                    <option value="Bengaluru East (Whitefield / ORR)">Bengaluru East (Whitefield / ORR)</option>
                    <option value="Central Commercial Retail Cluster">Central Commercial Retail Cluster</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Defaults to Staff@12345"
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
                  className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-2 ${
                    activeTab === 'GODOWN_MANAGERS'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950'
                      : 'bg-sky-600 hover:bg-sky-500 shadow-sky-950'
                  }`}
                >
                  {isLoading ? 'Creating...' : `Save ${activeTab === 'GODOWN_MANAGERS' ? 'Godown Manager' : 'Sales Staff'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
