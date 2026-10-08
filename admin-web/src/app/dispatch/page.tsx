'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  User,
  ArrowRight,
  PlusCircle,
  X,
  Warehouse,
  MapPin,
  Package,
} from 'lucide-react';
import api from '@/lib/api';

function DispatchContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Add Job Modal State
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [modalMode, setModalMode] = useState<'NEW_CONSIGNMENT' | 'EXISTING_ORDER'>('NEW_CONSIGNMENT');
  const [newPickupId, setNewPickupId] = useState('');
  const [newDeliveryId, setNewDeliveryId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newWeightKg, setNewWeightKg] = useState(150);
  const [newPriority, setNewPriority] = useState(2);
  const [newRemarks, setNewRemarks] = useState('');
  const [newDispatchType, setNewDispatchType] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [newDriverId, setNewDriverId] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [selectedExistingOrderId, setSelectedExistingOrderId] = useState('');

  const fetchData = async () => {
    try {
      const [orderRes, jobRes, drvRes, vehRes, locRes] = await Promise.all([
        api.get('/orders'),
        api.get('/jobs'),
        api.get('/drivers?duty_status=AVAILABLE'),
        api.get('/vehicles?status=AVAILABLE'),
        api.get('/locations'),
      ]);
      setOrders(orderRes.data.data || []);
      setJobs(jobRes.data.data || []);
      setDrivers(drvRes.data.data || []);
      setVehicles(vehRes.data.data || []);
      const locList = locRes.data.data || [];
      setLocations(locList);

      // Set sensible defaults if available
      const warehouse = locList.find((l: any) => l.type === 'WAREHOUSE');
      const customer = locList.find((l: any) => l.type === 'CUSTOMER');
      if (warehouse && !newPickupId) setNewPickupId(warehouse.id);
      if (customer && !newDeliveryId) setNewDeliveryId(customer.id);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchParams?.get('action') === 'new-job') {
      setShowAddJobModal(true);
    }
  }, [searchParams]);

  const handleAutoDispatch = async (orderId: string) => {
    setDispatching(true);
    setMessage(null);
    try {
      await api.post(`/jobs/auto-dispatch/${orderId}`);
      setMessage(`Auto-dispatch successful! Job offered to nearest qualified driver with push notification.`);
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

      setMessage('Job successfully offered to driver! Push notification sent.');
      setSelectedOrder(null);
      fetchData();
    } catch (err: any) {
      setMessage(`Assignment error: ${err.response?.data?.message || err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const handleCreateAndDispatchJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setMessage(null);

    try {
      let orderId = selectedExistingOrderId;

      if (modalMode === 'NEW_CONSIGNMENT') {
        if (!newPickupId || !newDeliveryId) {
          alert('Please select pickup and delivery locations');
          setDispatching(false);
          return;
        }

        // 1. Create Order
        const orderRes = await api.post('/orders', {
          pickup_location_id: newPickupId,
          delivery_location_id: newDeliveryId,
          priority: Number(newPriority),
          remarks: newRemarks || 'Immediate dispatch job',
          items: [
            {
              product_name: newProductName || 'General Cargo Consignment',
              quantity: Number(newQuantity),
              weight_kg: Number(newWeightKg),
              volume_m3: 0.5,
              unit: 'PCS',
            },
          ],
        });
        orderId = orderRes.data.id;
      }

      if (!orderId) {
        alert('Please select an order to dispatch');
        setDispatching(false);
        return;
      }

      // 2. Dispatch
      if (newDispatchType === 'AUTO') {
        await api.post(`/jobs/auto-dispatch/${orderId}`);
        setMessage('Job created and auto-dispatched successfully via PostGIS AI Engine!');
      } else {
        if (!newDriverId || !newVehicleId) {
          alert('Please select driver and vehicle for manual dispatch');
          setDispatching(false);
          return;
        }

        const createJobRes = await api.post('/jobs', {
          order_id: orderId,
          priority: Number(newPriority),
          stops: [
            { sequence_number: 1, location_id: newPickupId || locations[0]?.id, stop_type: 'PICKUP' },
            { sequence_number: 2, location_id: newDeliveryId || locations[1]?.id, stop_type: 'DELIVERY' },
          ],
        });

        await api.post(`/jobs/${createJobRes.data.id}/assign`, {
          driver_id: newDriverId,
          vehicle_id: newVehicleId,
        });

        setMessage('Job successfully created and assigned to selected driver!');
      }

      setShowAddJobModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setMessage(`Error creating job: ${err.response?.data?.message || err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">DRAFT</span>;
      case 'OFFERED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-400 border border-sky-800">OFFERED</span>;
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">ASSIGNED</span>;
      case 'IN_TRANSIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-400 border border-purple-800">EN ROUTE</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">COMPLETED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" />
            Jobs & Dispatch Management Board
          </h2>
          <p className="text-xs text-slate-400">
            Real-time job allocation, PostGIS proximity dispatching, and live execution status.
          </p>
        </div>

        {/* Prominent + Add Job Action */}
        <button
          onClick={() => setShowAddJobModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add New Delivery Job</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Grid: Pending Queue & Active Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pending Orders to Dispatch */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Unassigned Orders Queue
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {orders.filter((o) => o.status === 'PENDING').length} Pending
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {orders
              .filter((o) => o.status === 'PENDING')
              .map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedOrder?.id === order.id
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{order.order_number}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Priority {order.priority}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">From: {order.pickup_location?.name || 'Godown'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      <span className="truncate">To: {order.delivery_location?.name || 'Destination'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoDispatch(order.id);
                      }}
                      disabled={dispatching}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" /> Auto-Dispatch
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {order.items?.length || 1} package item(s)
                    </span>
                  </div>
                </div>
              ))}

            {orders.filter((o) => o.status === 'PENDING').length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                No unassigned orders pending dispatch.
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Column: Active Jobs & Allocation Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Manual Assignment Card */}
          {selectedOrder && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Manual Driver Assignment for {selectedOrder.order_number}
                  </h4>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleManualAssign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Select Available Driver
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    required
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name || d.id} (Rating: {d.rating}★)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Select Available Vehicle
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    required
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number} - {v.make} {v.model} ({v.payload_capacity_kg}kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dispatching}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <span>Confirm Assignment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active Dispatch Jobs List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" /> Active Fleet Jobs Roster
              </h3>
              <span className="text-xs text-slate-400">{jobs.length} Total Jobs Tracked</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Job Number</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Route Stops</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {job.job_number}
                      </td>
                      <td className="p-3">{getStatusBadge(job.status)}</td>
                      <td className="p-3 text-slate-200">
                        {job.assigned_driver?.user?.name || (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300">
                        {job.assigned_vehicle?.plate_number || '—'}
                      </td>
                      <td className="p-3 text-slate-300">
                        {job.stops?.length || 2} stops
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}

                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No active jobs in dispatch. Click <b>+ Add New Delivery Job</b> to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE & DISPATCH JOB MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-400" /> Create & Dispatch Delivery Job
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authorized for SuperAdmin, Godown Managers, and Sales Staff.
                </p>
              </div>
              <button
                onClick={() => setShowAddJobModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setModalMode('NEW_CONSIGNMENT')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  modalMode === 'NEW_CONSIGNMENT'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. New Consignment Job
              </button>
              <button
                type="button"
                onClick={() => setModalMode('EXISTING_ORDER')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  modalMode === 'EXISTING_ORDER'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Select Pending Order
              </button>
            </div>

            <form onSubmit={handleCreateAndDispatchJob} className="space-y-4">
              {modalMode === 'NEW_CONSIGNMENT' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Pickup Location (Godown / Warehouse)
                      </label>
                      <select
                        value={newPickupId}
                        onChange={(e) => setNewPickupId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                        required
                      >
                        <option value="">-- Choose Pickup Godown --</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Delivery Destination (Customer / Depot)
                      </label>
                      <select
                        value={newDeliveryId}
                        onChange={(e) => setNewDeliveryId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                        required
                      >
                        <option value="">-- Choose Delivery Location --</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Consignment Description
                      </label>
                      <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="e.g. FMCG Retail Stock"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Total Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newWeightKg}
                        onChange={(e) => setNewWeightKg(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Job Priority
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                      >
                        <option value={1}>1 - Normal Service</option>
                        <option value={2}>2 - High Priority</option>
                        <option value={3}>3 - Critical / Same Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Dispatch Notes
                      </label>
                      <input
                        type="text"
                        value={newRemarks}
                        onChange={(e) => setNewRemarks(e.target.value)}
                        placeholder="e.g. Dock 4 pickup, inspect seal"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Pending Order to Dispatch
                  </label>
                  <select
                    value={selectedExistingOrderId}
                    onChange={(e) => setSelectedExistingOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    required
                  >
                    <option value="">-- Choose Order from Queue --</option>
                    {orders
                      .filter((o) => o.status === 'PENDING')
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.order_number} ({o.pickup_location?.name} → {o.delivery_location?.name})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Allocation Strategy */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Driver & Vehicle Allocation Strategy
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewDispatchType('AUTO')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newDispatchType === 'AUTO'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Zap className="w-4 h-4" /> AI Auto-Dispatch
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PostGIS calculates nearest available driver & suitable vehicle payload.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDispatchType('MANUAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newDispatchType === 'MANUAL'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <User className="w-4 h-4" /> Manual Assignment
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Directly choose driver and vehicle from active roster.
                    </p>
                  </button>
                </div>

                {newDispatchType === 'MANUAL' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Assign Driver</label>
                      <select
                        value={newDriverId}
                        onChange={(e) => setNewDriverId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        required
                      >
                        <option value="">-- Choose Driver --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.user?.name || d.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Assign Vehicle</label>
                      <select
                        value={newVehicleId}
                        onChange={(e) => setNewVehicleId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        required
                      >
                        <option value="">-- Choose Vehicle --</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate_number} ({v.make})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/60 disabled:opacity-50"
                >
                  {dispatching ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Broadcast Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispatchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400 text-sm">Loading Dispatch Board...</div>}>
      <DispatchContent />
    </Suspense>
  );
}
