import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1d1d1e]">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-primary text-[#ff16a9] mb-6">
            Find Your Perfect Funding Match ✨
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto font-secondary text-[#e7e8ef]/90">
            Discover grants, RFPs, and government contracts tailored to your organization with AI-powered matching and win rate predictions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-[#ff16a9] text-white px-8 py-4 rounded-lg text-lg font-secondary hover:bg-[#ff16a9]/80 transition-all"
            >
              Get Started ✨
            </Link>
            <Link
              href="/login"
              className="bg-[#1d1d1e] text-[#e7e8ef] px-8 py-4 rounded-lg text-lg font-secondary hover:bg-[#1d1d1e]/80 transition-all border-2 border-[#ff16a9]/50"
            >
              Log In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-xl p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-primary text-[#ff16a9] mb-2">Smart Matching</h3>
              <p className="font-secondary text-[#e7e8ef]/80">
                Our algorithm analyzes your profile to find opportunities that match your interests, timeline, and entity type.
              </p>
            </div>

            <div className="bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-xl p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-primary text-[#ff16a9] mb-2">Win Rate Predictions</h3>
              <p className="font-secondary text-[#e7e8ef]/80">
                See how well you fit each opportunity with our AI-powered win rate calculation.
              </p>
            </div>

            <div className="bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-xl p-6">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-primary text-[#ff16a9] mb-2">Opportunity Tracker</h3>
              <p className="font-secondary text-[#e7e8ef]/80">
                Save, apply, and track opportunities all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
