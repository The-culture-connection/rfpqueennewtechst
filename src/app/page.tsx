import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Find Your Perfect Funding Match
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto">
            Discover grants, RFPs, and government contracts tailored to your organization with AI-powered matching and win rate predictions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-800 transition-colors border-2 border-white shadow-lg"
            >
              Log In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
              <p className="text-white/90">
                Our algorithm analyzes your profile to find opportunities that match your interests, timeline, and entity type.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Win Rate Predictions</h3>
              <p className="text-white/90">
                See how well you fit each opportunity with our AI-powered win rate calculation.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-2">Opportunity Tracker</h3>
              <p className="text-white/90">
                Save, apply, and track opportunities all in one place.
          </p>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
