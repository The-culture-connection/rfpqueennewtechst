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
        // Check if terms are accepted first
        if (!userProfile || !userProfile.termsAccepted) {
          router.replace('/terms');
        } else if (!userProfile.entityName || !userProfile.fundingType || userProfile.fundingType.length === 0) {
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
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="max-w-md w-full">
        {/* Feedback Form with Instructions */}
        <FeedbackForm
          questions={[]}
          page="login"
          showInstructions={true}
        />
        
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-primary mb-2 gradient-text">RFP Matcher</h1>
            <p className="font-secondary text-foreground/70 mt-2">Welcome back!</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm font-secondary">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium font-secondary text-foreground/90 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-primary/20 rounded-xl font-secondary text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium font-secondary text-foreground/90 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-primary/20 rounded-xl font-secondary text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm font-secondary text-foreground/70">
              Don't have an account?{' '}
              <Link href="/terms" className="text-primary hover:text-primary-light font-medium underline decoration-primary/50">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

