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

// Dashboard Panels
import CalendarPanel from './components/dashboard/CalendarPanel';
import MessagesPanel from './components/dashboard/MessagesPanel';
import AcademyPanel from './components/dashboard/AcademyPanel';
import TasksPanel from './components/dashboard/TasksPanel';
import RewardsPanel from './components/dashboard/RewardsPanel';
import AnnouncementsPanel from './components/dashboard/AnnouncementsPanel';
import QuotaPanel from './components/dashboard/QuotaPanel';
import PKPanel from './components/dashboard/PKPanel';
import AICoachPanel from './components/dashboard/AICoachPanel';
import UsersPanel from './components/dashboard/UsersPanel';
import ContentManagerPanel from './components/dashboard/ContentManagerPanel';
import AuditionsPanel from './components/dashboard/AuditionsPanel';
import LeadsPanel from './components/dashboard/LeadsPanel';
import AdminAgentPanel from './components/dashboard/AdminAgentPanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SEO meta helper
function SEOMeta() {
  useEffect(() => {
    document.title = 'LVL-UP AGENCY – Become a BIGO Host';
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
      toast.success(`Welcome to LVL-UP, ${u.name}!`);
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
          <CardTitle className="flex items-center"><Video className="w-5 h-5 mr-2 text-gold" />LVL-UP Audition</CardTitle>
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
                  <li>Say you are auditioning for LVL-UP AGENCY</li>
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
  const aliasRef = useRef('Lvl-Up');
  const greetingAudioRef = useRef(null);
  const [showPlayGreeting, setShowPlayGreeting] = useState(false);

  // Try to play TTS via backend (base64) then Web Speech fallback
  const playTTS = async (text) => {
    try {
      const { data } = await axios.post(`${API}/tts/speak`, { text, voice: 'Fritz-PlayAI', format: 'wav' });
      if (data?.audio_base64) {
        const src = `data:${data?.mime || 'audio/wav'};base64,${data.audio_base64}`;
        const audio = new Audio(src);
        greetingAudioRef.current = audio;
        await audio.play();
        setShowPlayGreeting(false);
        return true;
      }
      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0; utter.pitch = 1.0; utter.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        setShowPlayGreeting(false);
        return true;
      }
    } catch (e) {}
    setShowPlayGreeting(true);
    return false;
  };

  useEffect(() => {
    // fixed alias
    if (!aliasRef.current) aliasRef.current = 'Lvl-Up';
    // auto-open once per session after 2s
    const greeted = sessionStorage.getItem('agent_greeted');
    const timer = setTimeout(() => {
      if (!greeted) {
        setShowAgent(true);
        const greeting = `Hey! I’m ${aliasRef.current}, your LVL-UP onboarding agent. Want help auditioning or learning how much you could earn?`;
        setAgentMessages([{ role: 'assistant', content: greeting }]);
        sessionStorage.setItem('agent_greeted', '1');
        // Attempt TTS greeting
        playTTS(greeting);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const sendAgentMessage = async () => {
    if (!agentInput.trim()) return;
    const msg = agentInput.trim();
    setAgentMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setAgentInput('');
    try {
      const endpoint = user ? `${API}/ai/chat` : `${API}/public/ai/onboarding-chat`;
      const payload = user ? { message: msg, chat_type: 'onboarding', use_research: false } : { message: msg };
      const { data } = await axios.post(endpoint, payload);
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
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-8/artifacts/tphzssiq_IMG_6004.webp" alt="LVL-UP Logo" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-100">LVL-UP AGENCY</h1>
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
        <h2 className="text-xl md:text-2xl text-gray-200 mb-8 max-w-4xl mx-auto">Join LVL-UP AGENCY – The #1 BIGO Live host network. Earn $500–$5000+ monthly. Free training included.</h2>
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
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/btd98w68_IMG_6006.webp" alt="Artists Go Live & Earn - LVL-UP AGENCY" className="w-full rounded-xl shadow-2xl border border-gold/20" loading="lazy" />
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
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/hn7bkjkl_IMG_6007.webp" alt="Wellness & Lifestyle Hosts - LVL-UP AGENCY" className="w-full rounded-xl shadow-2xl border border-gold/20" loading="lazy" />
          </div>
        </div>
        {/* Entertainment & Fun */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <img src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/6louc2s4_IMG_6008.webp" alt="Entertainment Hosts - LVL-UP AGENCY" className="w-full rounded-xl shadow-2xl border border-gold/20" loading="lazy" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-3">Entertainment & Fun</h3>
            <p className="text-gray-100 mb-6">Bring joy and entertainment while building your income stream.</p>
            <Button onClick={() => setShowAudition(true)} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
        </div>
      </section>

      {/* Why Choose LVL-UP */}
      <section className="bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center mb-16 text-white">Why Choose LVL-UP AGENCY?</h2>
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
        <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">Join LVL-UP AGENCY today and transform your BIGO Live experience. Our proven system helps hosts maximize earnings while building amazing communities. <strong>Start your audition now!</strong></p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={() => setShowAudition(true)} size="lg" className="bg-gold hover:bg-gold/90 text-white font-bold text-xl px-10 py-5"><Video className="w-6 h-6 mr-2" /> Start Video Audition</Button>
          <Button onClick={() => window.open('https://wa.me/12892005372?text=Hi%20I%27m%20interested%20in%20joining%20LVL-UP%20AGENCY', '_blank')} variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-900/20 text-xl px-10 py-5"><Phone className="w-6 h-6 mr-2" /> WhatsApp Us</Button>
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
                  <p className="text-[11px] text-gray-300">LVL-UP Onboarding Agent</p>
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
          © {new Date().getFullYear()} LVL-UP AGENCY. All rights reserved.
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
            <CardTitle className="text-3xl font-serif text-gray-900">LVL-UP AGENCY</CardTitle>
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

// Dashboard with filled placeholders
function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('calendar');
  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'coach';

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOMeta />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border-2 border-gold overflow-hidden">
              <img src="https://customer-assets.emergentagent.com/job_host-dashboard-8/artifacts/tphzssiq_IMG_6004.webp" alt="LVL-UP Logo" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-gray-900">LVL-UP AGENCY</h1>
              <p className="text-gold text-sm">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.bigo_id}</p>
            </div>
            <Button onClick={logout} variant="outline" size="sm">Logout</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="flex gap-8">
          <TabsList className="flex flex-col w-48 space-y-1 bg-muted p-1 rounded-lg">
            <TabsTrigger value="calendar" className="w-full justify-start">Calendar</TabsTrigger>
            <TabsTrigger value="messages" className="w-full justify-start">Messages</TabsTrigger>
            <TabsTrigger value="academy" className="w-full justify-start">Academy</TabsTrigger>
            <TabsTrigger value="tasks" className="w-full justify-start">Tasks</TabsTrigger>
            <TabsTrigger value="rewards" className="w-full justify-start">Rewards</TabsTrigger>
            <TabsTrigger value="announcements" className="w-full justify-start">Announcements</TabsTrigger>
            <TabsTrigger value="quota" className="w-full justify-start">Quota</TabsTrigger>
            <TabsTrigger value="pk" className="w-full justify-start">PK</TabsTrigger>
            <TabsTrigger value="ai-coach" className="w-full justify-start">AI Coach</TabsTrigger>
            {isAdmin && <TabsTrigger value="users" className="w-full justify-start">Users</TabsTrigger>}
            {isAdmin && <TabsTrigger value="content-manager" className="w-full justify-start">Content</TabsTrigger>}
            {isAdmin && <TabsTrigger value="auditions" className="w-full justify-start">Auditions</TabsTrigger>}
            {isAdmin && <TabsTrigger value="leads" className="w-full justify-start">Leads</TabsTrigger>}
            {isAdmin && <TabsTrigger value="admin-agent" className="w-full justify-start">Admin Agent</TabsTrigger>}
          </TabsList>

          <div className="flex-1">
            <TabsContent value="calendar">
              <CalendarPanel />
            </TabsContent>

            <TabsContent value="messages">
              <MessagesPanel />
            </TabsContent>

            <TabsContent value="academy">
              <AcademyPanel />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksPanel user={user} />
            </TabsContent>

            <TabsContent value="rewards">
              <RewardsPanel user={user} />
            </TabsContent>

            <TabsContent value="announcements">
              <AnnouncementsPanel />
            </TabsContent>

            <TabsContent value="quota">
              <QuotaPanel />
            </TabsContent>

            <TabsContent value="pk">
              <PKPanel />
            </TabsContent>

            <TabsContent value="ai-coach">
              <AICoachPanel />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users">
                <UsersPanel />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="content-manager">
                <ContentManagerPanel />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="auditions">
                <AuditionsPanel />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="leads">
                <LeadsPanel />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="admin-agent">
                <AdminAgentPanel />
              </TabsContent>
            )}
          </div>
        </Tabs>
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
        <div className="text-center text-gray-600">Loading LVL-UP AGENCY…</div>
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