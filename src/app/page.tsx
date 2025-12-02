import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Find Your Perfect Funding Match ✨
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-pink-200/90">
            Discover grants, RFPs, and government contracts tailored to your organization with AI-powered matching and win rate predictions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg shadow-pink-500/50"
            >
              Get Started ✨
            </Link>
            <Link
              href="/login"
              className="bg-gray-800/80 backdrop-blur-lg text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-700/80 transition-all border-2 border-pink-400/50 shadow-lg"
            >
              Log In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-lg border border-pink-400/30 rounded-xl p-6 shadow-lg shadow-pink-500/20">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2 text-pink-300">Smart Matching</h3>
              <p className="text-pink-200/80">
                Our algorithm analyzes your profile to find opportunities that match your interests, timeline, and entity type.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg border border-purple-400/30 rounded-xl p-6 shadow-lg shadow-purple-500/20">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-purple-300">Win Rate Predictions</h3>
              <p className="text-purple-200/80">
                See how well you fit each opportunity with our AI-powered win rate calculation.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg border border-fuchsia-400/30 rounded-xl p-6 shadow-lg shadow-fuchsia-500/20">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-2 text-fuchsia-300">Opportunity Tracker</h3>
              <p className="text-fuchsia-200/80">
                Save, apply, and track opportunities all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
