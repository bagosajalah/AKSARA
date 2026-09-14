import React, { useState } from 'react';
import { LogIn, CheckCircle } from 'lucide-react';

export default function ClaimInvitationPage({ onBackToDashboard }) {
  const [nama, setNama] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-semibold tracking-tight text-gray-900 dark:text-white transition-colors">
          Aksara
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400 transition-colors">
          Sistem Manajemen Tenant & Ekosistem Digital
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#1A1C20] py-10 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl sm:rounded-3xl sm:px-10 border border-gray-200 dark:border-gray-800/50 transition-colors">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center transition-colors">
              Lengkap Profil Aksara & Tautkan Akun
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 text-center transition-colors">
              Anda diundang untuk menjadi Admin Dinas.
            </p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                Email Terdaftar
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  disabled
                  value="admin@kominfo.ponorogo.go.id"
                  className="w-full rounded-xl border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#121315] text-gray-500 dark:text-gray-400 cursor-not-allowed sm:text-sm border py-3 px-4 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                Nama Lengkap
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121315] hover:bg-white dark:hover:bg-[#1A1C20] focus:bg-white dark:focus:bg-[#1A1C20] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 sm:text-sm border py-3 px-4 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Tautkan & Login dengan SSO Pemkab
              </button>
              
              <button
                type="button"
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1A1C20] hover:bg-gray-50 dark:hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Tautkan & Login dengan Google
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Setelah proses ini selesai, Anda akan mendapatkan akses penuh sebagai Admin Dinas.
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={onBackToDashboard}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              &larr; Kembali ke Dashboard (Simulasi)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}