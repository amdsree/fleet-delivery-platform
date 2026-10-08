'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Clock, UserCheck, Terminal } from 'lucide-react';
import api from '@/lib/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
          Immutable System Audit Trail
        </h2>
        <p className="text-xs text-slate-400">
          Cryptographically recorded security logs, operational state transitions, and actor audits.
        </p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-slate-800/60 font-sans text-xs">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-900/30 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 font-mono text-[11px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-slate-400 font-medium">
                    Entity: <span className="text-emerald-400">{log.entity_name}</span> ({log.entity_id})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                {log.old_values && (
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-rose-400 font-semibold block text-[10px] mb-1">
                      Before State
                    </span>
                    <pre className="text-slate-400 overflow-x-auto text-[10px]">
                      {JSON.stringify(log.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {log.new_values && (
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-semibold block text-[10px] mb-1">
                      After State
                    </span>
                    <pre className="text-slate-300 overflow-x-auto text-[10px]">
                      {JSON.stringify(log.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
