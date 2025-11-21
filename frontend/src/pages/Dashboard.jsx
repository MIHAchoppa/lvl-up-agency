import React, { useState, lazy, Suspense, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Toaster } from '../components/ui/sonner';
import { useAuth } from '../context/AuthContext';

// Lazy load dashboard panels for code splitting and better performance
const BeanGeniePanel = lazy(() => import('../components/dashboard/BeanGeniePanel'));
const BigoAcademyPanel = lazy(() => import('../components/dashboard/BigoAcademyPanel'));
const VoiceAssistantPanel = lazy(() => import('../components/dashboard/VoiceAssistantPanel'));
const EnhancedAdminAssistantPanel = lazy(() => import('../components/dashboard/EnhancedAdminAssistantPanel'));
const BlogsPanel = lazy(() => import('../components/dashboard/BlogsPanel'));
const AdminModelsPanel = lazy(() => import('../components/dashboard/AdminModelsPanel'));
const SettingsPanel = lazy(() => import('../components/dashboard/SettingsPanel'));
const CalendarPanel = lazy(() => import('../components/dashboard/CalendarPanel'));
const MessagesPanel = lazy(() => import('../components/dashboard/MessagesPanel'));
const AnnouncementsPanel = lazy(() => import('../components/dashboard/AnnouncementsPanel'));
const TasksPanel = lazy(() => import('../components/dashboard/TasksPanel'));
const RewardsPanel = lazy(() => import('../components/dashboard/RewardsPanel'));
const UsersPanel = lazy(() => import('../components/dashboard/UsersPanel'));
const LeadsPanel = lazy(() => import('../components/dashboard/LeadsPanel'));
const AuditionsPanel = lazy(() => import('../components/dashboard/AuditionsPanel'));
const QuotaPanel = lazy(() => import('../components/dashboard/QuotaPanel'));

// Loading fallback component
const PanelLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading panel...</p>
    </div>
  </div>
);

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('beangenie');
  
  // Memoize logout handler to prevent unnecessary re-renders
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);
  
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
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
                alt="LVL UP Coach" 
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
                onClick={handleLogout} 
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
              🎯 LVL UP Coach
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
                  value="blogs" 
                  className="data-[state=active]:text-black data-[state=active]:gradient-gold data-[state=active]:shadow-gold transition-smooth font-semibold text-sm hover:bg-yellow-500/10 rounded-lg"
                >
                  📝 Blogs
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

          {/* Wrap lazy-loaded components in Suspense for better UX */}
          <TabsContent value="beangenie">
            <Suspense fallback={<PanelLoader />}>
              <BeanGeniePanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="academy">
            <Suspense fallback={<PanelLoader />}>
              <BigoAcademyPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="voice-assistant">
            <Suspense fallback={<PanelLoader />}>
              <VoiceAssistantPanel />
            </Suspense>
          </TabsContent>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <>
              <TabsContent value="admin-assistant">
                <Suspense fallback={<PanelLoader />}>
                  <EnhancedAdminAssistantPanel />
                </Suspense>
              </TabsContent>
              <TabsContent value="blogs">
                <Suspense fallback={<PanelLoader />}>
                  <BlogsPanel token={localStorage.getItem('token')} />
                </Suspense>
              </TabsContent>
              <TabsContent value="models">
                <Suspense fallback={<PanelLoader />}>
                  <AdminModelsPanel />
                </Suspense>
              </TabsContent>
              <TabsContent value="settings">
                <Suspense fallback={<PanelLoader />}>
                  <SettingsPanel />
                </Suspense>
              </TabsContent>
            </>
          )}

          <TabsContent value="calendar">
            <Suspense fallback={<PanelLoader />}>
              <CalendarPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="messages">
            <Suspense fallback={<PanelLoader />}>
              <MessagesPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="announcements">
            <Suspense fallback={<PanelLoader />}>
              <AnnouncementsPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="tasks">
            <Suspense fallback={<PanelLoader />}>
              <TasksPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="rewards">
            <Suspense fallback={<PanelLoader />}>
              <RewardsPanel />
            </Suspense>
          </TabsContent>

          {(user?.role === 'admin' || user?.role === 'owner') && (
            <>
              <TabsContent value="users">
                <Suspense fallback={<PanelLoader />}>
                  <UsersPanel />
                </Suspense>
              </TabsContent>
              <TabsContent value="leads">
                <Suspense fallback={<PanelLoader />}>
                  <LeadsPanel />
                </Suspense>
              </TabsContent>
              <TabsContent value="auditions">
                <Suspense fallback={<PanelLoader />}>
                  <AuditionsPanel />
                </Suspense>
              </TabsContent>
              <TabsContent value="quotas">
                <Suspense fallback={<PanelLoader />}>
                  <QuotaPanel />
                </Suspense>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default Dashboard;
