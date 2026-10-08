'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Wrench, ShieldCheck, Plus, Gauge, X, CheckCircle, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    registration_number: '',
    vehicle_type: 'SMALL_VAN',
    manufacturer: 'Tata Motors',
    model: 'Ace Gold',
    year: '2024',
    fuel_type: 'DIESEL',
    payload_capacity_kg: '750',
    volume_capacity_m3: '4.2',
  });

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleStatusChange = async (vehicleId: string, newStatus: string) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/status`, { status: newStatus });
      fetchVehicles();
    } catch (err: any) {
      alert(`Vehicle status error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, regNo: string) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${regNo}?`)) return;
    try {
      await api.delete(`/vehicles/${vehicleId}`);
      fetchVehicles();
    } catch (err: any) {
      alert(`Failed to delete vehicle: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/vehicles', {
        registration_number: formData.registration_number,
        vehicle_type: formData.vehicle_type,
        manufacturer: formData.manufacturer,
        model: formData.model,
        year: parseInt(formData.year, 10) || 2024,
        fuel_type: formData.fuel_type,
        payload_capacity_kg: parseFloat(formData.payload_capacity_kg),
        volume_capacity_m3: parseFloat(formData.volume_capacity_m3),
      });

      setIsModalOpen(false);
      setFormData({
        registration_number: '',
        vehicle_type: 'SMALL_VAN',
        manufacturer: 'Tata Motors',
        model: 'Ace Gold',
        year: '2024',
        fuel_type: 'DIESEL',
        payload_capacity_kg: '750',
        volume_capacity_m3: '4.2',
      });
      fetchVehicles();
    } catch (err: any) {
      alert(`Failed to add vehicle: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            Vehicle Fleet Registry & Capacities
          </h2>
          <p className="text-xs text-slate-400">
            Monitor payload thresholds, volume limits, maintenance schedules, and assignments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-200 text-sm font-mono">{v.registration_number}</h3>
                <p className="text-xs text-slate-400">
                  {v.manufacturer} {v.model} ({v.vehicle_type})
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  v.status === 'AVAILABLE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : v.status === 'MAINTENANCE'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-blue-950 text-blue-400 border border-blue-800'
                }`}
              >
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Payload Capacity</span>
                <span className="font-bold text-slate-200">{v.payload_capacity_kg} kg</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Volume Capacity</span>
                <span className="font-bold text-slate-200">{v.volume_capacity_m3} m³</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Fuel / Year</span>
                <span className="font-bold text-slate-200">{v.fuel_type || 'DIESEL'} ({v.year || 2023})</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Odometer</span>
                <span className="font-bold text-slate-200">{v.current_odometer || 0} km</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-500 mb-1">Update Status</label>
                <select
                  value={v.status}
                  onChange={(e) => handleStatusChange(v.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_TRIP">IN_TRIP</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteVehicle(v.id, v.registration_number)}
                title="Delete Vehicle"
                className="mt-4 p-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-400 hover:text-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" /> Add Fleet Vehicle
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Registration / Plate Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., KA-04-AB-5678"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Type *</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SMALL_VAN">Small Van (Tata Ace)</option>
                    <option value="MEDIUM_TRUCK">Medium Truck (14ft / 407)</option>
                    <option value="HEAVY_TRUCK">Heavy Truck (Eicher / 6W)</option>
                    <option value="ELECTRIC_3W">Electric 3W (Piaggio/Mahindra)</option>
                    <option value="TWO_WHEELER">Two Wheeler (Bike)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Fuel Type</label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                    <option value="PETROL">Petrol</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Tata Motors"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Ace Gold"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payload (kg) *</label>
                  <input
                    type="number"
                    required
                    value={formData.payload_capacity_kg}
                    onChange={(e) => setFormData({ ...formData, payload_capacity_kg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Volume (m³) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.volume_capacity_m3}
                    onChange={(e) => setFormData({ ...formData, volume_capacity_m3: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
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
                  {isLoading ? 'Creating...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
