'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Navigation,
  Battery,
  Gauge,
  Clock,
  Radio,
  Search,
  CheckCircle,
  Truck,
} from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function LiveMapPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const fetchData = async () => {
    try {
      const [driverRes, locRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/locations'),
      ]);
      setDrivers(driverRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (e) {
      console.error('Failed to load map data', e);
    }
  };

  useEffect(() => {
    fetchData();

    // Initialize Leaflet Map on client
    let map: any = null;
    let L: any = null;

    import('leaflet').then((leaflet) => {
      L = leaflet.default;

      if (mapContainerRef.current && !mapInstanceRef.current) {
        map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        mapInstanceRef.current = map;
      }
    });

    const socket = getSocket();
    socket.emit('subscribe:fleet');

    socket.on('driver:location_updated', (telemetry: any) => {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === telemetry.driver_id) {
            return {
              ...d,
              current_latitude: telemetry.latitude,
              current_longitude: telemetry.longitude,
              current_speed: telemetry.speed,
              current_bearing: telemetry.bearing,
              current_accuracy: telemetry.accuracy,
              duty_status: telemetry.duty_status || d.duty_status,
              last_gps_at: new Date().toISOString(),
            };
          }
          return d;
        }),
      );

      // Update Leaflet marker dynamically
      if (mapInstanceRef.current && L) {
        const key = telemetry.driver_id;
        const latLng = [telemetry.latitude, telemetry.longitude];

        if (markersRef.current[key]) {
          markersRef.current[key].setLatLng(latLng);
        } else {
          const marker = L.circleMarker(latLng, {
            radius: 8,
            fillColor: '#10b981',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(mapInstanceRef.current);
          markersRef.current[key] = marker;
        }
      }
    });

    return () => {
      socket.off('driver:location_updated');
    };
  }, []);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            Live Fleet Tracking & Geofences
          </h2>
          <p className="text-xs text-slate-400">
            Real-time GPS coordinates with sub-second WebSocket updates.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">{drivers.length} Drivers Tracked</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Left Side: Driver Fleet List */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search drivers or vehicles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredDrivers.map((driver) => {
              const isSelected = selectedDriver?.id === driver.id;
              return (
                <div
                  key={driver.id}
                  onClick={() => {
                    setSelectedDriver(driver);
                    if (mapInstanceRef.current && driver.current_latitude && driver.current_longitude) {
                      mapInstanceRef.current.setView(
                        [driver.current_latitude, driver.current_longitude],
                        14,
                      );
                    }
                  }}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/80 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200">{driver.user?.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        driver.duty_status === 'AVAILABLE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : driver.duty_status === 'IN_TRANSIT'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {driver.duty_status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-slate-500" />
                      {driver.license_number}
                    </span>
                    <span>{driver.current_speed || 0} km/h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Map Canvas + Floating Driver Inspection Card */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Driver Inspection Card (Section 31 requirement) */}
          {selectedDriver && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-2xl z-30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedDriver.user?.name}</h4>
                  <p className="text-xs text-slate-400">License: {selectedDriver.license_number}</p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Speed</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-emerald-400" />
                    {selectedDriver.current_speed || 0} km/h
                  </span>
                </div>

                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">GPS Accuracy</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ±{selectedDriver.current_accuracy ? Math.round(selectedDriver.current_accuracy) : 10}m
                  </span>
                </div>

                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Duty State</span>
                  <span className="font-bold text-emerald-400">{selectedDriver.duty_status}</span>
                </div>

                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Last Coordinate</span>
                  <span className="font-bold text-slate-200 text-[10px] truncate">
                    {selectedDriver.current_latitude?.toFixed(4)}, {selectedDriver.current_longitude?.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {selectedDriver.last_gps_at
                    ? new Date(selectedDriver.last_gps_at).toLocaleTimeString()
                    : 'Active'}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Live Streamed
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
