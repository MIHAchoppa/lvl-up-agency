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
  Calendar, 
  Bell, 
  Settings,
  LogOut,
  Plus,
  CheckCircle,
  Clock,
  Star,
  Gift,
  MessageSquare,
  Home,
  BookOpen,
  Target,
  Award,
  Menu,
  X,
  Bot,
  DollarSign,
  BarChart3,
  Camera,
  Send,
  Eye,
  TrendingUp,
  Zap,
  Play,
  Users2,
  CalendarDays,
  FileText,
  Lightbulb,
  Calculator,
  PieChart,
  Youtube,
  Mic,
  MicOff,
  Volume2,
  VolumeOff,
  Search,
  Download,
  Mail,
  Phone,
  UserPlus,
  Command,
  Sparkles,
  Headphones,
  Video,
  Upload,
  PlayCircle,
  StopCircle,
  Pause,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';

// UI Components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SEO Meta Component
function SEOMeta() {
  useEffect(() => {
    document.title = "LVLUP AGENCY - #1 BIGO Live Host Success Platform | Join Elite Network";
    
    const existingMetas = document.querySelectorAll('meta[data-seo]');
    existingMetas.forEach(meta => meta.remove());
    
    const metas = [
      { name: "description", content: "Join LVLUP AGENCY - The #1 BIGO Live host network! Get professional coaching, earn top tier money, and join elite hosts. WhatsApp Audition: 289-200-5372" },
      { name: "keywords", content: "BIGO Live jobs, live streaming work, make money from phone, BIGO host agency, live streaming jobs, work from home, LVLUP AGENCY, BIGO Live earnings" },
      { name: "author", content: "LVLUP AGENCY" },
      { property: "og:title", content: "LVLUP AGENCY - Elite BIGO Live Host Network" },
      { property: "og:description", content: "Make money from your phone! Join 1000+ successful BIGO Live hosts earning $500-$5000+ monthly. Free training provided. WhatsApp: 289-200-5372" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/v5hjw882_IMG_6003.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "LVLUP AGENCY - BIGO Live Host Jobs" },
      { name: "robots", content: "index, follow" }
    ];
    
    metas.forEach(meta => {
      const metaTag = document.createElement('meta');
      Object.keys(meta).forEach(key => {
        metaTag.setAttribute(key, meta[key]);
      });
      metaTag.setAttribute('data-seo', 'true');
      document.head.appendChild(metaTag);
    });
  }, []);
  
  return null;
}

// Auth Context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      logout();
    }
    setLoading(false);
  };

  const login = async (bigoId, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        bigo_id: bigoId,
        password: password
      });
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      toast.success(`Welcome back, ${userData.name}!`);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err).join(', ');
        } else {
          errorMessage = 'Invalid login credentials';
        }
      }
      toast.error(errorMessage);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      setToken(access_token);
      setUser(newUser);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      toast.success(`Welcome to LVLUP AGENCY, ${newUser.name}!`);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err).join(', ');
        } else {
          errorMessage = 'Registration failed - please check your details';
        }
      }
      toast.error(errorMessage);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Video Audition Component
