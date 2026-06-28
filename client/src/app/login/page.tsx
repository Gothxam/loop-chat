'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User as UserIcon, AlertCircle, X, Mail, Key, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: New Password, 3: Success
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Email verification failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Reset failed');
      }
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message || 'Password reset failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotEmail('');
    setForgotStep(1);
    setNewPassword('');
    setConfirmPassword('');
    setForgotError(null);
    setForgotLoading(false);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInputs) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Authentication failed');
      }

      setAuth(resData.user, resData.token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      {/* Container */}
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 select-none">
            <img src="/icon.png" className="w-full h-full object-contain" alt="Loop Logo" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Welcome Back</h1>
          <p className="mt-1.5 text-xs text-zinc-400">Sign in to your Loop Chat account</p>
        </div>

        {/* Flat Card Panel */}
        <div className="panel-card p-8 rounded-2xl shadow-xl">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 bg-red-950/20 border border-red-500/25 text-red-200 p-3.5 rounded-xl text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <UserIcon className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. johndoe"
                  {...register('username')}
                  className={`w-full bg-zinc-950 border ${
                    errors.username ? 'border-red-500/40 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
                  } text-zinc-100 pl-10 pr-4 py-2.5 rounded-xl outline-none text-xs transition-all placeholder-zinc-650`}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-[10px] text-red-400">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline tracking-wider uppercase transition-all cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full bg-zinc-950 border ${
                    errors.password ? 'border-red-500/40 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
                  } text-zinc-100 pl-10 pr-4 py-2.5 rounded-xl outline-none text-xs transition-all placeholder-zinc-650`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[10px] text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:scale-[1.005] active:scale-[0.995]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center text-xs text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-zinc-100 hover:underline font-bold transition-all">
              Register here
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-6 rounded-2xl shadow-2xl relative animate-scale-in">
            {/* Close Button */}
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-zinc-550 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Step 1: Email Verification */}
            {forgotStep === 1 && (
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 rounded-xl mb-3 animate-pulse">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100">Forgot Password</h2>
                  <p className="text-[10px] text-zinc-400 mt-1">Enter your registered email address to verify your account</p>
                </div>

                {forgotError && (
                  <div className="flex items-start gap-2 bg-red-950/20 border border-red-500/25 text-red-200 p-3 rounded-xl text-[10px]">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-zinc-100 px-3.5 py-2.5 rounded-xl outline-none text-xs transition-all placeholder-zinc-655"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/10 cursor-pointer"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: New Password Inputs */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-950/20 border border-purple-500/20 text-purple-400 rounded-xl mb-3 animate-pulse">
                    <Key className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100">Set New Password</h2>
                  <p className="text-[10px] text-zinc-400 mt-1">Create a new secure password for your account</p>
                </div>

                {forgotError && (
                  <div className="flex items-start gap-2 bg-red-950/20 border border-red-500/25 text-red-200 p-3 rounded-xl text-[10px]">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-zinc-100 px-3.5 py-2.5 rounded-xl outline-none text-xs transition-all placeholder-zinc-655"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-zinc-100 px-3.5 py-2.5 rounded-xl outline-none text-xs transition-all placeholder-zinc-655"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/10 cursor-pointer"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Success Screen */}
            {forgotStep === 3 && (
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-zinc-100">Password Reset Done</h2>
                <p className="text-[10px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Your password has been successfully updated. You can now close this window and log in with your new password.
                </p>
                <button
                  onClick={closeForgotModal}
                  className="w-full mt-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
