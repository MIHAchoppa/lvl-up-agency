import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 sticky top-0 bg-gray-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">LVL</div>
            <span className="font-semibold">Level Up Agency</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-gray-300 hover:text-white">Features</a>
            <a href="#how" className="text-gray-300 hover:text-white">How it works</a>
            <Link to="/login" className="text-gray-300 hover:text-white">Login</Link>
            <button onClick={() => navigate('/dashboard')} className="ml-2 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500">Go to Dashboard</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 pt-20 pb-16 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Become a top-earning BIGO Live host with AI coaching</h1>
              <p className="mt-4 text-gray-300 text-lg">Audition, learn, and grow with Bean Genie and our AI-powered platform. Strategy, events, PK prep, and more.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => navigate('/dashboard')} className="px-5 py-3 rounded-md bg-blue-600 hover:bg-blue-500">Enter Dashboard</button>
                <Link to="/login" className="px-5 py-3 rounded-md border border-gray-700 hover:border-gray-500">Login</Link>
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                  <div className="text-2xl font-bold">AI Coach</div>
                  <div className="text-gray-400 mt-1">Strategy, beans, PK</div>
                </div>
                <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                  <div className="text-2xl font-bold">Voice</div>
                  <div className="text-gray-400 mt-1">Bean Genie calls</div>
                </div>
                <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                  <div className="text-2xl font-bold">Auditions</div>
                  <div className="text-gray-400 mt-1">Video upload</div>
                </div>
                <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                  <div className="text-2xl font-bold">Events</div>
                  <div className="text-gray-400 mt-1">Calendar & RSVP</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6">
            {["AI Coaching","Audition Upload","Group Chat"].map((t, i) => (
              <div key={i} className="p-6 rounded-xl bg-gray-900 border border-gray-800">
                <div className="text-xl font-semibold">{t}</div>
                <p className="text-gray-400 mt-2">Powerful tools to grow as a BIGO host with clear steps and support.</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} Level Up Agency
      </footer>
    </div>
  );
}

export default LandingPage;
