import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import VoiceRecruiter from '../components/VoiceRecruiter';
import LvlUpRecruitr from '../components/LvlUpRecruitr';
import Footer from '../components/Footer';
import { Sparkles, Play, Users, Trophy } from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();
  const [showRecruiter, setShowRecruiter] = useState(false);

  useEffect(() => {
    // Auto-show recruiter after 3 seconds
    const timer = setTimeout(() => {
      setShowRecruiter(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo Section */}
            <div className="flex items-center gap-2 md:gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
                alt="Level Up Agency" 
                className="h-8 w-8 md:h-10 md:w-10 object-contain"
              />
              <span className="font-bold text-lg md:text-xl text-gray-900 font-serif">
                Level Up Agency
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-sm lg:text-base">
              <a href="#features" className="text-gray-600 hover:text-gold-600 transition-colors font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gold-600 transition-colors font-medium">
                How it Works
              </a>
              <Link to="/login" className="text-gray-600 hover:text-gold-600 transition-colors font-medium">
                Login
              </Link>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-2 rounded-lg shadow-md font-semibold btn-glow"
              >
                Dashboard
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-700">
                  Login
                </Button>
              </Link>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 text-sm rounded-lg"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gold-50 via-white to-gold-50">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-gold-200/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-gold-100/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-gold-100 text-gold-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Platform</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 font-serif mb-6 leading-tight">
                Become a Top-Earning
                <span className="text-gradient"> BIGO Live Host</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
                Transform your streaming career with Bean Genie's AI coaching, expert guidance, and a supportive community. Start earning more today!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-gold-500 hover:bg-gold-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg font-semibold btn-glow"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Get Started Now
                </Button>
                <Link to="/login">
                  <Button 
                    variant="outline"
                    className="border-2 border-gold-500 text-gold-600 hover:bg-gold-50 px-8 py-6 text-lg rounded-xl font-semibold w-full sm:w-auto"
                  >
                    Sign Up Free
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-200">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-gray-900 mb-1">500+</div>
                  <div className="text-sm text-gray-600">Active Hosts</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-gray-900 mb-1">24/7</div>
                  <div className="text-sm text-gray-600">AI Support</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-gray-900 mb-1">95%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Right Column - Feature Cards */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 card-hover">
                  <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-gold-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-serif">AI Coach</h3>
                  <p className="text-sm text-gray-600">Bean Genie helps you excel</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 card-hover mt-8">
                  <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-gold-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-serif">Quick Start</h3>
                  <p className="text-sm text-gray-600">Stream in minutes</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 card-hover">
                  <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-gold-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-serif">Community</h3>
                  <p className="text-sm text-gray-600">Connect with hosts</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 card-hover mt-8">
                  <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center mb-4">
                    <Trophy className="w-6 h-6 text-gold-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-serif">Top Earnings</h3>
                  <p className="text-sm text-gray-600">Maximize revenue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps and begin your journey to success
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gold-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold font-serif text-gray-900 mb-3">
                Sign Up & Audition
              </h3>
              <p className="text-gray-600">
                Create your account and submit your audition video. Our team reviews applications within 24 hours.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gold-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold font-serif text-gray-900 mb-3">
                Get AI Coaching
              </h3>
              <p className="text-gray-600">
                Work with Bean Genie to develop your streaming strategy, improve your content, and build your audience.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gold-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold font-serif text-gray-900 mb-3">
                Start Earning
              </h3>
              <p className="text-gray-600">
                Go live, engage your audience, and watch your earnings grow with our proven strategies and support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Using New Component */}
      <section id="features">
        <LvlUpRecruitr />
      </section>

      {/* Footer */}
      <Footer />

      {/* Voice Recruiter Modal */}
      {showRecruiter && (
        <VoiceRecruiter onClose={() => setShowRecruiter(false)} />
      )}
    </div>
  );
}

export default LandingPage;

