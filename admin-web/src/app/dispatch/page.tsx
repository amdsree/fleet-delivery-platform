'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  User,
  ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';

export default function DispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [orderRes, jobRes, drvRes, vehRes] = await Promise.all([
        api.get('/orders'),
        api.get('/jobs'),
        api.get('/drivers?duty_status=AVAILABLE'),
        api.get('/vehicles?status=AVAILABLE'),
      ]);
      setOrders(orderRes.data.data || []);
      setJobs(jobRes.data.data || []);
      setDrivers(drvRes.data.data || []);
      setVehicles(vehRes.data.data || []);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAutoDispatch = async (orderId: string) => {
    setDispatching(true);
    setMessage(null);
    try {
      const res = await api.post(`/jobs/auto-dispatch/${orderId}`);
      setMessage(`Auto-dispatch successful! Job offered to driver.`);
      fetchData();
    } catch (err: any) {
      setMessage(`Dispatch Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedDriverId || !selectedVehicleId) return;

    setDispatching(true);
    setMessage(null);
    try {
      // Find or create Job
      const existingJob = jobs.find((j) => j.order_id === selectedOrder.id && j.status === 'DRAFT');
      let targetJobId = existingJob?.id;

      if (!targetJobId) {
        const createJobRes = await api.post('/jobs', {
          order_id: selectedOrder.id,
          priority: selectedOrder.priority,
          stops: [
            { sequence_number: 1, location_id: selectedOrder.pickup_location_id, stop_type: 'PICKUP' },
            { sequence_number: 2, location_id: selectedOrder.delivery_location_id, stop_type: 'DELIVERY' },
          ],
        });
        targetJobId = createJobRes.data.id;
      }

      await api.post(`/jobs/${targetJobId}/assign`, {
        driver_id: selectedDriverId,
        vehicle_id: selectedVehicleId,
      });

      setMessage('Job successfully offered to candidate driver!');
      setSelectedOrder(null);
      fetchData();
    } catch (err: any) {
      setMessage(`Assignment error: ${err.response?.data?.message || err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" />
            Dispatch & Fleet Allocation Board
          </h2>
          <p className="text-xs text-slate-400">
            PostGIS proximity matching, vehicle payload eligibility, and dispatch queue.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Orders awaiting dispatch */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-white text-sm">Orders Awaiting Dispatch</h3>
            <span className="text-xs text-slate-400">{orders.length} Orders in Pipeline</span>
          </div>

          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`p-4 rounded-xl border transition-all ${
                  selectedOrder?.id === order.id
                    ? 'bg-slate-900 border-emerald-500 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm">{order.order_number}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      {order.order_status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">P{order.priority}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAutoDispatch(order.id)}
                      disabled={dispatching}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Auto Dispatch
                    </button>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Manual Match
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Cargo Weight</span>
                    <span className="font-medium text-slate-300">{order.total_weight_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Cargo Volume</span>
                    <span className="font-medium text-slate-300">{order.total_volume_m3} m³</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pickup Location</span>
                    <span className="font-medium text-slate-300 truncate block">
                      {order.pickup_location?.name || 'Central Godown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Delivery Location</span>
                    <span className="font-medium text-slate-300 truncate block">
                      {order.delivery_location?.name || 'Customer Store'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Manual Assignment Form & Available Pool */}
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-3">
              Manual Dispatch Matcher
            </h3>

            {selectedOrder ? (
              <form onSubmit={handleManualAssign} className="space-y-4 text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <p className="font-bold text-slate-200">{selectedOrder.order_number}</p>
                  <p className="text-slate-400">
                    Load: {selectedOrder.total_weight_kg} kg | Vol: {selectedOrder.total_volume_m3} m³
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Select Available Driver</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name} ({d.license_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Select Eligible Vehicle</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.model} (Max: {v.payload_capacity_kg}kg)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={dispatching}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-md disabled:opacity-50"
                >
                  Confirm & Offer Job
                </button>
              </form>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                Select an order from the list to assign driver and vehicle manually.
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <h4 className="font-semibold text-white text-xs mb-3">Available Driver Pool</h4>
            <div className="space-y-2">
              {drivers.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded bg-slate-900/60 text-xs">
                  <span className="text-slate-300 font-medium">{d.user?.name}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">AVAILABLE</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
