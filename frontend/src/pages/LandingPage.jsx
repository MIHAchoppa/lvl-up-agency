import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <header className="border-b border-yellow-500/20 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 shadow-[0_0_40px_rgba(245,197,24,0.35)] flex items-center justify-center font-extrabold text-black">LVL</div>
            <span className="font-semibold">Level Up Agency</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-gray-300 hover:text-yellow-400">Features</a>
            <a href="#how" className="text-gray-300 hover:text-yellow-400">How it works</a>
            <Link to="/login" className="text-gray-300 hover:text-yellow-400">Login / Sign up</Link>
            <button onClick={() => navigate('/dashboard')} className="ml-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold shadow-[0_0_30px_rgba(245,197,24,0.35)] hover:brightness-110">Go to Dashboard</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="max-w-7xl mx-auto px-4 pt-20 pb-16 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-white drop-shadow-[0_0_20px_rgba(245,197,24,0.25)]">Become a top-earning BIGO Live host with AI coaching</h1>
              <p className="mt-4 text-gray-300 text-lg">Audition, learn, and grow with Bean Genie and our AI-powered platform. Strategy, events, PK prep, and more.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => navigate('/dashboard')} className="px-5 py-3 rounded-md bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold shadow-[0_0_40px_rgba(245,197,24,0.35)] hover:brightness-110">Enter Dashboard</button>
                <Link to="/login" className="px-5 py-3 rounded-md border border-yellow-500/30 text-yellow-400 hover:border-yellow-400">Login / Sign up</Link>
              </div>
            </div>
            <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-[#0d0d0d] to-[#111] p-6 shadow-[0_0_35px_rgba(245,197,24,0.15)]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-[#0b0b0b] border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">AI Coach</div>
                  <div className="text-gray-400 mt-1">Strategy, beans, PK</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0b0b0b] border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">Voice</div>
                  <div className="text-gray-400 mt-1">Bean Genie calls</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0b0b0b] border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">Auditions</div>
                  <div className="text-gray-400 mt-1">Video upload</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0b0b0b] border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">Events</div>
                  <div className="text-gray-400 mt-1">Calendar & RSVP</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 border-t border-yellow-500/20">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6">
            {["AI Coaching","Audition Upload","Group Chat"].map((t, i) => (
              <div key={i} className="p-6 rounded-xl bg-[#0b0b0b] border border-yellow-500/20 shadow-[0_0_25px_rgba(245,197,24,0.1)]">
                <div className="text-xl font-semibold text-yellow-400">{t}</div>
                <p className="text-gray-400 mt-2">Powerful tools to grow as a BIGO host with clear steps and support.</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-yellow-500/20 py-8 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} Level Up Agency
      </footer>
    </div>
  );
}

export default LandingPage;
