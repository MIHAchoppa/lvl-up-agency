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
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <Toaster />
      {/* Header */}
      <header className="bg-[#0b0b0b] border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
                alt="Level Up Agency" 
                className="h-8 w-8 object-contain"
              />
              <h1 className="text-xl font-bold text-white">Level Up Agency</h1>
              <span className="text-yellow-500/30">•</span>
              <img 
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/uzty33em_bean_genie_no_bg.webp" 
                alt="BeanGenie" 
                className="h-6 w-6 object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">Welcome, {user?.name} ({user?.role})</span>
              <button onClick={logout} className="text-sm text-black px-3 py-1.5 rounded-md bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_25px_rgba(245,197,24,0.25)] hover:brightness-110">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 mb-6 bg-black/40 border border-yellow-500/20">
            <TabsTrigger value="beangenie" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">🧞‍♂️ BeanGenie</TabsTrigger>
            <TabsTrigger value="voice-assistant" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">🎙️ Voice</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <>
                <TabsTrigger value="admin-assistant" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">🤖 Admin AI</TabsTrigger>
                <TabsTrigger value="models" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">🧩 Models</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">⚙️ Settings</TabsTrigger>
              </>
            )}
            <TabsTrigger value="calendar" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">📅 Calendar</TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">💬 Messages</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">📢 Announcements</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">✅ Tasks</TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600">🏆 Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="beangenie"><BeanGeniePanel /></TabsContent>
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
