'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  Radio,
  MapPin,
  Truck,
  PackageCheck,
  CheckCircle2,
  Flag,
  X,
  Check,
  LogOut,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  payload?: any;
}

export default function Header() {
  const [onlineAlert, setOnlineAlert] = useState<{ title: string; message: string; type?: string } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fleet_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fleet_token');
      localStorage.removeItem('fleet_user');
      window.location.href = '/login';
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.data) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Ignore background fetch failure if not logged in
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    const handleAlert = (data: any) => {
      setOnlineAlert({
        title: data.title,
        message: data.message,
        type: data.type || data.event,
      });

      // Increment badge and refresh list
      setUnreadCount((prev) => prev + 1);
      fetchNotifications();

      // Dismiss banner after 7 seconds
      setTimeout(() => {
        setOnlineAlert((current) => (current?.title === data.title ? null : current));
      }, 7000);
    };

    socket.on('fleet:alert', handleAlert);

    return () => {
      socket.off('fleet:alert', handleAlert);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'JOB_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-400 border border-sky-800">
            <Truck className="w-3 h-3" /> Assigned
          </span>
        );
      case 'LOCATION_REACHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            <MapPin className="w-3 h-3" /> Arrived
          </span>
        );
      case 'MATERIAL_COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-400 border border-purple-800">
            <PackageCheck className="w-3 h-3" /> Picked Up
          </span>
        );
      case 'MATERIAL_DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'JOB_FINISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800">
            <Flag className="w-3 h-3" /> Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
            Alert
          </span>
        );
    }
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400">
          <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
          Realtime Telemetry Stream
        </span>

        {/* Live Floating Alert Toast */}
        {onlineAlert && (
          <div className="flex items-center gap-2 text-xs bg-amber-950/90 border border-amber-700/80 text-amber-200 px-3.5 py-1.5 rounded-lg shadow-lg shadow-amber-950/40 animate-fade-in">
            {getEventBadge(onlineAlert.type || '')}
            <span className="font-semibold text-white">{onlineAlert.title}:</span>
            <span className="truncate max-w-md">{onlineAlert.message}</span>
            <button
              onClick={() => setOnlineAlert(null)}
              className="text-amber-400 hover:text-white ml-2 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        {/* Push Notification Bell */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 relative transition-colors"
          title="Push Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Popover Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-12 w-96 max-h-[500px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-100">Push Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-950/80 border border-red-800 text-red-400 rounded-full font-medium">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No notifications recorded yet.
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                    className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-800/40 flex items-start gap-3 ${
                      !item.is_read ? 'bg-slate-800/20' : ''
                    }`}
                  >
                    <div className="mt-0.5">{getEventBadge(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${!item.is_read ? 'text-white' : 'text-slate-300'}`}>
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1.5 block">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
            {currentUser?.role === 'ADMIN' ? 'ED' : (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ED')}
          </div>
          <div className="text-left text-xs hidden sm:block">
            <p className="font-semibold text-slate-200">{currentUser?.role === 'ADMIN' ? 'Edwin' : (currentUser?.name || 'Edwin')}</p>
            <p className="text-slate-500 capitalize">{currentUser?.role?.replace('_', ' ') || 'Super Administrator'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors ml-1"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
