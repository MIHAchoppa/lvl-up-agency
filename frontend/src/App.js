import React, { useState, useEffect } from 'react';
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
  Youtube
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
    // Set page title and meta tags for SEO
    document.title = "Level Up Agency - #1 BIGO Live Host Success Platform | Earn More, Grow Faster";
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[data-seo]');
    existingMetas.forEach(meta => meta.remove());
    
    const metas = [
      { name: "description", content: "Join the #1 BIGO Live host success platform! Maximize earnings with AI coaching, task rewards, PK events & exclusive training. 1000+ successful hosts trust Level Up Agency." },
      { name: "keywords", content: "BIGO Live, host agency, live streaming, earn money online, BIGO hosts, PK battles, live streaming tips, host training, BIGO earnings, stream coaching" },
      { name: "author", content: "Level Up Agency" },
      { property: "og:title", content: "Level Up Agency - Transform Your BIGO Live Success" },
      { property: "og:description", content: "The ultimate platform for BIGO Live hosts to maximize earnings, master PK battles, and build massive audiences. Join 1000+ successful hosts!" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://levelupagency.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Level Up Agency - BIGO Live Host Success Platform" },
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
      toast.success(`Welcome to Level Up, ${newUser.name}!`);
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

// Landing Page Component with SEO
function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white">
      <SEOMeta />
      
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold">Level Up Agency</h1>
        </div>
        <Button 
          onClick={onGetStarted}
          className="bg-gold hover:bg-gold/90 text-black font-bold px-6"
        >
          Get Started Free
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent">
          Transform Your BIGO Live Success
        </h1>
        <h2 className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
          Join 1000+ BIGO Live hosts earning 5x more with our AI-powered coaching platform. Master PK battles, maximize gifts, and build massive audiences.
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="bg-gold hover:bg-gold/90 text-black font-bold text-lg px-8 py-4"
          >
            <Crown className="w-5 h-5 mr-2" />
            Start Earning More Today
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-gold text-gold hover:bg-gold hover:text-black text-lg px-8 py-4"
          >
            <Play className="w-5 h-5 mr-2" />
            Watch Success Stories
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-400">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
            No Setup Fees
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
            Instant AI Coaching
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
            24/7 Support
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-serif font-bold text-center mb-16">
          Why Top BIGO Hosts Choose Level Up Agency
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-white/5 border-gold/20 hover:bg-white/10 transition-colors">
            <CardHeader>
              <Bot className="w-12 h-12 text-gold mb-4" />
              <CardTitle className="text-xl text-white">AI BIGO Coach</CardTitle>
              <CardDescription className="text-gray-300">
                Get personalized coaching from our AI trained on 1000+ successful BIGO hosts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 border-gold/20 hover:bg-white/10 transition-colors">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-gold mb-4" />
              <CardTitle className="text-xl text-white">PK Battle Mastery</CardTitle>
              <CardDescription className="text-gray-300">
                Master PK strategies, timing, and audience engagement for maximum earnings
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 border-gold/20 hover:bg-white/10 transition-colors">
            <CardHeader>
              <DollarSign className="w-12 h-12 text-gold mb-4" />
              <CardTitle className="text-xl text-white">Maximize Earnings</CardTitle>
              <CardDescription className="text-gray-300">
                Proven strategies to increase gifts, bonuses, and overall BIGO Live income
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-serif font-bold mb-8">
          Ready to Level Up Your BIGO Live Career?
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Join thousands of successful BIGO Live hosts who trust Level Up Agency for their growth and success.
        </p>
        <Button 
          onClick={onGetStarted}
          size="lg"
          className="bg-gold hover:bg-gold/90 text-black font-bold text-xl px-12 py-6"
        >
          <Crown className="w-6 h-6 mr-2" />
          Get Started - It's Free!
        </Button>
      </section>
    </div>
  );
}

