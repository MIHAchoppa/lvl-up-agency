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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="max-w-2xl w-full space-y-8 p-8 rounded-xl border border-yellow-500/20 bg-[#0d0d0d] shadow-[0_0_50px_rgba(245,197,24,0.15)]">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(245,197,24,0.25)]">🚀 Level Up Agency</h1>
          <p className="mt-2 text-gray-400">AI-Enhanced BIGO Live Platform</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-black/40 border border-yellow-500/20">
            <TabsTrigger value="login" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">Login</TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200">BIGO ID</label>
                <input type="text" value={credentials.bigo_id} onChange={(e) => setCredentials({ ...credentials, bigo_id: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Enter your BIGO ID" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Password</label>
                <input type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Enter your password" disabled={loading} />
              </div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 rounded-md font-semibold text-black bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_35px_rgba(245,197,24,0.2)] hover:brightness-110 disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in'}</button>
              <p className="text-center text-sm text-gray-400">Demo: BIGO ID <span className="text-yellow-400">Admin</span> / Password <span className="text-yellow-400">admin333</span></p>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="pt-6">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200">Full name</label>
                  <input type="text" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Your name" disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200">Email</label>
                  <input type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="you@example.com" disabled={loading} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200">BIGO ID</label>
                  <input type="text" value={signup.bigo_id} onChange={(e) => setSignup({ ...signup, bigo_id: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Choose your BIGO ID" disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200">Password</label>
                  <input type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Create password" disabled={loading} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Passcode (optional)</label>
                <input type="text" value={signup.passcode} onChange={(e) => setSignup({ ...signup, passcode: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-black/40 border border-yellow-500/20 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="LVLUP2025 / COACH2025 / ADMIN2025" disabled={loading} />
              </div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 rounded-md font-semibold text-black bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_35px_rgba(245,197,24,0.2)] hover:brightness-110 disabled:opacity-50">{loading ? 'Creating account...' : 'Create account'}</button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default LoginPage;
