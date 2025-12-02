'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { FeedbackForm } from '@/components/FeedbackForm';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { logIn, userProfile } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await logIn(email, password);
      
      // Redirect based on whether they've completed onboarding
      if (!userProfile || !userProfile.entityName) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-2xl w-full">
        {/* Feedback Form with Instructions */}
        <FeedbackForm
          questions={[]}
          page="login"
          showInstructions={true}
        />
        
        <div className="bg-gray-800/80 backdrop-blur-lg border border-pink-400/30 rounded-xl shadow-2xl shadow-pink-500/20 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">RFP Matcher ✨</h1>
            <p className="text-pink-200/80 mt-2">Welcome back!</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-pink-200 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900/50 border border-pink-400/30 rounded-lg text-pink-100 placeholder-pink-400/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-pink-200 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900/50 border border-pink-400/30 rounded-lg text-pink-100 placeholder-pink-400/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 px-4 rounded-lg hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-pink-500/50"
            >
              {loading ? 'Logging in...' : 'Log In ✨'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-pink-200/80">
              Don't have an account?{' '}
              <Link href="/signup" className="text-pink-400 hover:text-pink-300 font-medium underline decoration-pink-400/50">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

