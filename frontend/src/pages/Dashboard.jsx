import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Toaster } from '../components/ui/sonner';
import { useAuth } from '../context/AuthContext';

import AICoachPanel from '../components/dashboard/AICoachPanel';
import VoiceAssistantPanel from '../components/dashboard/VoiceAssistantPanel';
import EnhancedAdminAssistantPanel from '../components/dashboard/EnhancedAdminAssistantPanel';
import CalendarPanel from '../components/dashboard/CalendarPanel';
import MessagesPanel from '../components/dashboard/MessagesPanel';
import AnnouncementsPanel from '../components/dashboard/AnnouncementsPanel';
import TasksPanel from '../components/dashboard/TasksPanel';
import UsersPanel from '../components/dashboard/UsersPanel';
import LeadsPanel from '../components/dashboard/LeadsPanel';
import AuditionsPanel from '../components/dashboard/AuditionsPanel';
import RewardsPanel from '../components/dashboard/RewardsPanel';
import AdminModelsPanel from '../components/dashboard/AdminModelsPanel';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import BeanGeniePanel from '../components/dashboard/BeanGeniePanel';
import BigoAcademyPanel from '../components/dashboard/BigoAcademyPanel';

import QuotaPanel from '../components/dashboard/QuotaPanel';

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('ai-coach');
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Toaster />
      {/* Header */}
      <header className="glass-dark border-b border-yellow-500/30 sticky top-0 z-40 shadow-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
                alt="Level Up Agency" 
                className="h-9 w-9 object-contain transition-smooth hover:scale-110"
              />
              <h1 className="text-xl font-bold text-gradient-gold">Level Up Agency</h1>
              <span className="text-yellow-500/40">•</span>
              <img 
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/uzty33em_bean_genie_no_bg.webp" 
                alt="BeanGenie" 
                className="h-7 w-7 object-contain transition-smooth hover:scale-110"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg glass border border-yellow-500/20">
                <span className="text-sm font-medium text-gray-900">
                  👋 {user?.name} 
                  <span className="text-yellow-600 ml-2">({user?.role})</span>
                </span>
              </div>
              <button 
                onClick={logout} 
                className="px-4 py-2 rounded-lg font-bold text-black gradient-gold shadow-gold transition-smooth hover:scale-105 hover:shadow-gold-lg"
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
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-2 mb-8 p-2 glass-dark border border-yellow-500/30 rounded-xl shadow-gold">
            <TabsTrigger 
              value="beangenie" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              🧞‍♂️ BeanGenie
            </TabsTrigger>
            <TabsTrigger 
              value="academy" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              📚 Academy
            </TabsTrigger>
            <TabsTrigger 
              value="voice-assistant" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              🎙️ Voice
            </TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <>
                <TabsTrigger 
                  value="admin-assistant" 
                  className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
                >
                  🤖 Admin AI
                </TabsTrigger>
                <TabsTrigger 
                  value="models" 
                  className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
                >
                  🧩 Models
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
                >
                  ⚙️ Settings
                </TabsTrigger>
              </>
            )}
            <TabsTrigger 
              value="calendar" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              📅 Calendar
            </TabsTrigger>
            <TabsTrigger 
              value="messages" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              💬 Messages
            </TabsTrigger>
            <TabsTrigger 
              value="announcements" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              📢 Announcements
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              ✅ Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
            >
              🏆 Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beangenie"><BeanGeniePanel /></TabsContent>
          <TabsContent value="academy"><BigoAcademyPanel /></TabsContent>
          <TabsContent value="voice-assistant"><VoiceAssistantPanel /></TabsContent>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <>
              <TabsContent value="admin-assistant"><EnhancedAdminAssistantPanel /></TabsContent>
              <TabsContent value="models"><AdminModelsPanel /></TabsContent>
              <TabsContent value="settings"><SettingsPanel /></TabsContent>
            </>
          )}

          <TabsContent value="calendar"><CalendarPanel /></TabsContent>
          <TabsContent value="messages"><MessagesPanel /></TabsContent>
          <TabsContent value="announcements"><AnnouncementsPanel /></TabsContent>
          <TabsContent value="tasks"><TasksPanel /></TabsContent>
          <TabsContent value="rewards"><RewardsPanel /></TabsContent>

          {(user?.role === 'admin' || user?.role === 'owner') && (
            <>
              <TabsContent value="users"><UsersPanel /></TabsContent>
              <TabsContent value="leads"><LeadsPanel /></TabsContent>
              <TabsContent value="auditions"><AuditionsPanel /></TabsContent>
              <TabsContent value="quotas"><QuotaPanel /></TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default Dashboard;