function VideoAuditionModal({ isOpen, onClose, onSuccess }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const recordedVideoRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedVideo(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);

      // Auto stop after 45 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording();
        }
      }, 45000);

    } catch (error) {
      toast.error('Camera access denied. Please allow camera and microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const submitAudition = async () => {
    if (!recordedVideo) {
      toast.error('Please record your audition video first');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audition_video', recordedVideo, 'audition.webm');

      // In production, this would upload to your server
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Audition submitted successfully! You will be contacted within 24 hours.');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to submit audition. Please try again.');
    }
    setIsUploading(false);
  };

  const resetRecording = () => {
    setRecordedVideo(null);
    if (recordedVideoRef.current) {
      recordedVideoRef.current.src = '';
    }
  };

  useEffect(() => {
    if (recordedVideo && recordedVideoRef.current) {
      const url = URL.createObjectURL(recordedVideo);
      recordedVideoRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [recordedVideo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Video className="w-6 h-6 mr-2 text-gold" />
            LVLUP AGENCY - Video Audition
          </CardTitle>
          <CardDescription>
            Record your 30-45 second audition video following the instructions below
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gold/10 p-4 rounded-lg border border-gold/20">
            <h4 className="font-semibold text-gray-900 mb-2">📝 AUDITION REQUIREMENTS</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p>Please state clearly in your video:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Your full name</strong></li>
                <li><strong>Your BIGO ID</strong> (found below your name on BIGO profile)</li>
                <li><strong>"I'm auditioning for LVLUP AGENCY"</strong></li>
                <li><strong>Current date and time</strong></li>
                <li><strong>What you plan to do on BIGO Live</strong></li>
              </ul>
              <p className="text-gold font-semibold">Keep it short and simple - we just want to see if you can follow directions!</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recording Section */}
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                {!recordedVideo ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover"
                      muted
                    />
                    {!isRecording && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Click Start Recording</p>
                        </div>
                      </div>
                    )}
                    {isRecording && (
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded text-sm flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        RECORDING
                      </div>
                    )}
                  </>
                ) : (
                  <video 
                    ref={recordedVideoRef} 
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
              </div>

              <div className="flex space-x-2">
                {!recordedVideo ? (
                  <>
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex-1 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gold hover:bg-gold/90'}`}
                    >
                      {isRecording ? (
                        <><StopCircle className="w-4 h-4 mr-2" /> Stop Recording</>
                      ) : (
                        <><PlayCircle className="w-4 h-4 mr-2" /> Start Recording</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={resetRecording} variant="outline" className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      Record Again
                    </Button>
                    <Button 
                      onClick={submitAudition}
                      disabled={isUploading}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      {isUploading ? (
                        <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Submit Audition
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Good lighting on your face</li>
                  <li>• Speak clearly and confidently</li>
                  <li>• Look directly at the camera</li>
                  <li>• Quiet background</li>
                  <li>• Smile and be yourself!</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">🎯 Example Script</h4>
                <p className="text-sm text-green-800 italic">
                  "Hi! My name is [Your Name], my BIGO ID is [Your ID]. I'm auditioning for LVLUP AGENCY. 
                  Today is [Date] at [Time]. I plan to [stream dancing/singing/chatting/etc.] on BIGO Live and build an amazing community!"
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">⏱️ Time Limit</h4>
                <p className="text-sm text-yellow-800">
                  Keep your audition between <strong>30-45 seconds</strong>. Recording will auto-stop at 45 seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced Landing Page with Light Theme
function LandingPage({ onGetStarted, user }) {
  const [showAudition, setShowAudition] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100">
      <SEOMeta />
      
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border-2 border-gold overflow-hidden">
            <img
              src="https://customer-assets.emergentagent.com/job_host-dashboard-8/artifacts/tphzssiq_IMG_6004.webp"
              alt="LVLUP Logo"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-100">LVLUP AGENCY</h1>
            <p className="text-gold text-sm">Elite BIGO Live Host Network</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <Button 
              onClick={() => window.location.reload()}
              className="bg-gold hover:bg-gold/90 text-white font-bold px-6"
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Button 
                onClick={onGetStarted}
                variant="outline"
                className="border-gold text-gold hover:bg-gold/10"
              >
                Login
              </Button>
              <Button 
                onClick={onGetStarted}
                className="bg-gold hover:bg-gold/90 text-white font-bold px-6"
              >
                Start Audition
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/v5hjw882_IMG_6003.webp"
            alt="Agent Mihanna - LVLUP AGENCY"
            className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-gold shadow-xl object-cover" loading="lazy"
          />
          <h3 className="text-gold font-serif text-lg mb-2">Agent Mihanna Presents</h3>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-gray-100">
          MAKE MONEY FROM YOUR PHONE
        </h1>
        <h2 className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
          Join LVLUP AGENCY - The #1 BIGO Live host network! Earn $500-$5000+ monthly with our proven system. 
          <span className="text-gold font-semibold"> No experience needed - Free training provided!</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            onClick={() => setShowAudition(true)}
            size="lg"
            className="bg-gold hover:bg-gold/90 text-white font-bold text-xl px-12 py-6 shadow-lg"
          >
            <Video className="w-6 h-6 mr-2" />
            START VIDEO AUDITION
          </Button>
          <Button 
            onClick={() => window.open('https://wa.me/12892005372', '_blank')}
            variant="outline" 
            size="lg"
            className="border-green-500 text-green-400 hover:bg-green-900/20 text-lg px-8 py-6"
          >
            <Phone className="w-5 h-5 mr-2" />
            WhatsApp: 289-200-5372
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm text-gray-200">
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Free Training
          </div>
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Work From Home
          </div>
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Set Your Schedule  
          </div>
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            No Experience Needed
          </div>
        </div>
      </section>

      {/* Highlight Sections (Images spread across page) */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-serif font-bold text-center mb-16 text-gray-100">
          Join Our Elite Network of Successful Hosts
        </h2>

        {/* Artists & Creatives */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-24">
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/btd98w68_IMG_6006.webp"
              alt="Artists Go Live & Earn - LVLUP AGENCY"
              className="w-full rounded-xl shadow-2xl border border-gold/20"
              loading="lazy"
            />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-100 mb-3">Artists & Creatives</h3>
            <p className="text-gray-300 mb-6">Share your talent and monetize your art on BIGO Live.</p>
            <Button onClick={onGetStarted} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
        </div>

        {/* Wellness & Lifestyle */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-24">
          <div className="order-2 md:order-1">
            <h3 className="text-3xl font-bold text-gray-100 mb-3">Wellness & Lifestyle</h3>
            <p className="text-gray-300 mb-6">Share your wellness journey and inspire others while earning.</p>
            <Button onClick={onGetStarted} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
          <div className="order-1 md:order-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/hn7bkjkl_IMG_6007.webp"
              alt="Wellness & Lifestyle Hosts - LVLUP AGENCY"
              className="w-full rounded-xl shadow-2xl border border-gold/20"
              loading="lazy"
            />
          </div>
        </div>

        {/* Entertainment & Fun */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_host-dashboard-6/artifacts/6louc2s4_IMG_6008.webp"
              alt="Entertainment Hosts - LVLUP AGENCY"
              className="w-full rounded-xl shadow-2xl border border-gold/20"
              loading="lazy"
            />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-100 mb-3">Entertainment & Fun</h3>
            <p className="text-gray-300 mb-6">Bring joy and entertainment while building your income stream.</p>
            <Button onClick={onGetStarted} className="bg-gold hover:bg-gold/90 text-white">Apply Now</Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center mb-16 text-gray-100">
            Why Choose LVLUP AGENCY?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <DollarSign className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Top Earnings</h3>
              <p className="text-gray-600">Earn $500-$5000+ monthly with our proven strategies</p>
            </Card>

            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <Users className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Expert Coaching</h3>
              <p className="text-gray-600">Get personalized training from top BIGO Live experts</p>
            </Card>

            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <Clock className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Flexible Schedule</h3>
              <p className="text-gray-600">Work when you want - set your own streaming hours</p>
            </Card>

            <Card className="bg-black/40 border border-gold/20 hover:shadow-lg transition-shadow text-center p-6">
              <Trophy className="w-12 h-12 text-gold mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Proven Success</h3>
              <p className="text-gray-600">Join 1000+ successful hosts in our elite network</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-serif font-bold mb-8 text-gray-900">
          Ready to Start Earning from Your Phone?
        </h2>
        <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
          Join LVLUP AGENCY today and transform your BIGO Live experience. Our proven system helps hosts 
          maximize earnings while building amazing communities. <strong>Start your audition now!</strong>
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={() => setShowAudition(true)}
            size="lg"
            className="bg-gold hover:bg-gold/90 text-white font-bold text-xl px-12 py-6"
          >
            <Video className="w-6 h-6 mr-2" />
            Start Video Audition Now
          </Button>
          <Button 
            onClick={() => window.open('https://wa.me/12892005372?text=Hi%20I%27m%20interested%20in%20joining%20LVLUP%20AGENCY', '_blank')}
            variant="outline"
            size="lg" 
            className="border-green-500 text-green-600 hover:bg-green-50 text-xl px-12 py-6"
          >
            <Phone className="w-6 h-6 mr-2" />
            WhatsApp Us: 289-200-5372
          </Button>
        </div>
      </section>

      {/* Video Audition Modal */}
      <VideoAuditionModal 
        isOpen={showAudition}
        onClose={() => setShowAudition(false)}
        onSuccess={() => {
          toast.success('Thank you! We will contact you within 24 hours.');
          setShowAudition(false);
        }}
      />
    </div>
  );
}

// Guest Preview Component
function GuestPreview() {
  const [currentView, setCurrentView] = useState('home');

  const previewStats = {
    totalUsers: 1247,
    activeHosts: 892,
    totalEarnings: '$2,847,593',
    avgMonthlyEarning: '$3,247'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guest Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">LVLUP AGENCY</h1>
              <p className="text-xs text-gold">Guest Preview Mode</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm">
              <Lock className="w-4 h-4 mr-1" />
              Limited Access
            </div>
            <Button size="sm" className="bg-gold hover:bg-gold/90 text-white">
              Join Now
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Guest Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 h-screen">
          <div className="p-4 space-y-2">
            {[
              { id: 'home', label: 'Dashboard Preview', icon: Home },
              { id: 'stats', label: 'Success Stats', icon: BarChart3 },
              { id: 'earnings', label: 'Earning Potential', icon: DollarSign },
              { id: 'training', label: 'Training Preview', icon: BookOpen },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    currentView === item.id 
                      ? 'bg-gold/20 text-gold' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          
          <div className="mt-8 p-4">
            <div className="bg-gold/10 p-4 rounded-lg border border-gold/20">
              <h4 className="font-semibold text-gold mb-2">🔐 Unlock Full Access</h4>
              <p className="text-xs text-gray-600 mb-3">
                Join LVLUP AGENCY to access all features, training, and start earning!
              </p>
              <Button size="sm" className="w-full bg-gold hover:bg-gold/90 text-white">
                Start Audition
              </Button>
            </div>
          </div>
        </div>

        {/* Guest Content */}
        <div className="flex-1 p-6">
          {currentView === 'home' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gold/10 to-yellow-500/10 rounded-xl p-6 border border-gold/20">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                  Welcome to LVLUP AGENCY Preview! 👑
                </h1>
                <p className="text-gray-700">See what our elite BIGO Live hosts have access to...</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Network Hosts</p>
                        <p className="text-3xl font-bold text-gold">{previewStats.totalUsers}</p>
                      </div>
                      <Users className="w-8 h-8 text-gold" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active This Month</p>
                        <p className="text-3xl font-bold text-green-600">{previewStats.activeHosts}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                        <p className="text-3xl font-bold text-purple-600">{previewStats.totalEarnings}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Monthly</p>
                        <p className="text-3xl font-bold text-gold">{previewStats.avgMonthlyEarning}</p>
                      </div>
                      <Trophy className="w-8 h-8 text-gold" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-gray-200 relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-100 text-yellow-700">Preview Mode</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Your Earning Potential</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-700">Tier S10 Goal</h4>
                        <p className="text-2xl font-bold text-green-600">$2,120/month</p>
                        <p className="text-sm text-green-600">1.5M beans required</p>
                      </div>
                      <div className="blur-sm">
                        <p className="text-gray-600">Unlock to see your personalized earning strategy...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-100 text-yellow-700">Preview Mode</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Training Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">BIGO Live Basics</p>
                          <p className="text-sm text-gray-600">Complete beginner guide</p>
                        </div>
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="blur-sm space-y-2">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">Advanced PK strategies...</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">Bean optimization guide...</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {currentView === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Success Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Host Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Average Monthly Growth</span>
                          <span>247%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Success Rate</span>
                          <span>94.3%</span>
                        </div>
                        <Progress value={94} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Earnings Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="blur-sm">
                    <p className="text-gray-600">Unlock to see detailed earnings breakdown...</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {currentView === 'earnings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Earning Potential Calculator</h2>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl border">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Potential Monthly Earnings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">$890</div>
                    <div className="text-sm text-gray-600">Beginner Level</div>
                    <div className="text-xs text-gray-500">2-3 hours/day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">$2,340</div>
                    <div className="text-sm text-gray-600">Intermediate</div>
                    <div className="text-xs text-gray-500">4-5 hours/day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">$5,120</div>
                    <div className="text-sm text-gray-600">Advanced</div>
                    <div className="text-xs text-gray-500">6+ hours/day</div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <Button className="bg-gold hover:bg-gold/90">
                    Unlock Personal Calculator
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'training' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Training Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PlayCircle className="w-5 h-5 mr-2 text-gold" />
                      Available Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium text-green-900">BIGO Live Quick Start</p>
                          <p className="text-sm text-green-700">✓ Free Preview Available</p>
                        </div>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">View</Button>
                      </div>
                      <div className="opacity-50">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-600">Advanced Bean Strategy</p>
                            <p className="text-sm text-gray-500">🔒 Members Only</p>
                          </div>
                          <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      <div className="opacity-50">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-600">PK Battle Mastery</p>
                            <p className="text-sm text-gray-500">🔒 Members Only</p>
                          </div>
                          <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Auth Components (Login/Register)
function AuthPage({ onBack }) {
  const [bigoId, setBigoId] = useState('');
  const [password, setPassword] = useState('');
  const [authTab, setAuthTab] = useState(localStorage.getItem('authTab') || 'login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    timezone: 'UTC',
    passcode: ''
  });
  const { login, register } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    await login(bigoId, password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const userData = {
      bigo_id: bigoId,
      password: password,
      ...formData
    };
    await register(userData);
  };

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
          <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Host Login</TabsTrigger>
              <TabsTrigger value="register">Join Agency</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="bigo-id">BIGO ID</Label>
                  <Input
                    id="bigo-id"
                    type="text"
                    placeholder="Enter your BIGO ID"
                    value={bigoId}
                    onChange={(e) => setBigoId(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">
                  Access Dashboard
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reg-bigo-id">BIGO ID *</Label>
                    <Input
                      id="reg-bigo-id"
                      type="text"
                      placeholder="Your BIGO ID"
                      value={bigoId}
                      onChange={(e) => setBigoId(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Display Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reg-password">Password *</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="passcode">Agency Code (if provided)</Label>
                  <Input
                    id="passcode"
                    type="password"
                    placeholder="Enter agency code if provided"
                    value={formData.passcode}
                    onChange={(e) => setFormData({...formData, passcode: e.target.value})}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Get special access with agency code</p>
                </div>
                
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">
                  Create Host Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard placeholder (existing dashboard would go here)
function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Dashboard, {user?.name}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your full LVLUP AGENCY dashboard is being loaded...</p>
            <div className="mt-4">
              <Badge className="bg-gold text-white">Role: {user?.role}</Badge>
              <Badge className="ml-2 bg-green-500 text-white">Points: {user?.total_points}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('landing');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <SEOMeta />
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading LVLUP AGENCY...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show dashboard
  if (user) {
    return (
      <div className="App">
        <Dashboard />
        <Toaster position="top-right" />
      </div>
    );
  }

  // For non-logged in users
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            currentView === 'landing' ? (
              <LandingPage onGetStarted={() => setCurrentView('auth')} user={user} />
            ) : currentView === 'auth' ? (
              <AuthPage onBack={() => setCurrentView('landing')} />
            ) : (
              <GuestPreview />
            )
          } />
          <Route path="/preview" element={<GuestPreview />} />
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