// Auth Components
function LoginForm() {
  const [bigoId, setBigoId] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
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

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <SEOMeta />
      <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fillRule=\"evenodd\"%3E%3Cg fill=\"%23D4AF37\" fillOpacity=\"0.03\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
      
      <Card className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-sm border-gold/20 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-serif text-gray-900">Level Up Agency</CardTitle>
            <CardDescription className="text-gray-600">Your pathway to BIGO Live success starts here</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Join Free</TabsTrigger>
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
                  Login to Level Up
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reg-bigo-id">BIGO ID</Label>
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
                    <Label htmlFor="name">Display Name</Label>
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
                  <Label htmlFor="reg-password">Password</Label>
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
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="passcode">Member Passcode (optional)</Label>
                  <Input
                    id="passcode"
                    type="password"
                    placeholder="Enter if you have a passcode"
                    value={formData.passcode}
                    onChange={(e) => setFormData({...formData, passcode: e.target.value})}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Get Discord access with valid passcode</p>
                </div>
                
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">
                  Join Level Up Agency Free
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Button 
              variant="ghost" 
              onClick={() => setShowLanding(true)}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// AI Assistant Component
function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatType, setChatType] = useState('general');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const chatTypes = [
    { value: 'general', label: 'General BIGO Help', icon: Bot },
    { value: 'content_ideas', label: 'Content Ideas', icon: Lightbulb },
    { value: 'flyer', label: 'Event Flyers', icon: FileText },
    { value: 'math', label: 'Earnings Calculator', icon: Calculator },
    { value: 'quota', label: 'Quota Coaching', icon: PieChart }
  ];

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    const userMessage = message;
    setMessage('');

    try {
      const response = await axios.post(`${API}/ai/chat`, {
        message: userMessage,
        chat_type: chatType
      });

      setChatHistory(prev => [...prev, 
        { type: 'user', content: userMessage },
        { type: 'ai', content: response.data.response }
      ]);
    } catch (error) {
      toast.error('Failed to get AI response');
    }
    
    setIsLoading(false);
  };

  const SelectedIcon = chatTypes.find(ct => ct.value === chatType)?.icon || Bot;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <Card className="w-96 h-96 mb-4 shadow-2xl border-gold/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <SelectedIcon className="w-5 h-5 mr-2 text-gold" />
                BIGO AI Coach
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Select value={chatType} onValueChange={setChatType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chatTypes.map(ct => {
                  const Icon = ct.icon;
                  return (
                    <SelectItem key={ct.value} value={ct.value}>
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        {ct.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardHeader>
          
          <CardContent className="flex flex-col h-64">
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <SelectedIcon className="w-12 h-12 mx-auto mb-2 text-gold" />
                  <p>Hi! I'm your BIGO Live AI coach. Ask me anything!</p>
                </div>
              )}
              
              {chatHistory.map((msg, index) => (
                <div key={index} className={`p-2 rounded-lg ${
                  msg.type === 'user' 
                    ? 'bg-gold/10 ml-8' 
                    : 'bg-gray-100 mr-8'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
              
              {isLoading && (
                <div className="bg-gray-100 mr-8 p-2 rounded-lg">
                  <p className="text-sm text-gray-500">Thinking...</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Input
                placeholder="Ask your BIGO question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                className="bg-gold hover:bg-gold/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-gold to-yellow-500 hover:from-gold/90 hover:to-yellow-500/90 shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </Button>
    </div>
  );
}

// Main Dashboard Components
function Sidebar({ currentPage, setCurrentPage, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks & Rewards', icon: Target },
    { id: 'quizzes', label: 'BIGO Quizzes', icon: BookOpen },
    { id: 'calendar', label: 'Events & Calendar', icon: CalendarDays },
    { id: 'ai-coach', label: 'AI BIGO Coach', icon: Bot },
    { id: 'quota-tracker', label: 'Quota Tracker', icon: BarChart3 },
    { id: 'education', label: 'BIGO Academy', icon: Youtube },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: Users },
  ];

  if (user?.role === 'owner' || user?.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }

  return (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-gold/20 transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-auto`}>
        
        <div className="p-6 border-b border-gold/20">
          <div className="flex items-center justify-between lg:justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-serif text-lg font-bold">Level Up</h1>
                <p className="text-gold text-xs">Agency</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-gold/20">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10 border-2 border-gold/30">
              <AvatarFallback className="bg-gold text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user?.name}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-gold/20 text-gold text-xs">
                  {user?.role}
                </Badge>
                <div className="flex items-center text-gold text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  {user?.total_points || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentPage(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gold text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gold/20">
          {user?.discord_access && (
            <Button 
              variant="outline" 
              className="w-full mb-3 border-gold/30 text-gold hover:bg-gold/10"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Discord Hub
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={logout}
            className="w-full text-gray-300 hover:text-white hover:bg-red-500/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}

function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [tasksRes, announcementsRes] = await Promise.all([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/announcements`)
      ]);
      
      setTasks(tasksRes.data.slice(0, 5));
      setAnnouncements(announcementsRes.data.slice(0, 3));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gold/10 to-yellow-500/10 rounded-xl p-6 border border-gold/20">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
          Welcome to Level Up Agency, {user?.name}! 👑
        </h1>
        <p className="text-gray-600">Ready to dominate BIGO Live and maximize your earnings today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Your Points</p>
                <p className="text-3xl font-bold text-gold">{user?.total_points || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">BIGO Rank</p>
                <p className="text-3xl font-bold text-purple-600">#{Math.floor(Math.random() * 50) + 1}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Earnings Goal</p>
                <p className="text-3xl font-bold text-green-600">{Math.floor(Math.random() * 80) + 20}%</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-gold" />
              <span>Recent Tasks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.length > 0 ? tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-600 truncate">{task.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-gold/20 text-gold">+{task.points}</Badge>
                    <Button size="sm" className="bg-gold hover:bg-gold/90">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No tasks available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gold" />
              <span>Latest Announcements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.length > 0 ? announcements.map((announcement) => (
                <div key={announcement.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                    {announcement.pinned && (
                      <Badge variant="secondary" className="bg-gold/20 text-gold text-xs">
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{announcement.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No announcements</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Placeholder pages for new features
function QuizzesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">BIGO Live Quizzes</h1>
      <p className="text-gray-600">Test your BIGO Live knowledge and earn points!</p>
      <div className="text-center py-20">
        <BookOpen className="w-24 h-24 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon!</h2>
        <p className="text-gray-600">Interactive BIGO Live quizzes to boost your skills and earnings</p>
      </div>
    </div>
  );
}

function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">Events & Calendar</h1>
      <p className="text-gray-600">Manage your PK events, shows, and community activities</p>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-gold/20">
          <CardHeader>
            <CalendarDays className="w-8 h-8 text-gold mb-2" />
            <CardTitle>Personal Calendar</CardTitle>
            <CardDescription>Schedule your shows and PK events</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border-gold/20">
          <CardHeader>
            <Users2 className="w-8 h-8 text-gold mb-2" />
            <CardTitle>Community Events</CardTitle>
            <CardDescription>Join events hosted by other members</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border-gold/20">
          <CardHeader>
            <Zap className="w-8 h-8 text-gold mb-2" />
            <CardTitle>PK Battles</CardTitle>
            <CardDescription>Upcoming PK battle events</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function AICoachPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">AI BIGO Coach</h1>
      <p className="text-gray-600">Get personalized coaching and content ideas</p>
      <div className="text-center py-20">
        <Bot className="w-24 h-24 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Coach Integration</h2>
        <p className="text-gray-600">Use the floating AI assistant button for instant coaching!</p>
      </div>
    </div>
  );
}

function QuotaTrackerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">Quota Tracker</h1>
      <p className="text-gray-600">Track your earnings goals and cash-out progress</p>
      <div className="text-center py-20">
        <BarChart3 className="w-24 h-24 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Quota System</h2>
        <p className="text-gray-600">Advanced analytics for your BIGO Live performance</p>
      </div>
    </div>
  );
}

function EducationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">BIGO Academy</h1>
      <p className="text-gray-600">Master BIGO Live with our educational content</p>
      <div className="text-center py-20">
        <Youtube className="w-24 h-24 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">BIGO 101 Classes</h2>
        <p className="text-gray-600">Interactive video courses to boost your success</p>
      </div>
    </div>
  );
}

function MessagesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">Messages</h1>
      <p className="text-gray-600">Chat with admin and team members</p>
      <div className="text-center py-20">
        <MessageSquare className="w-24 h-24 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Private Messaging</h2>
        <p className="text-gray-600">Secure communication with your team</p>
      </div>
    </div>
  );
}

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({ note: '', proof_url: '' });
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
    fetchRewards();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    }
  };

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API}/rewards`);
      setRewards(response.data);
    } catch (error) {
      toast.error('Failed to load rewards');
    }
  };

  const submitTask = async (taskId) => {
    try {
      await axios.post(`${API}/tasks/${taskId}/submit`, submissionForm);
      toast.success('Task submitted successfully!');
      setSelectedTask(null);
      setSubmissionForm({ note: '', proof_url: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit task');
    }
  };

  const redeemReward = async (rewardId) => {
    try {
      await axios.post(`${API}/rewards/${rewardId}/redeem`);
      toast.success('Reward redemption requested!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to redeem reward');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
          <TabsTrigger value="rewards">Rewards Catalog</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Your Tasks</h1>
              <p className="text-gray-600">Complete tasks to earn points and level up!</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <Card key={task.id} className="border-gold/20 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription className="mt-1">{task.description}</CardDescription>
                    </div>
                    <Badge className="bg-gold/20 text-gold ml-2">+{task.points}</Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {task.due_at && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        Due: {new Date(task.due_at).toLocaleDateString()}
                      </div>
                    )}
                    
                    {task.requires_proof && (
                      <div className="flex items-center text-sm text-orange-600">
                        <Award className="w-4 h-4 mr-1" />
                        Evidence required
                      </div>
                    )}

                    {task.youtube_video && (
                      <div className="flex items-center text-sm text-red-600">
                        <Youtube className="w-4 h-4 mr-1" />
                        Includes video tutorial
                      </div>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-gold hover:bg-gold/90"
                          onClick={() => setSelectedTask(task)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete Task
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Task: {selectedTask?.title}</DialogTitle>
                          <DialogDescription>
                            Complete the task details and submit for review.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="note">Notes (optional)</Label>
                            <Textarea
                              id="note"
                              placeholder="Add any notes about your completion..."
                              value={submissionForm.note}
                              onChange={(e) => setSubmissionForm({...submissionForm, note: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          
                          {selectedTask?.requires_proof && (
                            <div>
                              <Label htmlFor="proof">Proof URL *</Label>
                              <Input
                                id="proof"
                                placeholder="Link to your proof (image, video, etc.)"
                                value={submissionForm.proof_url}
                                onChange={(e) => setSubmissionForm({...submissionForm, proof_url: e.target.value})}
                                required
                                className="mt-1"
                              />
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => submitTask(selectedTask?.id)}
                              className="flex-1 bg-gold hover:bg-gold/90"
                            >
                              Submit Task
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedTask(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Rewards Catalog</h1>
              <p className="text-gray-600">Exchange your points for amazing rewards!</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Your Balance</p>
              <p className="text-2xl font-bold text-gold">{user?.total_points || 0} pts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => {
              const canAfford = (user?.total_points || 0) >= reward.cost_points;
              
              return (
                <Card key={reward.id} className={`border-gold/20 ${canAfford ? 'hover:shadow-lg' : 'opacity-75'} transition-all`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{reward.title}</span>
                      <Badge className={canAfford ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'}>
                        {reward.cost_points} pts
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-600">{reward.terms}</p>
                      
                      <Button 
                        className={`w-full ${canAfford ? 'bg-gold hover:bg-gold/90' : 'bg-gray-400 cursor-not-allowed'}`}
                        disabled={!canAfford}
                        onClick={() => canAfford && redeemReward(reward.id)}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        {canAfford ? 'Redeem Now' : 'Insufficient Points'}
                      </Button>
                      
                      {!canAfford && (
                        <p className="text-sm text-center text-gray-500">
                          Need {reward.cost_points - (user?.total_points || 0)} more points
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Admin Panel Component
function AdminPanel() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, submissionsRes, redemptionsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/submissions`),
        axios.get(`${API}/admin/redemptions`)
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setSubmissions(submissionsRes.data);
      setRedemptions(redemptionsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-gray-900">Admin Panel</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_users || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Hosts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_hosts || 0}</p>
              </div>
              <Crown className="w-8 h-8 text-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending_submissions || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </div>

        <Card className="border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Points Issued</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_points_issued || 0}</p>
              </div>
              <Star className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card className="border-gold/20">
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.bigo_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="mb-1">{user.role}</Badge>
                      <p className="text-sm text-gray-600">{user.total_points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="submissions">
          <Card className="border-gold/20">
            <CardHeader>
              <CardTitle>Task Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.slice(0, 10).map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Task ID: {submission.task_id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">User: {submission.user_id.slice(0, 8)}</p>
                    </div>
                    <Badge className={
                      submission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                      submission.status === 'approved' ? 'bg-green-500/20 text-green-700' :
                      'bg-red-500/20 text-red-700'
                    }>
                      {submission.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="redemptions">
          <Card className="border-gold/20">
            <CardHeader>
              <CardTitle>Reward Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {redemptions.slice(0, 10).map((redemption) => (
                  <div key={redemption.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Reward: {redemption.reward_id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">User: {redemption.user_id.slice(0, 8)}</p>
                    </div>
                    <Badge className={
                      redemption.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                      redemption.status === 'approved' ? 'bg-green-500/20 text-green-700' :
                      redemption.status === 'fulfilled' ? 'bg-blue-500/20 text-blue-700' :
                      'bg-red-500/20 text-red-700'
                    }>
                      {redemption.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main Dashboard Component
function Dashboard() {
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'tasks': return <TasksPage />;
      case 'quizzes': return <QuizzesPage />;
      case 'calendar': return <CalendarPage />;
      case 'ai-coach': return <AICoachPage />;
      case 'quota-tracker': return <QuotaTrackerPage />;
      case 'education': return <EducationPage />;
      case 'messages': return <MessagesPage />;
      case 'profile': return <div className="p-6"><h1 className="text-2xl font-bold">Profile - Coming Soon</h1></div>;
      case 'admin': return <AdminPanel />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col lg:ml-0">
        <header className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Level Up Agency</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {renderPage()}
        </main>
      </div>
      
      <AIAssistant />
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <SEOMeta />
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading Level Up Agency...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Dashboard /> : <LoginForm />} />
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