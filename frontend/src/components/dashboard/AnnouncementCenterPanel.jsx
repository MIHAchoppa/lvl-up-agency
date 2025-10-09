import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import AIAssistButton from '../ui/AIAssistButton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AnnouncementCenterPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [currentUser, setCurrentUser] = useState({ role: 'admin' }); // Mock user for demo

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    body: '',
    audience: 'all',
    pinned: false,
    type: 'general',
    tone: 'professional'
  });

  const [smartAnnouncementMode, setSmartAnnouncementMode] = useState(false);

  const audienceOptions = [
    { value: 'all', label: '👥 Everyone', description: 'All users in the agency' },
    { value: 'hosts', label: '⭐ Hosts Only', description: 'Active BIGO Live hosts' },
    { value: 'coaches', label: '🏆 Coaches Only', description: 'Coaching staff' },
    { value: 'tier_s10', label: '🏅 S10+ Hosts', description: 'High-tier performers' },
    { value: 'new_users', label: '🆕 New Members', description: 'Recently joined users' },
    { value: 'top_performers', label: '🌟 Top Performers', description: 'Monthly top earners' }
  ];

  const announcementTypes = [
    { value: 'general', label: '📢 General', color: 'bg-blue-100 text-blue-800' },
    { value: 'urgent', label: '🚨 Urgent', color: 'bg-red-100 text-red-800' },
    { value: 'celebration', label: '🎉 Celebration', color: 'bg-green-100 text-green-800' },
    { value: 'update', label: '📋 Update', color: 'bg-purple-100 text-purple-800' },
    { value: 'event', label: '📅 Event', color: 'bg-orange-100 text-orange-800' },
    { value: 'motivation', label: '💪 Motivation', color: 'bg-yellow-100 text-yellow-800' }
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/announcements`);
      setAnnouncements(response.data || []);
    } catch (error) {
      console.error('Announcements fetch error:', error);
      // Show sample announcements if API fails
      const sampleAnnouncements = [
        {
          id: '1',
          title: '🚀 Weekly PK Tournament Announcement',
          body: 'Get ready for this Friday\'s epic PK battle tournament! Prizes include bonus beans, exclusive badges, and recognition in our hall of fame. Registration opens at 6 PM PST.',
          audience: 'all',
          publish_at: new Date().toISOString(),
          pinned: true,
          created_by: 'admin',
          created_at: new Date().toISOString(),
          type: 'event',
          engagement: { views: 245, reactions: 38, comments: 12 }
        },
        {
          id: '2',
          title: '🎉 Top Performer Recognition',
          body: 'Congratulations to our amazing hosts who achieved S15+ tiers this month! Your dedication and hard work inspire the entire agency. Keep up the fantastic work!',
          audience: 'hosts',
          publish_at: new Date().toISOString(),
          pinned: false,
          created_by: 'admin',
          created_at: new Date().toISOString(),
          type: 'celebration',
          engagement: { views: 189, reactions: 45, comments: 8 }
        },
        {
          id: '3',
          title: '📋 New Coaching Sessions Available',
          body: 'Advanced BIGO Live strategies and tier optimization sessions are now available. These sessions cover bean maximization, PK battle psychology, and audience engagement techniques.',
          audience: 'all',
          publish_at: new Date().toISOString(),
          pinned: false,
          created_by: 'coach',
          created_at: new Date().toISOString(),
          type: 'update',
          engagement: { views: 167, reactions: 29, comments: 15 }
        }
      ];
      setAnnouncements(sampleAnnouncements);
    } finally {
      setLoading(false);
    }
  };

  const createAnnouncement = async () => {
    try {
      if (!announcementForm.title || !announcementForm.body) {
        toast.error('Title and content are required');
        return;
      }

      let response;
      
      if (smartAnnouncementMode) {
        // Use AI-powered smart announcement creation
        response = await axios.post(`${API}/admin-assistant/smart-announcement`, {
          type: announcementForm.type,
          audience: announcementForm.audience,
          message: `${announcementForm.title}: ${announcementForm.body}`,
          tone: announcementForm.tone,
          pinned: announcementForm.pinned
        });
      } else {
        // Standard announcement creation
        response = await axios.post(`${API}/announcements`, {
          ...announcementForm,
          publish_at: new Date().toISOString()
        });
      }

      if (response.data.success || response.data.id) {
        toast.success(smartAnnouncementMode ? 
          `Smart announcement sent to ${response.data.targeting?.users_reached || 'all'} users!` : 
          'Announcement created successfully!'
        );
        
        setShowCreateDialog(false);
        setAnnouncementForm({
          title: '',
          body: '',
          audience: 'all',
          pinned: false,
          type: 'general',
          tone: 'professional'
        });
        setSmartAnnouncementMode(false);
        
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Announcement creation error:', error);
      toast.error('Failed to create announcement');
    }
  };

  const generateAIContent = async () => {
    if (!announcementForm.title) {
      toast.error('Please enter a title first');
      return;
    }

    try {
      const response = await axios.post(`${API}/admin-assistant/chat`, {
        message: `Generate engaging announcement content for: "${announcementForm.title}". Make it ${announcementForm.tone} tone for ${announcementForm.audience} audience. Type: ${announcementForm.type}`,
        auto_execute: false
      });

      if (response.data.success && response.data.response) {
        // Extract the generated content from AI response
        let generatedContent = response.data.response;
        
        // Clean up AI response to extract just the announcement content
        const lines = generatedContent.split('\n');
        const contentLines = lines.filter(line => 
          !line.includes('**') && 
          line.trim().length > 20 && 
          !line.toLowerCase().includes('announcement') &&
          !line.toLowerCase().includes('here is') &&
          !line.toLowerCase().includes('here\'s')
        );
        
        if (contentLines.length > 0) {
          setAnnouncementForm({
            ...announcementForm,
            body: contentLines.join(' ').trim().substring(0, 500) // Limit length
          });
          toast.success('AI content generated!');
        } else {
          setAnnouncementForm({
            ...announcementForm,
            body: generatedContent.substring(0, 500)
          });
        }
      } else {
        toast.error('Failed to generate AI content');
      }
    } catch (error) {
      console.error('AI content generation error:', error);
      toast.error('AI content generation failed');
    }
  };

  const getTypeInfo = (type) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0];
  };

  const getAudienceInfo = (audience) => {
    return audienceOptions.find(a => a.value === audience) || audienceOptions[0];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const pinnedAnnouncements = announcements.filter(a => a.pinned);
  const regularAnnouncements = announcements.filter(a => !a.pinned);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'owner';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              📢 Announcement Center
              <Badge variant="default">Admin Control</Badge>
            </CardTitle>
            {isAdmin && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>➕ Create Announcement</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      Create New Announcement
                      {smartAnnouncementMode && (
                        <Badge variant="secondary">🤖 AI-Powered</Badge>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {/* Smart Mode Toggle */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="smart-mode"
                        checked={smartAnnouncementMode}
                        onChange={(e) => setSmartAnnouncementMode(e.target.checked)}
                      />
                      <label htmlFor="smart-mode" className="text-sm font-medium">
                        🤖 Enable Smart Announcement (AI-powered targeting & optimization)
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Title*</label>
                        <Input
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                          placeholder="Announcement title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <Select value={announcementForm.type} onValueChange={(value) => setAnnouncementForm({...announcementForm, type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {announcementTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">Content*</label>
                        <Button
                          onClick={generateAIContent}
                          variant="outline"
                          size="sm"
                          disabled={!announcementForm.title}
                        >
                          🤖 Generate AI Content
                        </Button>
                      </div>
                      <Textarea
                        value={announcementForm.body}
                        onChange={(e) => setAnnouncementForm({...announcementForm, body: e.target.value})}
                        placeholder="Announcement content"
                        rows={5}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Target Audience</label>
                        <Select value={announcementForm.audience} onValueChange={(value) => setAnnouncementForm({...announcementForm, audience: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {audienceOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-gray-500">{option.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tone</label>
                        <Select value={announcementForm.tone} onValueChange={(value) => setAnnouncementForm({...announcementForm, tone: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">🏢 Professional</SelectItem>
                            <SelectItem value="friendly">😊 Friendly</SelectItem>
                            <SelectItem value="energetic">⚡ Energetic</SelectItem>
                            <SelectItem value="motivational">💪 Motivational</SelectItem>
                            <SelectItem value="urgent">🚨 Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pinned"
                        checked={announcementForm.pinned}
                        onChange={(e) => setAnnouncementForm({...announcementForm, pinned: e.target.checked})}
                      />
                      <label htmlFor="pinned" className="text-sm font-medium">
                        📌 Pin this announcement (appears at top)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createAnnouncement}>
                        {smartAnnouncementMode ? '🤖 Send Smart Announcement' : '📢 Create Announcement'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{announcements.length}</div>
                <p className="text-xs text-gray-600">Total Announcements</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{pinnedAnnouncements.length}</div>
                <p className="text-xs text-gray-600">Pinned</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {announcements.reduce((sum, a) => sum + (a.engagement?.views || 0), 0)}
                </div>
                <p className="text-xs text-gray-600">Total Views</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {announcements.reduce((sum, a) => sum + (a.engagement?.reactions || 0), 0)}
                </div>
                <p className="text-xs text-gray-600">Total Reactions</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Display */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">📢 All Announcements</TabsTrigger>
          <TabsTrigger value="pinned">📌 Pinned</TabsTrigger>
          <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading announcements...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pinned Announcements */}
              {pinnedAnnouncements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    📌 Pinned Announcements
                  </h3>
                  {pinnedAnnouncements.map((announcement) => {
                    const typeInfo = getTypeInfo(announcement.type || 'general');
                    const audienceInfo = getAudienceInfo(announcement.audience);
                    
                    return (
                      <Card key={announcement.id} className="border-l-4 border-l-blue-500 bg-blue-50/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{announcement.title}</h4>
                              <Badge className={typeInfo.color}>
                                {typeInfo.label}
                              </Badge>
                              <Badge variant="outline" size="sm">
                                📌 Pinned
                              </Badge>
                            </div>
                            {announcement.engagement && (
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>👀 {announcement.engagement.views}</span>
                                <span>❤️ {announcement.engagement.reactions}</span>
                                <span>💬 {announcement.engagement.comments}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-700 mb-3 whitespace-pre-wrap">{announcement.body}</p>
                          <div className="flex justify-between items-center text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                              <span>🎯 {audienceInfo.label}</span>
                              <span>⏰ {formatDate(announcement.created_at)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Regular Announcements */}
              {regularAnnouncements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    📢 Recent Announcements
                  </h3>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {regularAnnouncements.map((announcement) => {
                        const typeInfo = getTypeInfo(announcement.type || 'general');
                        const audienceInfo = getAudienceInfo(announcement.audience);
                        
                        return (
                          <Card key={announcement.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{announcement.title}</h4>
                                  <Badge className={typeInfo.color}>
                                    {typeInfo.label}
                                  </Badge>
                                </div>
                                {announcement.engagement && (
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>👀 {announcement.engagement.views}</span>
                                    <span>❤️ {announcement.engagement.reactions}</span>
                                    <span>💬 {announcement.engagement.comments}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{announcement.body}</p>
                              <div className="flex justify-between items-center text-sm text-gray-500">
                                <div className="flex items-center gap-4">
                                  <span>🎯 {audienceInfo.label}</span>
                                  <span>⏰ {formatDate(announcement.created_at)}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost">
                                    👍 React
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    💬 Comment
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {announcements.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📢</div>
                  <p className="text-lg">No announcements yet</p>
                  <p className="text-sm">Be the first to create an announcement!</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pinned" className="space-y-4">
          {pinnedAnnouncements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📌</div>
              <p className="text-lg">No pinned announcements</p>
              <p className="text-sm">Pin important announcements to keep them at the top</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pinnedAnnouncements.map((announcement) => {
                const typeInfo = getTypeInfo(announcement.type || 'general');
                const audienceInfo = getAudienceInfo(announcement.audience);
                
                return (
                  <Card key={announcement.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{announcement.title}</h4>
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                        {announcement.engagement && (
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>👀 {announcement.engagement.views}</span>
                            <span>❤️ {announcement.engagement.reactions}</span>
                            <span>💬 {announcement.engagement.comments}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3 whitespace-pre-wrap">{announcement.body}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>🎯 {audienceInfo.label}</span>
                          <span>⏰ {formatDate(announcement.created_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Engagement Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">📊 Engagement Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{announcement.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(announcement.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {announcement.engagement ? (
                          <>
                            <span>👀 {announcement.engagement.views}</span>
                            <span>❤️ {announcement.engagement.reactions}</span>
                            <span>💬 {announcement.engagement.comments}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">No data</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Audience Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🎯 Audience Targeting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {audienceOptions.map((option) => {
                    const count = announcements.filter(a => a.audience === option.value).length;
                    return (
                      <div key={option.value} className="flex items-center justify-between">
                        <span className="text-sm">{option.label}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnnouncementCenterPanel;