import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Icons
import {
  Crown,
  Trophy,
  Users,
  Calendar as CalendarIcon,
  Bell,
  Settings,
  CheckCircle,
  Gift,
  MessageSquare,
  Home,
  BookOpen,
  Target,
  FileText,
  Bot,
  DollarSign,
  BarChart3,
  Camera,
  Upload,
  StopCircle,
  PlayCircle,
  X,
  Lock,
  Search,
  Users2,
  Command,
  Calculator,
  Video,
  Phone,
  Clock,
} from 'lucide-react';

// UI components
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SEO meta helper
function SEOMeta() {
  useEffect(() => {
    document.title = 'LVLUP AGENCY – Become a BIGO Host';
  }, []);
  return null;
}

// Auth context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      setUser(data);
    } catch (e) {
      logout();
    }
    setLoading(false);
  };

  const login = async (bigoId, password) => {
    try {
      const { data } = await axios.post(`${API}/auth/login`, { bigo_id: bigoId, password });
      const { access_token, user: u } = data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setToken(access_token);
      setUser(u);
      toast.success(`Welcome back, ${u.name}!`);
      setTimeout(() => { window.location.href = '/dashboard'; }, 300);
    } catch (e) {
      toast.error('Login failed');
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await axios.post(`${API}/auth/register`, payload);
      const { access_token, user: u } = data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setToken(access_token);
      setUser(u);
      toast.success(`Welcome to LVLUP, ${u.name}!`);
      setTimeout(() => { window.location.href = '/dashboard'; }, 300);
    } catch (e) {
      toast.error('Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Video audition modal (UI only; backend upload wired elsewhere)
function VideoAuditionModal({ isOpen, onClose, onSuccess }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const recordedVideoRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedVideo(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setTimeout(() => { if (recorder.state === 'recording') stopRecording(); }, 45000);
    } catch (e) {
      toast.error('Please allow camera & mic access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (recordedVideo && recordedVideoRef.current) {
      const url = URL.createObjectURL(recordedVideo);
      recordedVideoRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [recordedVideo]);

  const submitAudition = async () => {
    if (!recordedVideo) { toast.error('Record your audition first'); return; }
    setIsUploading(true);
    try {
      // Placeholder UX
      await new Promise(r => setTimeout(r, 1200));
      toast.success('Audition submitted. We will contact you.');
      onSuccess?.();
      onClose?.();
    } catch (e) {
      toast.error('Failed to submit audition');
    }
    setIsUploading(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center"><Video className="w-5 h-5 mr-2 text-gold" />LVLUP Audition</CardTitle>
          <CardDescription>Record a 30–45 second audition following the instructions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                {!recordedVideo ? (
                  <>
                    <video ref={videoRef} className="w-full h-full object-cover" muted />
                    {!isRecording && (
                      <div className="absolute inset-0 grid place-items-center text-gray-500">
                        <Camera className="w-10 h-10 mb-2" />
                        <p>Click Start Recording</p>
                      </div>
                    )}
                    {isRecording && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">REC</div>
                    )}
                  </>
                ) : (
                  <video ref={recordedVideoRef} className="w-full h-full object-cover" controls />
                )}
              </div>
              <div className="flex gap-2">
                {!recordedVideo ? (
                  <Button onClick={isRecording ? stopRecording : startRecording} className={`flex-1 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gold hover:bg-gold/90'}`}>
                    {isRecording ? (<><StopCircle className="w-4 h-4 mr-2" /> Stop</>) : (<><PlayCircle className="w-4 h-4 mr-2" /> Start</>)}
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => { setRecordedVideo(null); if (recordedVideoRef.current) recordedVideoRef.current.src = ''; }} variant="outline" className="flex-1">
                      <Camera className="w-4 h-4 mr-2" /> Record Again
                    </Button>
                    <Button onClick={submitAudition} disabled={isUploading} className="flex-1 bg-green-600 hover:bg-green-700">
                      {isUploading ? (<div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />) : (<Upload className="w-4 h-4 mr-2" />)}
                      Submit
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Tips</h4>
                <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                  <li>Good lighting, clear audio</li>
                  <li>State full name, BIGO ID, date/time</li>
                  <li>Say you are auditioning for LVLUP AGENCY</li>
                </ul>
              </div>
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">Time Limit</h4>
                <p className="text-sm text-yellow-900">30–45 seconds, auto-stop at 45s</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Landing page with onboarding agent
function LandingPage({ onGetStarted, user }) {
  const [showAudition, setShowAudition] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentInput, setAgentInput] = useState('');
  const aliasRef = useRef(null);

  useEffect(() => {
    // random alias once
    if (!aliasRef.current) {
      const names = ['EchoRae', 'NovaLyric', 'ShadowWave', 'StarMint', 'VibeMuse', 'LunaVerse'];
      aliasRef.current = names[Math.floor(Math.random() * names.length)];
    }
    // auto-open once per session after 2s
    const greeted = sessionStorage.getItem('agent_greeted');
    const timer = setTimeout(() => {
      if (!greeted) {
        setShowAgent(true);
        setAgentMessages([{ role: 'assistant', content: `Hey! I’m ${aliasRef.current}, your LVLUP onboarding coach. Want help auditioning or learning how much you could earn?` }]);
        sessionStorage.setItem('agent_greeted', '1');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const sendAgentMessage = async () => {
    if (!agentInput.trim()) return;
    const msg = agentInput.trim();
    setAgentMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setAgentInput('');
    if (!user) {
      setAgentMessages((prev) => [...prev, { role: 'assistant', content: 'Please login to chat with the coach. Tap Login above to continue.' }]);
      return;
    }
    try {
      const { data } = await axios.post(`${API}/ai/chat`, { message: msg, chat_type: 'onboarding', use_research: false });
      const text = data?.response || 'Got it.';
      setAgentMessages((prev) => [...prev, { role: 'assistant', content: text }]);
    } catch (e) {
      setAgentMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I had trouble responding. Try again.' }]);
    }
  };

  const handleAgentKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAgentMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100 relative">
      <SEOMeta />
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border-2 border-gold overflow-hidden">
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-8/artifacts/tphzssiq_IMG_6004.webp" alt="LVLUP Logo" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-100">LVLUP AGENCY</h1>
            <p className="text-gold text-sm">Elite BIGO Live Host Network</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button onClick={() => { window.location.href = '/dashboard'; }} className="bg-gold hover:bg-gold/90 text-white font-bold px-6">Dashboard</Button>
          ) : (
            <>
              <Button onClick={onGetStarted} variant="outline" className="border-gold text-gold hover:bg-gold/10">Login</Button>
              <Button onClick={() => setShowAudition(true)} className="bg-gold hover:bg-gold/90 text-white font-bold px-6">Start Audition</Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-white">MAKE MONEY FROM YOUR PHONE</h1>
        <h2 className="text-xl md:text-2xl text-gray-200 mb-8 max-w-4xl mx-auto">Join LVLUP AGENCY – The #1 BIGO Live host network. Earn $500–$5000+ monthly. Free training included.</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button onClick={() => setShowAudition(true)} size="lg" className="bg-gold hover:bg-gold/90 text-white font-bold text-xl px-10 py-5"><Video className="w-6 h-6 mr-2" /> START VIDEO AUDITION</Button>
          <Button onClick={() => window.open('https://wa.me/12892005372', '_blank')} variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-900/20 text-lg px-8 py-5"><Phone className="w-5 h-5 mr-2" /> WhatsApp: 289-200-5372</Button>
        </div>
      </section>

      {/* Category Highlights */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-serif font-bold text-center mb-16 text-white">Join Our Elite Network of Successful Hosts</h2>
        {/* Artists & Creatives */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-24">
          <div>
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/btd98w68_IMG_6006.webp" alt="Artists Go Live & Earn - LVLUP AGENCY" className="w-full rounded-xl shadow-2xl border border-gold/20" loading="lazy" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-3">Artists & Creatives</h3>
            <p className="text-gray-100 mb-6">Share your talent and monetize your art on BIGO Live.</p>
            <Button onClick={() => setShowAudition(true)} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
        </div>
        {/* Wellness & Lifestyle */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-24">
          <div className="order-2 md:order-1">
            <h3 className="text-3xl font-bold text-white mb-3">Wellness & Lifestyle</h3>
            <p className="text-gray-100 mb-6">Share your wellness journey and inspire others while earning.</p>
            <Button onClick={() => setShowAudition(true)} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
          <div className="order-1 md:order-2">
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/hn7bkjkl_IMG_6007.webp" alt="Wellness & Lifestyle Hosts - LVLUP AGENCY" className="w-full rounded-xl shadow-2xl border border-gold/20" loading="lazy" />
          </div>
        </div>
        {/* Entertainment & Fun */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/6louc2s4_IMG_6008.webp" alt="Entertainment Hosts - LVLUP AGENCY" className="w-full rounded-xl shadow-2xl border border-gold/20" loading="lazy" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-3">Entertainment & Fun</h3>
            <p className="text-gray-100 mb-6">Bring joy and entertainment while building your income stream.</p>
            <Button onClick={() => setShowAudition(true)} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
        </div>
      </section>

      {/* Why Choose LVLUP */}
      <section className="bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center mb-16 text-white">Why Choose LVLUP AGENCY?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <DollarSign className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-white mb-2">Top Earnings</h3>
              <p className="text-gray-200">Earn $500–$5000+ monthly with our proven strategies.</p>
            </Card>
            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <Users className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-white mb-2">Expert Coaching</h3>
              <p className="text-gray-200">Get personalized training from top BIGO Live experts.</p>
            </Card>
            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <Clock className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-white mb-2">Flexible Schedule</h3>
              <p className="text-gray-200">Work when you want – set your own streaming hours.</p>
            </Card>
            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <Trophy className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-white mb-2">Proven Success</h3>
              <p className="text-gray-200">Join 1000+ successful hosts in our elite network.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Big CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-serif font-bold mb-6 text-white">Ready to Start Earning from Your Phone?</h2>
        <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">Join LVLUP AGENCY today and transform your BIGO Live experience. Our proven system helps hosts maximize earnings while building amazing communities. <strong>Start your audition now!</strong></p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={() => setShowAudition(true)} size="lg" className="bg-gold hover:bg-gold/90 text-white font-bold text-xl px-10 py-5"><Video className="w-6 h-6 mr-2" /> Start Video Audition</Button>
          <Button onClick={() => window.open('https://wa.me/12892005372?text=Hi%20I%27m%20interested%20in%20joining%20LVLUP%20AGENCY', '_blank')} variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-900/20 text-xl px-10 py-5"><Phone className="w-6 h-6 mr-2" /> WhatsApp Us</Button>
        </div>
      </section>

      {/* Onboarding Agent Bubble + Panel */}
      <div className="fixed bottom-6 right-6 z-50">
        <div id="agent-launch" className="rounded-full border-2 border-gold shadow-lg overflow-hidden cursor-pointer" onClick={() => setShowAgent(true)}>
          <img src="https://customer-assets.emergentagent.com/job_host-dashboard-8/artifacts/tphzssiq_IMG_6004.webp" alt="Agent" className="w-14 h-14 object-cover" />
        </div>
        {showAgent && (
          <div className="absolute bottom-16 right-0 w-[360px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gold/30 overflow-hidden">
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-gold"><img src="https://customer-assets.emergentagent.com/job_host-dashboard-8/artifacts/tphzssiq_IMG_6004.webp" alt="" className="w-full h-full object-cover" /></div>
                <div>
                  <p className="text-sm font-semibold">{aliasRef.current || 'Coach'}</p>
                  <p className="text-[11px] text-gray-300">LVLUP Onboarding Agent</p>
                </div>
              </div>
              <button onClick={() => setShowAgent(false)} className="text-gray-300 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="h-64 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {agentMessages.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-gold text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>{m.content}</div>
                </div>
              ))}
              {!user && (
                <div className="text-xs text-gray-600">Tip: Login to chat and get personalized help.</div>
              )}
            </div>
            <div className="border-t p-2 bg-white">
              <div className="flex items-center gap-2">
                <input value={agentInput} onChange={(e) => setAgentInput(e.target.value)} onKeyDown={handleAgentKey} placeholder={user ? 'Type your question…' : 'Login to chat'} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                <Button size="sm" className="bg-gold hover:bg-gold/90" onClick={sendAgentMessage}>Send</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Button variant="outline" size="sm" className="text-gray-800 border-gray-300 hover:bg-gray-100" onClick={() => setAgentInput('How do I audition?')}>How do I audition?</Button>
                <Button variant="outline" size="sm" className="text-gray-800 border-gray-300 hover:bg-gray-100" onClick={() => setAgentInput('How much can I earn?')}>How much can I earn?</Button>
                <Button variant="outline" size="sm" className="text-gray-800 border-gray-300 hover:bg-gray-100" onClick={() => setAgentInput('What is the schedule like?')}>What is the schedule like?</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer minimal */}
      <footer className="mt-24 border-t border-gray-800">
        <div className="container mx-auto px-4 py-10 text-center text-gray-300 text-sm">
          © {new Date().getFullYear()} LVLUP AGENCY. All rights reserved.
        </div>
      </footer>

      {/* Modals */}
      <VideoAuditionModal isOpen={showAudition} onClose={() => setShowAudition(false)} onSuccess={() => setShowAudition(false)} />
    </div>
  );
}

// Auth (Login/Register)
function AuthPage({ onBack }) {
  const [bigoId, setBigoId] = useState('');
  const [password, setPassword] = useState('');
  const [authTab, setAuthTab] = useState(localStorage.getItem('authTab') || 'login');
  const [formData, setFormData] = useState({ name: '', email: '', timezone: 'UTC', passcode: '' });
  const { login, register } = useAuth();

  useEffect(() => { localStorage.setItem('authTab', authTab); }, [authTab]);

  const handleLogin = async (e) => { e.preventDefault(); await login(bigoId, password); };
  const handleRegister = async (e) => { e.preventDefault(); await register({ bigo_id: bigoId, password, ...formData }); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SEOMeta />
      <Card className="w-full max-w-md mx-4 bg-white border-gold/20 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-serif text-gray-900">LVLUP AGENCY</CardTitle>
            <CardDescription className="text-gray-600">Elite BIGO Live Host Network</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={authTab} onValueChange={(v) => setAuthTab(v)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login">Host Login</TabsTrigger>
              <TabsTrigger value="register">Join Agency</TabsTrigger>
              <TabsTrigger value="admin">Admin Login</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="bigo-id">BIGO ID</Label>
                  <Input id="bigo-id" type="text" value={bigoId} onChange={(e) => setBigoId(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
                </div>
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">Access Dashboard</Button>
              </form>
            </TabsContent>
            <TabsContent value="admin">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-bigo-id">Admin BIGO ID</Label>
                  <Input id="admin-bigo-id" type="text" placeholder="Admin" value={bigoId} onChange={(e) => setBigoId(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="admin-password">Password</Label>
                  <Input id="admin-password" type="password" placeholder="admin333" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
                </div>
                <p className="text-xs text-gray-500">Tip: Register with passcode ADMIN2025 to create an admin.</p>
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">Admin Access</Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reg-bigo-id">BIGO ID *</Label>
                    <Input id="reg-bigo-id" type="text" value={bigoId} onChange={(e) => setBigoId(e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="name">Display Name *</Label>
                    <Input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reg-password">Password *</Label>
                  <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="passcode">Agency Code (if provided)</Label>
                  <Input id="passcode" type="password" value={formData.passcode} onChange={(e) => setFormData({ ...formData, passcode: e.target.value })} className="mt-1" />
                </div>
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">Create Host Account</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-800">← Back to Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard shell (panels placeholder text; API wiring in backend)
function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('ai');
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'coach';

  const NavItem = ({ id, label, icon: Icon }) => (
    <button onClick={() => setTab(id)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left ${tab === id ? 'bg-gold/20 text-gold' : 'text-gray-700 hover:bg-gray-100'}`}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center"><Crown className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">LVLUP AGENCY Dashboard</h1>
              <p className="text-xs text-gray-500">Welcome, {user?.name} • <span className="capitalize">{user?.role}</span></p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gold text-white">Points: {user?.total_points ?? 0}</Badge>
            <Button variant="outline" onClick={() => window.location.href = '/'}>Landing</Button>
            <Button onClick={logout} className="bg-gray-900 hover:bg-black text-white">Logout</Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-gray-200 h-[calc(100vh-64px)] sticky top-16 p-4 bg-white">
          <div className="space-y-2">
            <NavItem id="calendar" label="Calendar" icon={CalendarIcon} />
            <NavItem id="messages" label="Messages" icon={MessageSquare} />
            <NavItem id="academy" label="BIGO Academy" icon={BookOpen} />
            <NavItem id="tasks" label="Tasks" icon={Target} />
            <NavItem id="rewards" label="Rewards" icon={Gift} />
            <NavItem id="quizzes" label="Quizzes" icon={FileText} />
            <NavItem id="announcements" label="Announcements" icon={Bell} />
            <NavItem id="quota" label="Beans / Quota" icon={Calculator} />
            <NavItem id="pk" label="PK Sign-ups" icon={Trophy} />
            <NavItem id="ai" label="AI Coach" icon={Bot} />
            {isAdmin && (
              <>
                <div className="mt-4 text-xs uppercase tracking-wide text-gray-400">Admin</div>
                <NavItem id="users" label="Users" icon={Users2} />
                <NavItem id="content" label="Content Manager" icon={Settings} />
                <NavItem id="auditions" label="Auditions" icon={Video} />
                <NavItem id="leads" label="Leads / Recruiting" icon={Search} />
                <NavItem id="adminAgent" label="Admin Agent" icon={Command} />
              </>
            )}
          </div>
        </aside>

        <main className="flex-1 p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white border-gray-200 lg:col-span-2"><CardHeader><CardTitle>Welcome back, {user?.name}</CardTitle></CardHeader><CardContent><p className="text-gray-700">Select a panel from the left to get started.</p></CardContent></Card>
            <Card className="bg-white border-gray-200"><CardContent className="p-6"><p className="text-sm text-gray-600">Points</p><p className="text-3xl font-bold text-gold">{user?.total_points ?? 0}</p></CardContent></Card>
          </div>

          {tab === 'ai' && (
            <Card className="bg-white border-gray-200">
              <CardHeader><CardTitle>AI Coach</CardTitle></CardHeader>
              <CardContent><p className="text-gray-700">Chat with your AI coach. Voice and research mode (admin-only) coming online.</p></CardContent>
            </Card>
          )}

          {tab === 'quizzes' && (
            <Card className="bg-white border-gray-200"><CardHeader><CardTitle>Quizzes</CardTitle></CardHeader><CardContent><p className="text-gray-700">Generate quizzes (admins/coaches) and take quizzes (hosts).</p></CardContent></Card>
          )}

          {/* Other panels placeholders; connect to API as data is ready */}
          {tab === 'calendar' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Community Calendar</CardTitle></CardHeader><CardContent><p className="text-gray-700">View events, RSVP, and attendees.</p></CardContent></Card>)}
          {tab === 'messages' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Messages</CardTitle></CardHeader><CardContent><p className="text-gray-700">Agency Lounge and DMs.</p></CardContent></Card>)}
          {tab === 'academy' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>BIGO Academy</CardTitle></CardHeader><CardContent><p className="text-gray-700">Resources library.</p></CardContent></Card>)}
          {tab === 'tasks' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Tasks</CardTitle></CardHeader><CardContent><p className="text-gray-700">Your tasks and submissions.</p></CardContent></Card>)}
          {tab === 'rewards' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Rewards</CardTitle></CardHeader><CardContent><p className="text-gray-700">Redeem points.</p></CardContent></Card>)}
          {tab === 'announcements' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Announcements</CardTitle></CardHeader><CardContent><p className="text-gray-700">Agency-wide updates.</p></CardContent></Card>)}
          {tab === 'quota' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Beans / Quota</CardTitle></CardHeader><CardContent><p className="text-gray-700">Bean-to-tier calculator and strategy.</p></CardContent></Card>)}
          {tab === 'pk' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>PK Sign-ups</CardTitle></CardHeader><CardContent><p className="text-gray-700">Register for PK events.</p></CardContent></Card>)}
          {isAdmin && tab === 'users' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent><p className="text-gray-700">Manage users & roles.</p></CardContent></Card>)}
          {isAdmin && tab === 'content' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Content Manager</CardTitle></CardHeader><CardContent><p className="text-gray-700">Create tasks/quizzes/rewards/announcements.</p></CardContent></Card>)}
          {isAdmin && tab === 'auditions' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Auditions</CardTitle></CardHeader><CardContent><p className="text-gray-700">Review and manage auditions.</p></CardContent></Card>)}
          {isAdmin && tab === 'leads' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Leads / Recruiting</CardTitle></CardHeader><CardContent><p className="text-gray-700">Search influencers, export, and outreach.</p></CardContent></Card>)}
          {isAdmin && tab === 'adminAgent' && (<Card className="bg-white border-gray-200"><CardHeader><CardTitle>Admin Agent</CardTitle></CardHeader><CardContent><p className="text-gray-700">Natural-language site management.</p></CardContent></Card>)}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('landing');

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <SEOMeta />
        <div className="text-center text-gray-600">Loading LVLUP AGENCY…</div>
      </div>
    );
  }

  const RequireAuth = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            currentView === 'landing' ? (
              <LandingPage onGetStarted={() => setCurrentView('auth')} user={user} />
            ) : (
              <AuthPage onBack={() => setCurrentView('landing')} />
            )
          } />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;