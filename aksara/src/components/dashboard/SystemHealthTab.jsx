import React, { useState, useEffect } from 'react';
import { Server, Cpu, Database, HardDrive, Network, RefreshCw, CheckCircle2, Eye } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import StorageDrillDownModal from '../modals/StorageDrillDownModal';

const uptimeData = [
  { name: 'Uptime', value: 100 },
  { name: 'Downtime', value: 0 },
];
const donutColors = ['#00FF66', '#1A231E'];

export default function SystemHealthTab() {
  const [healthStatus, setHealthStatus] = useState({
    status: 'ok',
    database: 'connected',
    latency_ms: 12
  });
  const [loading, setLoading] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health/health');
      setHealthStatus(res.data || { status: 'ok', database: 'connected', latency_ms: 15 });
    } catch (err) {
      console.error("Health check error:", err);
      setHealthStatus({ status: 'error', database: 'disconnected', latency_ms: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            System Health & Health Check Real-time
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Pemantauan langsung status server FastAPI &amp; SQLite Database via API.
          </p>
        </div>
        <button 
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1C20] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Donut Chart */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col transition-colors">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-6">Overall System Uptime</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={uptimeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    stroke="none"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {uptimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: '#1A231E', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#00FF66' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">100%</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Uptime</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 dark:bg-[#1A231E] rounded-2xl border border-emerald-500/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#00FF66] uppercase">System Status (Live API)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-[#00FF66]">
                  {healthStatus.status === 'ok' ? 'All Systems Operational' : 'System Degraded'}
                </span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-[#00FF66]/20 flex items-center justify-center animate-pulse">
              <div className="h-3 w-3 rounded-full bg-[#00FF66]"></div>
            </div>
          </div>
        </div>

        {/* Node Metrics Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          <div className="sm:col-span-2 bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Database Connection Status</h3>
                <p className="text-xs text-gray-400 mt-0.5">Koneksi database &amp; kapasitas storage</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsStorageModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Lihat Storage
                </button>
                <div className="p-2.5 rounded-xl border bg-emerald-100 dark:bg-[#10B981]/10 border-emerald-200 dark:border-[#10B981]/20 text-emerald-700 dark:text-[#00FF66]">
                  <Database className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">
                {healthStatus.database || 'CONNECTED'}
              </p>
              <p className="text-xs text-emerald-500 mt-2 font-medium">SQLite Async Engine (SQLAlchemy 2.0) Active</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Backend API Endpoint</h3>
              <div className="p-2.5 rounded-xl border bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
                <Server className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">FastAPI</p>
              <p className="text-xs text-gray-500 mt-2">Uvicorn Server Running on :8000</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Network Latency Real-time</h3>
              <div className="p-2.5 rounded-xl border bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400">
                <Network className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {healthStatus.latency_ms || 12}<span className="text-lg text-gray-400 ml-1">ms</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">Response time to localhost server</p>
            </div>
          </div>

        </div>

      </div>

      {/* Modal Storage Drill Down */}
      <StorageDrillDownModal 
        isOpen={isStorageModalOpen} 
        onClose={() => setIsStorageModalOpen(false)} 
      />
    </div>
  );
}