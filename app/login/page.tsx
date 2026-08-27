'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Building2, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if already logged in, redirect to admin dashboard
  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace('/admin/dashboard');
      }
    }
    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccessMessage('Login successful! Redirecting to Admin Dashboard...');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#5B4A3F] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#4B352A] text-[#E8DFD8] border-b border-[#3D2B22] px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-[#A67C52] text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#8C6641] transition-colors">
              SK
            </div>
            <div>
              <span className="text-lg font-bold text-white leading-tight block tracking-tight">
                Sri Kanyaka Polymers
              </span>
              <span className="text-xs text-[#B8A89C] block">
                Internal ERP Portal
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-[#DCCFBE] hover:text-white flex items-center space-x-1 border border-[#6F4E37] px-3 py-1.5 rounded-lg hover:bg-[#3D2B22] transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#A67C52]" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-[#FFFCF8] border border-[#DDD3C6] rounded-2xl p-8 shadow-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#4B352A] text-white rounded-2xl mb-4 shadow-sm">
              <Building2 className="w-7 h-7 text-[#A67C52]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2F241E] tracking-tight">
              Hello Sri Kanyaka Polymers
            </h1>
            <p className="text-sm text-[#8A7B70] mt-1">
              Please sign in with your admin credentials to access the ERP system
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-red-900">Authentication Failed</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-emerald-900">Success</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#4B352A] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A7B70]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@srikanyakapolymers.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B352A] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A7B70]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F8F4EE] border border-[#DDD3C6] rounded-xl text-sm text-[#2F241E] placeholder-[#A09388] focus:outline-none focus:ring-2 focus:ring-[#A67C52] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A7B70] hover:text-[#4B352A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#4B352A] hover:bg-[#32231B] text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in with Supabase...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link to Admin Dashboard */}
          <div className="mt-8 pt-6 border-t border-[#EEE7DD] text-center">
            <p className="text-xs text-[#8A7B70] mb-2">
              Role Navigation Link:
            </p>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#A67C52] hover:text-[#6F4E37] transition-colors bg-[#F8F4EE] px-4 py-2 rounded-lg border border-[#DDD3C6]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Go to Admin Dashboard Role</span>
            </Link>
            <p className="text-[11px] text-[#A09388] mt-2 italic">
              Note: Unauthenticated users attempting to access the Admin Dashboard will be automatically blocked and redirected back to login.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#E8DFD8] border-t border-[#DDD3C6] py-4 text-center text-xs text-[#8A7B70]">
        &copy; {new Date().getFullYear()} Sri Kanyaka Polymers. All rights reserved. Secure Supabase Auth Enabled.
      </footer>
    </div>
  );
}