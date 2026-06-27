'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 mb-4 select-none">
            <span className="text-zinc-950 font-black text-xl tracking-tight">L</span>
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Password
              </label>
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
              className="w-full mt-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
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
    </div>
  );
}
