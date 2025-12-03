'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { FeedbackForm } from '@/components/FeedbackForm';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  const { logIn, user, userProfile } = useAuth();
  const router = useRouter();

  // Handle redirect after login and profile loads
  useEffect(() => {
    if (loginSuccess && user) {
      // Wait a bit for profile to load
      const timer = setTimeout(() => {
        if (!userProfile || !userProfile.entityName || !userProfile.fundingType || userProfile.fundingType.length === 0) {
          router.replace('/onboarding');
        } else {
          router.replace('/dashboard');
        }
        setLoginSuccess(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, user, userProfile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await logIn(email, password);
      setLoginSuccess(true);
      // Don't set loading to false here - let the redirect handle it
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
      setLoading(false);
      setLoginSuccess(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1d1d1e] p-4">
      <div className="max-w-2xl w-full">
        {/* Feedback Form with Instructions */}
        <FeedbackForm
          questions={[]}
          page="login"
          showInstructions={true}
        />
        
        <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-xl p-8">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-primary text-[#ad3c94]">RFP Matcher</h1>
            <p className="font-secondary text-[#e7e8ef]/80 mt-2">Welcome back!</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
              <p className="text-red-300 text-sm font-secondary">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
              <label htmlFor="email" className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
                className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
              <label htmlFor="password" className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
                className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
              className="w-full bg-[#ad3c94] text-white py-2 px-4 rounded-lg hover:bg-[#ad3c94]/80 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:ring-offset-2 focus:ring-offset-[#1d1d1e] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-secondary"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm font-secondary text-[#e7e8ef]/80">
            Don't have an account?{' '}
              <Link href="/signup" className="text-[#ad3c94] hover:text-[#ad3c94]/80 font-medium underline decoration-[#ad3c94]/50">
              Sign up
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

