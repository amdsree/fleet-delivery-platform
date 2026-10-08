'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Plus, MapPin, Phone, User, Compass, X, CheckCircle, Shield } from 'lucide-react';
import api from '@/lib/api';

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    type: 'VENDOR',
    address: '',
    contact_person: '',
    phone: '',
    latitude: '13.0285',
    longitude: '77.5195',
    geofence_radius_meters: '150',
    remarks: '',
  });

  const fetchLocations = async () => {
    try {
      const url = filterType === 'ALL' ? '/locations' : `/locations?type=${filterType}`;
      const res = await api.get(url);
      setLocations(res.data.data || []);
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/locations', {
        name: formData.name,
        type: formData.type,
        address: formData.address,
        contact_person: formData.contact_person,
        phone: formData.phone,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        geofence_radius_meters: parseInt(formData.geofence_radius_meters, 10) || 150,
        remarks: formData.remarks,
        active: true,
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'VENDOR',
        address: '',
        contact_person: '',
        phone: '',
        latitude: '13.0285',
        longitude: '77.5195',
        geofence_radius_meters: '150',
        remarks: '',
      });
      fetchLocations();
    } catch (err: any) {
      alert(`Failed to add location: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Operational Locations & Geofence Boundaries
          </h2>
          <p className="text-xs text-slate-400">
            Godowns, Vendor pickup points, and Customer delivery locations with GIS coordinates and geofences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Location Types</option>
            <option value="GODOWN">Godowns / Warehouses</option>
            <option value="VENDOR">Vendors (Pickup)</option>
            <option value="CUSTOMER">Customers (Delivery)</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950"
          >
            <Plus className="w-4 h-4" /> Add Location
          </button>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">{loc.name}</h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{loc.address}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  loc.type === 'GODOWN'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : loc.type === 'VENDOR'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {loc.type}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Contact:
                </span>
                <span className="text-slate-200">{loc.contact_person || 'Logistics Desk'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone:
                </span>
                <span className="text-slate-200">{loc.phone || '+91 80 2345 6789'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-500" /> PostGIS Point:
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" /> Geofence Radius:
                </span>
                <span className="font-bold text-emerald-400">{loc.geofence_radius_meters || 150}m</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-500">
              <span>Status: {loc.active ? 'ACTIVE' : 'INACTIVE'}</span>
              <span className="text-emerald-400 font-semibold">GIS Auto-Arrival Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" /> Add Operational Location
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Peenya Wholesale Depot"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Location Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GODOWN">GODOWN (Warehouse)</option>
                    <option value="VENDOR">VENDOR (Pickup Point)</option>
                    <option value="CUSTOMER">CUSTOMER (Delivery Point)</option>
                    <option value="OTHER">OTHER (Transit Hub)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Physical Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Plot 45, Peenya Industrial Area Phase 1, Bangalore"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g., Ramesh Kumar"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98450 99887"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Geofence (m)</label>
                  <input
                    type="number"
                    value={formData.geofence_radius_meters}
                    onChange={(e) => setFormData({ ...formData, geofence_radius_meters: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
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
                  {isLoading ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
