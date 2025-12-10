import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-light to-dark opacity-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5 animate-pulse" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-primary mb-8 leading-tight">
            Find Your Perfect<br />Funding Match
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto text-foreground/80 font-secondary leading-relaxed">
            Discover grants, RFPs, and government contracts tailored to your organization with AI-powered matching and win rate predictions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/signup"
              className="btn-primary text-lg px-8 py-4"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-lg px-8 py-4"
            >
              Log In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
            <div className="card group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-primary mb-3 gradient-text">Smart Matching</h3>
              <p className="text-foreground/70 font-secondary leading-relaxed">
                Our algorithm analyzes your profile to find opportunities that match your interests, timeline, and entity type.
              </p>
            </div>

            <div className="card group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-primary mb-3 gradient-text">Win Rate Predictions</h3>
              <p className="text-foreground/70 font-secondary leading-relaxed">
                See how well you fit each opportunity with our AI-powered win rate calculation.
              </p>
            </div>

            <div className="card group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-primary mb-3 gradient-text">Opportunity Tracker</h3>
              <p className="text-foreground/70 font-secondary leading-relaxed">
                Save, apply, and track opportunities all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
