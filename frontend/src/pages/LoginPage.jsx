import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

function LoginPage() {
  const { login, register } = useAuth();
  const [credentials, setCredentials] = useState({ bigo_id: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', bigo_id: '', password: '', passcode: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!credentials.bigo_id || !credentials.password) {
      toast.error('Please enter both BIGO ID and password');
      return;
    }
    setLoading(true);
    try {
      await login(credentials);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signup.name || !signup.email || !signup.bigo_id || !signup.password) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await register(signup);
      toast.success('Welcome! Account created');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-yellow-500/10 blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="max-w-2xl w-full mx-4 space-y-8 p-10 rounded-2xl border border-yellow-500/30 glass shadow-gold-lg relative z-10 animate-fade-in-up">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
              alt="Level Up Agency" 
              className="h-12 w-12 object-contain transition-smooth hover:scale-110"
            />
            <h1 className="text-4xl font-extrabold text-gradient-gold">Level Up Agency</h1>
          </div>
          <p className="text-gray-300 text-lg">AI-Enhanced BIGO Live Platform</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2 w-full glass-dark border border-yellow-500/30 p-1 rounded-xl">
            <TabsTrigger 
              value="login" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold rounded-lg transition-smooth font-semibold"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold rounded-lg transition-smooth font-semibold"
            >
              Sign up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-200 mb-2">BIGO ID</label>
                <input 
                  type="text" 
                  value={credentials.bigo_id} 
                  onChange={(e) => setCredentials({ ...credentials, bigo_id: e.target.value })} 
                  className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                  placeholder="Enter your BIGO ID" 
                  disabled={loading} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-200 mb-2">Password</label>
                <input 
                  type="password" 
                  value={credentials.password} 
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} 
                  className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                  placeholder="Enter your password" 
                  disabled={loading} 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-3.5 rounded-xl font-bold text-black gradient-gold shadow-gold transition-smooth hover:scale-105 hover:shadow-gold-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? '🔄 Signing in...' : '🚀 Sign in'}
              </button>
              <div className="text-center p-4 rounded-lg glass-dark border border-yellow-500/20">
                <p className="text-sm text-gray-400 mb-1">Demo Account:</p>
                <p className="text-sm">
                  <span className="text-gray-300">BIGO ID:</span> <span className="text-yellow-400 font-bold">Admin</span>
                  {' '}/{' '}
                  <span className="text-gray-300">Password:</span> <span className="text-yellow-400 font-bold">admin333</span>
                </p>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="pt-8">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-2">Full name</label>
                  <input 
                    type="text" 
                    value={signup.name} 
                    onChange={(e) => setSignup({ ...signup, name: e.target.value })} 
                    className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                    placeholder="Your name" 
                    disabled={loading} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={signup.email} 
                    onChange={(e) => setSignup({ ...signup, email: e.target.value })} 
                    className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                    placeholder="you@example.com" 
                    disabled={loading} 
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-2">BIGO ID</label>
                  <input 
                    type="text" 
                    value={signup.bigo_id} 
                    onChange={(e) => setSignup({ ...signup, bigo_id: e.target.value })} 
                    className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                    placeholder="Choose your BIGO ID" 
                    disabled={loading} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-2">Password</label>
                  <input 
                    type="password" 
                    value={signup.password} 
                    onChange={(e) => setSignup({ ...signup, password: e.target.value })} 
                    className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                    placeholder="Create password" 
                    disabled={loading} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-200 mb-2">Passcode (optional)</label>
                <input 
                  type="text" 
                  value={signup.passcode} 
                  onChange={(e) => setSignup({ ...signup, passcode: e.target.value })} 
                  className="block w-full px-4 py-3 glass-dark border border-yellow-500/30 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-smooth" 
                  placeholder="LVLUP2025 / COACH2025 / ADMIN2025" 
                  disabled={loading} 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-3.5 rounded-xl font-bold text-black gradient-gold shadow-gold transition-smooth hover:scale-105 hover:shadow-gold-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? '🔄 Creating account...' : '✨ Create account'}
              </button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default LoginPage;
