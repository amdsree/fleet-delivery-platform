'use client';

import React, { useEffect, useState } from 'react';
import {
  PackageCheck,
  Plus,
  History,
  FileText,
  MapPin,
  Calendar,
  X,
} from 'lucide-react';
import api from '@/lib/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderForVersion, setSelectedOrderForVersion] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  // Create form state
  const [pickupId, setPickupId] = useState('');
  const [deliveryId, setDeliveryId] = useState('');
  const [priority, setPriority] = useState(2);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [weightKg, setWeightKg] = useState(100);
  const [volumeM3, setVolumeM3] = useState(0.5);
  const [remarks, setRemarks] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data || []);
    } catch (e) {
      console.error('Error fetching orders:', e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data.data || []);
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchLocations();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        pickup_location_id: pickupId,
        delivery_location_id: deliveryId,
        priority: Number(priority),
        remarks,
        items: [
          {
            product_name: productName,
            quantity: Number(quantity),
            weight_kg: Number(weightKg),
            volume_m3: Number(volumeM3),
            unit: 'PCS',
          },
        ],
      });
      setShowCreateModal(false);
      fetchOrders();
    } catch (err: any) {
      alert(`Error creating order: ${err.response?.data?.message || err.message}`);
    }
  };

  const inspectVersions = async (orderId: string) => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setSelectedOrderForVersion(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            Order Management & Version Audit
          </h2>
          <p className="text-xs text-slate-400">
            Track order lifecycles, cargo weights, item quantities, and immutable change histories.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Cargo Load</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-200">{o.order_number}</span>
                    <span className="block text-[10px] text-slate-500">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-emerald-400">
                      {o.order_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-300 block font-medium">
                      {o.pickup_location?.name || 'Pickup Godown'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      &rarr; {o.delivery_location?.name || 'Customer'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span>{o.total_weight_kg} kg</span>
                    <span className="text-slate-500 block text-[10px]">
                      {o.total_quantity} items ({o.total_volume_m3} m³)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400">v{o.current_version}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {o.status === 'PENDING' && (
                      <a
                        href="/dispatch"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-[11px] font-semibold transition-colors mr-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Dispatch Job
                      </a>
                    )}
                    <button
                      onClick={() => inspectVersions(o.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      <History className="w-3.5 h-3.5 text-emerald-400" />
                      Version Trail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Version Audit Modal */}
      {selectedOrderForVersion && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Immutable Version Audit Trail: {selectedOrderForVersion.order_number}
                </h3>
                <p className="text-xs text-slate-400">Current Version: v{selectedOrderForVersion.current_version}</p>
              </div>
              <button
                onClick={() => setSelectedOrderForVersion(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedOrderForVersion.versions?.map((ver: any) => (
                <div key={ver.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">Version #{ver.version}</span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(ver.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium">Reason: {ver.change_reason}</p>
                  <pre className="text-[10px] bg-slate-900 p-2 rounded overflow-x-auto text-slate-400">
                    {JSON.stringify(ver.snapshot, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Create New Delivery Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Pickup Location</label>
                <select
                  value={pickupId}
                  onChange={(e) => setPickupId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Select Pickup Location --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Delivery Location</label>
                <select
                  value={deliveryId}
                  onChange={(e) => setDeliveryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Select Delivery Location --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Packaged Rice 25kg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={volumeM3}
                    onChange={(e) => setVolumeM3(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 - Low</option>
                    <option value={2}>2 - Normal</option>
                    <option value={3}>3 - High</option>
                    <option value={4}>4 - Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Special loading instructions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition-colors"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
