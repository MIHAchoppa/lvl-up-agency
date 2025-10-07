import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

// Import all dashboard panels
import AICoachPanel from './components/dashboard/AICoachPanel';
import VoiceAssistantPanel from './components/dashboard/VoiceAssistantPanel';
import AdminAgentPanel from './components/dashboard/AdminAgentPanel';
import EnhancedAdminAssistantPanel from './components/dashboard/EnhancedAdminAssistantPanel';
import CalendarPanel from './components/dashboard/CalendarPanel';
import MessagesPanel from './components/dashboard/MessagesPanel';
import AnnouncementsPanel from './components/dashboard/AnnouncementsPanel';
import TasksPanel from './components/dashboard/TasksPanel';
import UsersPanel from './components/dashboard/UsersPanel';
import LeadsPanel from './components/dashboard/LeadsPanel';
import AuditionsPanel from './components/dashboard/AuditionsPanel';
import RewardsPanel from './components/dashboard/RewardsPanel';
import QuotaPanel from './components/dashboard/QuotaPanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai-coach');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  };

  const login = async (loginData) => {
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user);
      toast.success('Login successful!');
    } catch (error) {
      toast.error('Login failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.info('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Level Up Agency...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  // Main Dashboard
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Toaster />
        
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  🚀 Level Up Agency - AI Enhanced Platform
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user.name} ({user.role})
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
              <TabsTrigger value="ai-coach">🧠 AI Coach</TabsTrigger>
              <TabsTrigger value="voice-assistant">🎙️ Voice Assistant</TabsTrigger>
              {(user.role === 'admin' || user.role === 'owner') && (
                <TabsTrigger value="admin-assistant">🤖 Admin AI</TabsTrigger>
              )}
              <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
              <TabsTrigger value="messages">💬 Messages</TabsTrigger>
              <TabsTrigger value="announcements">📢 Announcements</TabsTrigger>
              <TabsTrigger value="tasks">✅ Tasks</TabsTrigger>
              <TabsTrigger value="rewards">🏆 Rewards</TabsTrigger>
            </TabsList>

            <TabsContent value="ai-coach">
              <AICoachPanel />
            </TabsContent>

            <TabsContent value="voice-assistant">
              <VoiceAssistantPanel />
            </TabsContent>

            {(user.role === 'admin' || user.role === 'owner') && (
              <TabsContent value="admin-assistant">
                <EnhancedAdminAssistantPanel />
              </TabsContent>
            )}

            <TabsContent value="calendar">
              <CalendarPanel />
            </TabsContent>

            <TabsContent value="messages">
              <MessagesPanel />
            </TabsContent>

            <TabsContent value="announcements">
              <AnnouncementsPanel />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksPanel />
            </TabsContent>

            <TabsContent value="rewards">
              <RewardsPanel />
            </TabsContent>

            {(user.role === 'admin' || user.role === 'owner') && (
              <>
                <TabsContent value="users">
                  <UsersPanel />
                </TabsContent>

                <TabsContent value="leads">
                  <LeadsPanel />
                </TabsContent>

                <TabsContent value="auditions">
                  <AuditionsPanel />
                </TabsContent>

                <TabsContent value="quotas">
                  <QuotaPanel />
                </TabsContent>
              </>
            )}
          </Tabs>
        </main>
      </div>
    </BrowserRouter>
  );
}

// Simple Login Component
function LoginPage({ onLogin }) {
  const [credentials, setCredentials] = useState({
    bigo_id: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!credentials.bigo_id || !credentials.password) {
      toast.error('Please enter both BIGO ID and password');
      return;
    }

    setLoading(true);
    try {
      await onLogin(credentials);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">🚀 Level Up Agency</h1>
          <p className="mt-2 text-gray-600">AI-Enhanced BIGO Live Platform</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">BIGO ID</label>
            <input
              type="text"
              value={credentials.bigo_id}
              onChange={(e) => setCredentials({ ...credentials, bigo_id: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your BIGO ID"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="text-center text-sm text-gray-600">
          <p>Demo credentials:</p>
          <p><strong>BIGO ID:</strong> Admin | <strong>Password:</strong> admin333</p>
        </div>
      </div>
    </div>
  );
}

export default App;