import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import MonitoringTab from './MonitoringTab';
import TokenTab from './TokenTab';
import AIConfigTab from './AIConfigTab';
import api from '../../services/api';

export default function SystemDashboard() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const tabs = [
    { id: 'monitoring', label: 'Monitoring & Audit' },
    { id: 'token', label: 'Penggunaan Token' },
    { id: 'config', label: 'Konfigurasi AI' },
  ];

  // ====== LOAD TENANTS ======
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const res = await api.get('/tenants');
        const list = res.data?.data || res.data || [];
        setTenants(list);
        if (list.length > 0) {
          setSelectedTenantId(list[0].id);
        }
      } catch (err) {
        console.error("Gagal load tenants:", err);
      }
    };
    loadTenants();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Sistem & AI</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
          Pantau kesehatan sistem, penggunaan token, dan kelola konfigurasi model AI.
        </p>
      </div>

      {/* ====== PILIH TENANT ====== */}
      <div className="flex items-center gap-4 bg-white dark:bg-[#1A1C20] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Dinas:</label>
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          className="bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.nama_dinas || t.nama}</option>
          ))}
        </select>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-2">
        {activeTab === 'monitoring' && <MonitoringTab />}
        {activeTab === 'token' && <TokenTab />}
        {activeTab === 'config' && <AIConfigTab tenantId={selectedTenantId} />}
      </div>
    </div>
  );
}