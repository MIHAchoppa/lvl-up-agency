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
  X
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
      toast.error(error.response?.data?.detail || 'Login failed');
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
      toast.error(error.response?.data?.detail || 'Registration failed');
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

// Auth Components
function LoginForm() {
  const [bigoId, setBigoId] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fillRule=\"evenodd\"%3E%3Cg fill=\"%23D4AF37\" fillOpacity=\"0.03\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
      
      <Card className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-sm border-gold/20 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-serif text-gray-900">Level Up Agency</CardTitle>
            <CardDescription className="text-gray-600">Your pathway to success starts here</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
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
                  Join Level Up Agency
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Dashboard Components
function Sidebar({ currentPage, setCurrentPage, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: Target },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
    { id: 'community', label: 'Community', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: Users },
  ];

  if (user?.role === 'owner' || user?.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin', icon: Settings });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-gold/20 transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-auto`}>
        
        {/* Header */}
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

        {/* User Info */}
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

        {/* Navigation */}
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

        {/* Footer */}
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
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-gold/10 to-yellow-500/10 rounded-xl p-6 border border-gold/20">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}! 👑
        </h1>
        <p className="text-gray-600">Ready to level up your game today?</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-sm font-medium text-gray-600">Rank</p>
                <p className="text-3xl font-bold text-purple-600">#{Math.floor(Math.random() * 50) + 1}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
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

        {/* Announcements */}
        <Card className="border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gold" />
              <span>Latest News</span>
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

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({ note: '', proof_url: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
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

  return (
    <div className="space-y-6">
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

      {tasks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Available</h3>
            <p className="text-gray-600">Check back soon for new tasks to complete!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RewardsPage() {
  const [rewards, setRewards] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API}/rewards`);
      setRewards(response.data);
    } catch (error) {
      toast.error('Failed to load rewards');
    }
  };

  const redeemReward = async (rewardId) => {
    try {
      await axios.post(`${API}/rewards/${rewardId}/redeem`);
      toast.success('Reward redemption requested!');
      // Refresh user data or update UI as needed
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to redeem reward');
    }
  };

  return (
    <div className="space-y-6">
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

      {rewards.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Rewards Available</h3>
            <p className="text-gray-600">Rewards will be added soon. Keep earning points!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main App Component
function Dashboard() {
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'tasks': return <TasksPage />;
      case 'rewards': return <RewardsPage />;
      case 'quizzes': return <div className="p-6"><h1 className="text-2xl font-bold">Quizzes - Coming Soon</h1></div>;
      case 'community': return <div className="p-6"><h1 className="text-2xl font-bold">Community - Coming Soon</h1></div>;
      case 'resources': return <div className="p-6"><h1 className="text-2xl font-bold">Resources - Coming Soon</h1></div>;
      case 'profile': return <div className="p-6"><h1 className="text-2xl font-bold">Profile - Coming Soon</h1></div>;
      case 'admin': return <div className="p-6"><h1 className="text-2xl font-bold">Admin Panel - Coming Soon</h1></div>;
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
        {/* Mobile Header */}
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
            <div className="w-10" /> {/* Spacer */}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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