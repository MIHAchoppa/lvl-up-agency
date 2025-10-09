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
import QuotaPanel from '../components/dashboard/QuotaPanel';

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('ai-coach');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">🚀 Level Up Agency - AI Enhanced Platform</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name} ({user?.role})</span>
              <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
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
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <TabsTrigger value="admin-assistant">🤖 Admin AI</TabsTrigger>
            )}
            <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
            <TabsTrigger value="messages">💬 Messages</TabsTrigger>
            <TabsTrigger value="announcements">📢 Announcements</TabsTrigger>
            <TabsTrigger value="tasks">✅ Tasks</TabsTrigger>
            <TabsTrigger value="rewards">🏆 Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-coach"><AICoachPanel /></TabsContent>
          <TabsContent value="voice-assistant"><VoiceAssistantPanel /></TabsContent>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <TabsContent value="admin-assistant"><EnhancedAdminAssistantPanel /></TabsContent>
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
