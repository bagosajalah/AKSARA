import React, { useState } from 'react';
import { LogIn, ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import api from '../../services/api';

export default function LoginGateway({ onLoginSuperAdmin, onPreviewPublicPage }) {
  const [loadingState, setLoadingState] = useState(null);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleSimulate = (type) => {
    setLoadingState(type);
    
    if (type === 'sso') {
      setTimeout(() => {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentRole', 'super_admin');
        if (onLoginSuperAdmin) onLoginSuperAdmin('super_admin');
      }, 600);
    } else if (type === 'google') {
      setTimeout(() => {
        setLoadingState(null);
        setShowGoogleMock(true);
      }, 1500);
    } else if (type === 'claim') {
      setTimeout(() => {
        if (onPreviewPublicPage) onPreviewPublicPage();
      }, 1000);
    }
  };

  const handleGoogleLogin = async (e) => {
    e.preventDefault();
    setGoogleError("");

    try {
      // ✅ PERBAIKAN: Hapus /api/v1 (sudah ada di baseURL)
      const response = await api.post("/auth/login", {
        email: googleEmail,
        password: googlePassword,
      });

      const data = response.data;
      console.log("Response login:", data);

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("isAuthenticated", "true");

      if (data.user) {
        const userData = {
          ...data.user,
          tenant: data.user.tenant_name || data.user.tenant || null,
          tenant_id: data.user.tenant_id || null,
        };
        localStorage.setItem("aksara_current_user", JSON.stringify(userData));
        console.log("User data saved:", userData);
      }

      const role = data.user?.role || "super_admin";
      localStorage.setItem("aksara_active_role", role);

      if (onLoginSuperAdmin) {
        onLoginSuperAdmin(role, data.user?.tenant_id || null, data);
      }

    } catch (error) {
      console.error("Login gagal:", error);
      if (error.response) {
        setGoogleError(error.response.data?.detail || "Login gagal");
      } else {
        setGoogleError("Backend tidak dapat dihubungi.");
      }
    }
  };

  if (loadingState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[420px] text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">
            {loadingState === 'sso' && 'Mengotentikasi...'}
            {loadingState === 'google' && 'Mengarahkan ke Google OAuth...'}
            {loadingState === 'claim' && 'Membuka Halaman Klaim Undangan...'}
            {loadingState === 'widget' && 'Memuat Widget Masyarakat...'}
          </p>
          {loadingState !== 'sso' && loadingState !== 'google' && (
            <button 
              onClick={() => setLoadingState(null)}
              className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500 hover:text-gray-700 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Batalkan Simulasi (Kembali)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (showGoogleMock) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 w-full max-w-[450px]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium tracking-tight mb-2">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </h1>
            <h2 className="text-2xl font-normal text-gray-900">Sign in</h2>
            <p className="text-base text-gray-600 mt-1">to continue to Aksara</p>
          </div>
          
          <form onSubmit={handleGoogleLogin} className="space-y-4">
            <div>
              <input 
                type="email" 
                placeholder="Email or phone"
                value={googleEmail}
                onChange={(e) => { setGoogleEmail(e.target.value); setGoogleError(''); }}
                className="w-full bg-white text-gray-900 placeholder-gray-500 border border-gray-200/80 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
                required
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="Enter your password"
                value={googlePassword}
                onChange={(e) => { setGooglePassword(e.target.value); setGoogleError(''); }}
                className="w-full bg-white text-gray-900 placeholder-gray-500 border border-gray-200/80 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
                required
              />
            </div>
            {googleError && (
              <p className="text-red-600 text-sm mt-1">{googleError}</p>
            )}
            
            <div className="flex items-center justify-between mt-10">
              <button 
                type="button"
                onClick={() => {
                  setShowGoogleMock(false);
                  setGoogleEmail('');
                  setGooglePassword('');
                  setGoogleError('');
                }}
                className="text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[420px]">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Aksara</h1>
        </div>

        <div>
          <button 
            onClick={() => handleSimulate('sso')}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors mb-3"
          >
            <LogIn className="w-5 h-5" />
            <span>Login dengan SSO Pemkab</span>
          </button>
          
          <button 
            onClick={() => handleSimulate('google')}
            className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl border border-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Login dengan Google</span>
          </button>
          
          <p className="text-xs text-gray-400 text-center mt-3">
            Gunakan metode login sesuai akun yang telah ditautkan.
          </p>
        </div>
      </div>
    </div>
  );
}