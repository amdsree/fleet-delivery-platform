'use client';

import React from 'react';
import { Download, ShieldCheck, Smartphone, CheckCircle, AlertTriangle, QrCode } from 'lucide-react';

export default function DriverAppDownloadPage() {
  const downloadUrl = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/distribution/download-apk`
    : '/downloads/fleet-driver.apk';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Enterprise Fleet Release
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Fleet Driver Android App
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
            Official in-house enterprise logistics and real-time GPS tracking application for authorized fleet drivers.
          </p>
        </div>

        {/* Download Action Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Latest Build</span>
                <h2 className="text-2xl font-bold text-white mt-1">Version 1.0.0 (Build 1)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Package: <code className="text-slate-300 font-mono">com.fleet.delivery</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block">File Size</span>
                  <span className="font-semibold text-white">12.4 MB</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block">Min Android</span>
                  <span className="font-semibold text-white">Android 8.0+ (API 26+)</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block">Signing Status</span>
                  <span className="font-semibold text-emerald-400">Enterprise RSA-2048</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block">Sync Protocol</span>
                  <span className="font-semibold text-sky-400">Adaptive Foreground GPS</span>
                </div>
              </div>

              <a
                href={downloadUrl}
                download="fleet-driver-v1.0.0.apk"
                className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-all shadow-lg shadow-emerald-900/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Download className="w-5 h-5" /> Download APK (v1.0.0)
              </a>
            </div>

            {/* QR Code Card for Depot/Godown Dispatch Desks */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center space-y-4">
              <div className="p-3 bg-white rounded-xl shadow-md">
                {/* SVG QR Code Simulation */}
                <div className="w-40 h-40 flex flex-col items-center justify-center border-4 border-slate-900 rounded-lg p-2 bg-white text-slate-900">
                  <QrCode className="w-28 h-28 text-slate-950" />
                  <span className="text-[9px] font-mono font-bold tracking-tight text-slate-700 mt-1">SCAN TO INSTALL</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">Scan at Dispatch Counter</p>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Point any phone camera to download directly onto the driver handheld device.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Installation Guide */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" /> Driver Installation & Setup Guide
          </h3>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/20">
                1
              </div>
              <h4 className="text-sm font-semibold text-white">Download APK</h4>
              <p className="text-xs text-slate-400">
                Tap the download button above on your Android phone or scan the QR code.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/20">
                2
              </div>
              <h4 className="text-sm font-semibold text-white">Allow Install</h4>
              <p className="text-xs text-slate-400">
                If prompted with <em>&quot;Install unknown apps&quot;</em>, tap <strong>Settings</strong> and enable <strong>Allow from this source</strong>.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/20">
                3
              </div>
              <h4 className="text-sm font-semibold text-white">Enable GPS</h4>
              <p className="text-xs text-slate-400">
                Open Fleet Delivery and grant <strong>Location Permission</strong> (&quot;All the time&quot; or &quot;While using the app&quot;).
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/20">
                4
              </div>
              <h4 className="text-sm font-semibold text-white">Switch ON DUTY</h4>
              <p className="text-xs text-slate-400">
                Toggle the shift switch to <strong>ON DUTY</strong> to start receiving automated dispatch offers.
              </p>
            </div>
          </div>
        </div>

        {/* Enterprise MDM / IT Policy Notice */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex items-start gap-3 text-xs text-slate-400">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">Enterprise MDM / IT Administrators Note</p>
            <p>
              For automated bulk enrollment across company-owned devices, upload this signed APK into your Mobile Device Management (MDM) console (Google Endpoint Management, Microsoft Intune, Samsung Knox, or SOTI MobiControl) under <strong>Private LOB (Line-of-Business) Applications</strong>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
