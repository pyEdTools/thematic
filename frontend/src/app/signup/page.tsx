'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Loader2, Mail, Lock, User, X, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      setError(errorMsg);
    }
  }, [searchParams]);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        setError(`Authentication failed: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Unexpected OAuth error:', err);
      setError(`An unexpected error occurred: ${err.message || 'Check your internet connection or ad-blocker'}`);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
    } else if (data.user) {
      // Create profile entry
      // Note: If you added the trigger in SQL, this manual insert might fail 
      // with a "duplicate key" error, which we can safely ignore.
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { id: data.user.id, username: username }
        ]);

      if (profileError && profileError.code !== '23505') {
        console.error('Error creating profile:', profileError.message);
        // We don't block the user if the profile insert fails because 
        // the trigger might have already handled it or they can fix it later.
      }

      // Automatically sign in and redirect to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-12 rounded-[40px] shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-ucm-gold" />
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
            <UserPlus className="text-white h-8 w-8" />
          </div>
          <h2 className="text-4xl font-black text-ucm-navy tracking-tight">Create account</h2>
          <p className="mt-3 text-gray-500 font-medium">
            Start your <span className="text-primary font-black">thematic analysis</span> journey
          </p>
        </div>
        
        <form className="mt-10 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-5">
            <div className="relative">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent outline-none transition-all font-medium text-gray-900"
                  placeholder="jdoe123"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent outline-none transition-all font-medium text-gray-900"
                  placeholder="name@ucmerced.edu"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-300" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent outline-none transition-all font-medium text-gray-900 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Confirm</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-300" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent outline-none transition-all font-medium text-gray-900 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Min. 6 characters</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-2xl border border-red-100 flex items-center relative pr-10"
              >
                <X className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="absolute right-2 p-1 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-primary hover:bg-ucm-navy focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 shadow-xl shadow-primary/20 uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-4 text-gray-400 font-black tracking-[0.2em]">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="flex items-center justify-center py-4 px-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 group"
            >
              <span className="w-5 h-5 flex items-center justify-center bg-red-50 text-red-500 rounded-lg mr-3 font-black group-hover:bg-red-500 group-hover:text-white transition-colors">G</span>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              className="flex items-center justify-center py-4 px-4 bg-[#24292e] text-white rounded-2xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
            >
              <Github className="h-4 w-4 mr-3" />
              GitHub
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="font-black text-primary hover:text-ucm-navy transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
