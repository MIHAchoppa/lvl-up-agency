import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import VoiceRecruiter from '../components/VoiceRecruiter';

function LandingPage() {
  const navigate = useNavigate();
  const [showRecruiter, setShowRecruiter] = useState(false);

  useEffect(() => {
    // Auto-show recruiter after 2 seconds
    const timer = setTimeout(() => {
      setShowRecruiter(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <header className="border-b border-yellow-500/20 sticky top-0 glass-dark z-50 transition-smooth">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-fade-in">
            <img 
              src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
              alt="Level Up Agency" 
              className="h-10 w-10 object-contain transition-smooth hover:scale-110"
            />
            <span className="font-bold text-lg">Level Up Agency</span>
            <span className="text-yellow-500/50">|</span>
            <img 
              src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/uzty33em_bean_genie_no_bg.webp" 
              alt="BeanGenie" 
              className="h-8 w-8 object-contain transition-smooth hover:scale-110"
            />
            <span className="text-sm text-gradient-gold font-medium">Powered by BeanGenie™</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-300 hover:text-yellow-400 transition-smooth font-medium">Features</a>
            <a href="#how" className="text-gray-300 hover:text-yellow-400 transition-smooth font-medium">How it works</a>
            <Link to="/login" className="text-gray-300 hover:text-yellow-400 transition-smooth font-medium">Login / Sign up</Link>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="ml-2 px-4 py-2 rounded-lg gradient-gold text-black font-bold shadow-gold transition-smooth hover:shadow-gold-lg hover:scale-105"
            >
              Go to Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-yellow-500/10 blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                <span className="text-gradient-gold">Become a top-earning</span>
                <br />
                <span className="text-white">BIGO Live host</span>
                <br />
                <span className="text-white">with AI coaching</span>
              </h1>
              <p className="mt-6 text-gray-300 text-lg md:text-xl leading-relaxed">
                Audition, learn, and grow with Bean Genie and our AI-powered platform. Strategy, events, PK prep, and more.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="px-6 py-3.5 rounded-xl gradient-gold text-black font-bold shadow-gold-lg transition-smooth hover:scale-105 hover:shadow-gold"
                >
                  Enter Dashboard →
                </button>
                <Link 
                  to="/login" 
                  className="px-6 py-3.5 rounded-xl border-2 border-yellow-500/40 text-yellow-400 font-bold transition-smooth hover:border-yellow-400 hover:bg-yellow-500/10 hover:scale-105"
                >
                  Login / Sign up
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-yellow-500/30 glass p-8 shadow-gold-lg hover-lift animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-xl glass-dark border border-yellow-500/30 hover-lift transition-smooth hover:border-yellow-500/50">
                  <div className="text-3xl font-bold text-gradient-gold mb-2">AI Coach</div>
                  <div className="text-gray-400 text-sm">Strategy, beans, PK</div>
                </div>
                <div className="p-5 rounded-xl glass-dark border border-yellow-500/30 hover-lift transition-smooth hover:border-yellow-500/50">
                  <div className="text-3xl font-bold text-gradient-gold mb-2">Voice</div>
                  <div className="text-gray-400 text-sm">Bean Genie calls</div>
                </div>
                <div className="p-5 rounded-xl glass-dark border border-yellow-500/30 hover-lift transition-smooth hover:border-yellow-500/50">
                  <div className="text-3xl font-bold text-gradient-gold mb-2">Auditions</div>
                  <div className="text-gray-400 text-sm">Video upload</div>
                </div>
                <div className="p-5 rounded-xl glass-dark border border-yellow-500/30 hover-lift transition-smooth hover:border-yellow-500/50">
                  <div className="text-3xl font-bold text-gradient-gold mb-2">Events</div>
                  <div className="text-gray-400 text-sm">Calendar & RSVP</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 border-t border-yellow-500/20 bg-gradient-to-b from-transparent to-black/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gradient-gold mb-12">
              Powerful Features for Your Success
            </h2>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {[
                { title: "AI Coaching", icon: "🤖", desc: "Get personalized strategies and real-time guidance from advanced AI coaches." },
                { title: "Audition Upload", icon: "🎬", desc: "Submit your best performances and get professional feedback instantly." },
                { title: "Group Chat", icon: "💬", desc: "Connect with other hosts, share tips, and build your network." }
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="p-8 rounded-2xl glass border border-yellow-500/30 shadow-gold hover-lift transition-smooth hover:border-yellow-500/50 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <div className="text-2xl font-bold text-gradient-gold mb-3">{feature.title}</div>
                  <p className="text-gray-300 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-yellow-500/30 py-10 text-center text-gray-400 bg-black/50">
        <p className="text-sm font-medium">© {new Date().getFullYear()} Level Up Agency. All rights reserved.</p>
        <p className="text-xs mt-2 text-yellow-500/50">Powered by BeanGenie™ AI Technology</p>
      </footer>
      {/* Voice Recruiter Modal */}
      {showRecruiter && (
        <VoiceRecruiter onClose={() => setShowRecruiter(false)} />
      )}
    </div>
  );
}

export default LandingPage;
