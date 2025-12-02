'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { FeedbackForm } from '@/components/FeedbackForm';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      // Redirect to onboarding after successful signup
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1d1d1e] p-4">
      <div className="max-w-2xl w-full">
        {/* Feedback Form with Instructions */}
        <FeedbackForm
          questions={[]}
          page="signup"
          showInstructions={true}
        />
        
        <div className="bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-primary text-[#ff16a9]">RFP Matcher ✨</h1>
            <p className="font-secondary text-[#e7e8ef]/80 mt-2">Create your account</p>
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
                className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ff16a9] focus:border-transparent"
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
                className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ff16a9] focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="text-xs font-secondary text-[#e7e8ef]/70 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ff16a9] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff16a9] text-white py-2 px-4 rounded-lg hover:bg-[#ff16a9]/80 focus:outline-none focus:ring-2 focus:ring-[#ff16a9] focus:ring-offset-2 focus:ring-offset-[#1d1d1e] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-secondary"
            >
              {loading ? 'Creating Account...' : 'Sign Up ✨'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm font-secondary text-[#e7e8ef]/80">
              Already have an account?{' '}
              <Link href="/login" className="text-[#ff16a9] hover:text-[#ff16a9]/80 font-medium underline decoration-[#ff16a9]/50">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

