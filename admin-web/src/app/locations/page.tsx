'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  User,
  Compass,
  X,
  CheckCircle,
  Shield,
  Trash2,
  ExternalLink,
  Navigation,
  Globe,
} from 'lucide-react';
import api from '@/lib/api';

// Popular logistics hub presets for quick coordinate pinning
const LOGISTICS_PRESETS = [
  { name: 'Peenya Central Godown', lat: 13.0285, lng: 77.5195, type: 'GODOWN' },
  { name: 'Whitefield Depot', lat: 12.9698, lng: 77.7500, type: 'GODOWN' },
  { name: 'Electronic City Warehouse', lat: 12.8452, lng: 77.6602, type: 'GODOWN' },
  { name: 'Yeshwanthpur Rail Terminal Hub', lat: 13.0224, lng: 77.5503, type: 'GODOWN' },
  { name: 'Nelamangala Highway Logistics Hub', lat: 13.0968, lng: 77.3876, type: 'GODOWN' },
  { name: 'Bommasandra Industrial Yard', lat: 12.8122, lng: 77.6855, type: 'GODOWN' },
];

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    type: 'GODOWN',
    address: '',
    contact_person: '',
    phone: '',
    latitude: '13.0285',
    longitude: '77.5195',
    geofence_radius_meters: '150',
    remarks: '',
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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

  // Initialize interactive Leaflet map inside modal
  useEffect(() => {
    if (!isModalOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      import('leaflet').then((leaflet) => {
        const L = leaflet.default;

        const lat = parseFloat(formData.latitude) || 13.0285;
        const lng = parseFloat(formData.longitude) || 77.5195;

        if (!mapInstanceRef.current && mapContainerRef.current) {
          const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);

          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.bindPopup('Warehouse / Godown Pin').openPopup();

          marker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng();
            setFormData((prev) => ({
              ...prev,
              latitude: pos.lat.toFixed(6),
              longitude: pos.lng.toFixed(6),
            }));
          });

          map.on('click', (e: any) => {
            marker.setLatLng(e.latlng);
            setFormData((prev) => ({
              ...prev,
              latitude: e.latlng.lat.toFixed(6),
              longitude: e.latlng.lng.toFixed(6),
            }));
          });

          mapInstanceRef.current = map;
          markerRef.current = marker;
        }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [isModalOpen]);

  // Update marker position when inputs change manually
  const updateMapMarker = (latStr: string, lngStr: string) => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng) && mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGettingGps(false);
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        updateMapMarker(lat, lng);
      },
      (err) => {
        setIsGettingGps(false);
        alert(`Failed to retrieve GPS location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const applyPreset = (preset: (typeof LOGISTICS_PRESETS)[0]) => {
    const lat = preset.lat.toFixed(6);
    const lng = preset.lng.toFixed(6);
    setFormData((prev) => ({
      ...prev,
      name: prev.name || preset.name,
      type: preset.type,
      latitude: lat,
      longitude: lng,
    }));
    updateMapMarker(lat, lng);
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete warehouse/godown "${name}"?`)) return;
    try {
      await api.delete(`/locations/${id}`);
      fetchLocations();
    } catch (err: any) {
      alert(`Failed to delete location: ${err.response?.data?.message || err.message}`);
    }
  };

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
        type: 'GODOWN',
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Warehouses, Pickup Godowns & Geofences
          </h2>
          <p className="text-xs text-slate-400">
            Create or manage pickup godowns, central warehouses, and customer delivery points with exact GPS coordinates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Locations</option>
            <option value="GODOWN">Godowns / Warehouses</option>
            <option value="VENDOR">Vendors (Pickup)</option>
            <option value="CUSTOMER">Customers (Delivery)</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950"
          >
            <Plus className="w-4 h-4" /> Add Warehouse / Godown
          </button>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="min-w-0 pr-2">
                  <h3 className="font-bold text-slate-200 text-sm truncate">{loc.name}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{loc.address}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
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

              <div className="space-y-2 text-xs text-slate-400 mt-3">
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
                    <Compass className="w-3.5 h-3.5 text-slate-500" /> Coordinates:
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                    {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" /> Geofence Radius:
                  </span>
                  <span className="font-bold text-slate-300">{loc.geofence_radius_meters || 150}m</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <a
                href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium"
              >
                <ExternalLink className="w-3 h-3" /> View in Google Maps
              </a>

              <button
                type="button"
                onClick={() => handleDeleteLocation(loc.id, loc.name)}
                title="Delete Location"
                className="p-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-400 hover:text-red-200 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Location Modal with Interactive Map Coordinate Picker */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative my-8">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" /> Add Warehouse / Pickup Godown
                </h3>
                <p className="text-xs text-slate-400">
                  Select coordinates directly on the map or enter Google Maps coordinates.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Peenya Wholesale Godown #4"
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
                    <option value="GODOWN">GODOWN (Warehouse / Dispatch Depot)</option>
                    <option value="VENDOR">VENDOR (Supplier Pickup Point)</option>
                    <option value="CUSTOMER">CUSTOMER (Delivery Destination)</option>
                    <option value="OTHER">TRANSIT HUB (Cross-docking)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Physical Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Plot 45, Peenya 1st Stage, Near Tumkur Road, Bengaluru"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* MAP COORDINATE PICKER SECTION */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" /> Google Maps & GPS Coordinate Pin
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      disabled={isGettingGps}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 border border-slate-700 transition"
                    >
                      <Navigation className="w-3 h-3 text-emerald-400" />
                      {isGettingGps ? 'Locating...' : 'Use My GPS'}
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-[11px] flex items-center gap-1 border border-slate-700 transition"
                    >
                      <Globe className="w-3 h-3" /> Check in Google Maps
                    </a>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1.5">
                    Quick Logistic Nodes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {LOGISTICS_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded transition"
                      >
                        {p.name.split(' ')[0]} ({p.lat}, {p.lng})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Leaflet Map Canvas */}
                <div
                  ref={mapContainerRef}
                  className="w-full h-48 rounded-lg overflow-hidden border border-slate-800 shadow-inner z-0"
                  style={{ minHeight: '190px' }}
                />
                <p className="text-[10px] text-slate-500 italic">
                  💡 Click anywhere on the map or drag the marker to pin exact pickup/godown coordinates.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Latitude (Lat) *</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={formData.latitude}
                      onChange={(e) => {
                        setFormData({ ...formData, latitude: e.target.value });
                        updateMapMarker(e.target.value, formData.longitude);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Longitude (Lng) *</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={formData.longitude}
                      onChange={(e) => {
                        setFormData({ ...formData, longitude: e.target.value });
                        updateMapMarker(formData.latitude, e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Geofence Radius (m)</label>
                    <input
                      type="number"
                      value={formData.geofence_radius_meters}
                      onChange={(e) => setFormData({ ...formData, geofence_radius_meters: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contact Manager</label>
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
                  {isLoading ? 'Saving...' : 'Save Warehouse / Godown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
