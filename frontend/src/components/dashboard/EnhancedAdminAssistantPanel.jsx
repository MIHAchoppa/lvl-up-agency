import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function EnhancedAdminAssistantPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoExecute, setAutoExecute] = useState(false);
  
  // Quick command templates
  const [quickCommands] = useState([
    { label: "Show Top Performers", command: "Show me the top performing hosts this month" },
    { label: "Create Weekly PK Event", command: "Create a weekly PK tournament for next Friday evening" },
    { label: "Send Motivation Announcement", command: "Send a motivational announcement to all active hosts" },
    { label: "Promote S10+ Hosts", command: "Promote all hosts with S10 tier or above to VIP status" },
    { label: "Analyze Monthly Revenue", command: "Analyze our revenue and engagement metrics for this month" },
    { label: "Schedule Coaching Session", command: "Schedule group coaching sessions for new hosts" }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchAnalytics();
    fetchSuggestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/admin-assistant/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`${API}/admin-assistant/action-suggestions`);
      if (response.data.success) {
        // Parse suggestions from AI response
        const suggestionsText = response.data.suggestions;
        const parsedSuggestions = parseSuggestions(suggestionsText);
        setSuggestions(parsedSuggestions);
      }
    } catch (error) {
      console.error('Suggestions fetch error:', error);
    }
  };

  const parseSuggestions = (text) => {
    // Simple parsing of AI suggestions - could be enhanced
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\d+\./)) {
        const actionMatch = line.match(/\*\*Action:\*\*\s*(.+)/);
        const rationaleMatch = lines[i + 1]?.match(/\*\*Rationale:\*\*\s*(.+)/);
        const impactMatch = lines[i + 2]?.match(/\*\*Expected Impact:\*\*\s*(.+)/);
        
        if (actionMatch) {
          suggestions.push({
            id: suggestions.length + 1,
            action: actionMatch[1],
            rationale: rationaleMatch ? rationaleMatch[1] : '',
            impact: impactMatch ? impactMatch[1] : '',
            priority: suggestions.length < 2 ? 'high' : 'medium'
          });
        }
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  };

  const sendMessage = async (message = null) => {
    const messageText = message || input.trim();
    if (!messageText) return;

    setInput('');
    
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin-assistant/chat`, {
        message: messageText,
        auto_execute: autoExecute,
        context: analytics?.metrics
      });

      const result = response.data;
      
      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        action: result.action,
        payload: result.payload
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle calendar actions
      if (result.action && result.payload) {
        await handleCalendarAction(result.action, result.payload);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process admin command');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarAction = async (action, payload) => {
    try {
      let result;
      let successMessage = '';

      if (action === 'create_event') {
        result = await axios.post(`${API}/events`, payload);
        successMessage = `✅ Event created: ${payload.title}`;
        toast.success('Event created successfully!');
      } else if (action === 'update_event') {
        const { event_id, ...updateData } = payload;
        result = await axios.put(`${API}/events/${event_id}`, updateData);
        successMessage = `✅ Event updated: ${updateData.title || 'Event'}`;
        toast.success('Event updated successfully!');
      } else if (action === 'delete_event') {
        const { event_id } = payload;
        result = await axios.delete(`${API}/events/${event_id}`);
        successMessage = `✅ Event deleted`;
        toast.success('Event deleted successfully!');
      }

      // Add system message to chat
      if (successMessage) {
        const systemMessage = {
          role: 'system',
          content: successMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      }

      // Refresh analytics
      fetchAnalytics();
    } catch (error) {
      console.error('Calendar action error:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      toast.error(`Action failed: ${errorMsg}`);
      
      // Add error message to chat
      const errorMessage = {
        role: 'system',
        content: `❌ Action failed: ${errorMsg}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const confirmAction = async (confirmed) => {
    if (!pendingAction) return;

    try {
      const response = await axios.post(`${API}/admin-assistant/execute-action`, {
        action_id: pendingAction.id,
        confirmed: confirmed,
        parameters: {} // Could be extracted from the message
      });

      if (response.data.success) {
        toast.success('Action executed successfully');
        
        const resultMessage = {
          role: 'assistant',
          content: `✅ Action completed: ${response.data.message}`,
          timestamp: new Date(),
          execution_result: response.data
        };
        
        setMessages(prev => [...prev, resultMessage]);
        
        // Refresh analytics after action
        fetchAnalytics();
      } else {
        toast.error(`Action failed: ${response.data.message}`);
      }

    } catch (error) {
      console.error('Action execution error:', error);
      toast.error('Failed to execute action');
    } finally {
      setPendingAction(null);
    }
  };

  const createSmartAnnouncement = async () => {
    try {
      const response = await axios.post(`${API}/admin-assistant/smart-announcement`, {
        type: 'motivation',
        audience: 'hosts',
        message: 'Weekly motivation and performance update',
        tone: 'energetic'
      });

      if (response.data.success) {
        toast.success(`Announcement sent to ${response.data.targeting.users_reached} users`);
        
        const announcementMessage = {
          role: 'assistant',
          content: `📢 Smart announcement created and sent!\n\n**Content:**\n${response.data.announcement.body}\n\n**Targeting:** ${response.data.targeting.audience}\n**Users Reached:** ${response.data.targeting.users_reached}`,
          timestamp: new Date(),
          announcement: response.data.announcement
        };
        
        setMessages(prev => [...prev, announcementMessage]);
      }

    } catch (error) {
      console.error('Smart announcement error:', error);
      toast.error('Failed to create announcement');
    }
  };

  const executeSuggestion = async (suggestion) => {
    const message = {
      role: 'assistant',
      content: `🤖 Executing suggestion: ${suggestion.action}`,
      timestamp: new Date(),
      suggestion: suggestion
    };
    
    setMessages(prev => [...prev, message]);
    await sendMessage(`Execute: ${suggestion.action}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Enhanced Admin Assistant
            <Badge variant="default">AI-Powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">Natural Language Commands</TabsTrigger>
              <TabsTrigger value="analytics">Smart Analytics</TabsTrigger>
              <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              {/* Chat Interface */}
              <div className="space-y-4">
                <ScrollArea className="h-96 border rounded-md p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <p>👋 Hello Admin! I'm your AI assistant.</p>
                        <p className="text-sm">Try commands like "Show top performers" or "Create event"</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : msg.error 
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                            
                            {/* Action badges */}
                            {msg.detected_action && (
                              <Badge variant="secondary" className="mt-2">
                                Action: {msg.detected_action}
                              </Badge>
                            )}
                            
                            {/* Timestamp */}
                            <div className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            Processing your request...
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Pending Action Confirmation */}
                {pendingAction && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-orange-600 text-lg">⚠️</div>
                        <div className="flex-1">
                          <p className="font-semibold text-orange-800">Action Confirmation Required</p>
                          <p className="text-sm text-orange-700 mt-1">
                            Action: <code className="bg-orange-100 px-1 rounded">{pendingAction.type}</code>
                          </p>
                          <p className="text-sm text-orange-600 mt-1">"{pendingAction.message}"</p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => confirmAction(true)}>
                              ✅ Confirm & Execute
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => confirmAction(false)}>
                              ❌ Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Input Area */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me to create events, manage users, send announcements..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => sendMessage()} 
                      disabled={loading || !input.trim()}
                    >
                      Send
                    </Button>
                  </div>

                  {/* Auto-execute toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto-execute"
                      checked={autoExecute}
                      onChange={(e) => setAutoExecute(e.target.checked)}
                    />
                    <label htmlFor="auto-execute" className="text-sm text-gray-600">
                      Auto-execute simple actions (be careful!)
                    </label>
                  </div>

                  {/* Quick Commands */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Quick Commands:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {quickCommands.map((cmd, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => sendMessage(cmd.command)}
                          disabled={loading}
                          className="text-left justify-start text-xs"
                        >
                          {cmd.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analytics?.metrics && (
                  <>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {analytics.metrics.total_users}
                        </div>
                        <p className="text-sm text-gray-600">Total Users</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.metrics.active_hosts}
                        </div>
                        <p className="text-sm text-gray-600">Active Hosts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {analytics.metrics.new_users}
                        </div>
                        <p className="text-sm text-gray-600">New Users</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-orange-600">
                          {analytics.metrics.events_created}
                        </div>
                        <p className="text-sm text-gray-600">Events Created</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* AI Insights */}
              {analytics?.ai_insights && (
                <Card>
                  <CardHeader>
                    <CardTitle>🧠 AI Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm">
                      {analytics.ai_insights}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button onClick={fetchAnalytics} variant="outline" className="flex items-center gap-2">
                      🔄 Refresh Data
                    </Button>
                    <Button onClick={createSmartAnnouncement} variant="outline" className="flex items-center gap-2">
                      📢 Smart Announcement
                    </Button>
                    <Button onClick={fetchSuggestions} variant="outline" className="flex items-center gap-2">
                      💡 Get Suggestions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              {/* AI Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle>💡 AI Action Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {suggestions.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <p>Loading AI suggestions...</p>
                        <Button onClick={fetchSuggestions} variant="outline" className="mt-2">
                          Refresh Suggestions
                        </Button>
                      </div>
                    ) : (
                      suggestions.map((suggestion) => (
                        <Card key={suggestion.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={suggestion.priority === 'high' ? 'default' : 'secondary'}>
                                    {suggestion.priority} priority
                                  </Badge>
                                </div>
                                <h4 className="font-semibold text-sm mb-1">
                                  {suggestion.action}
                                </h4>
                                {suggestion.rationale && (
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Why:</strong> {suggestion.rationale}
                                  </p>
                                )}
                                {suggestion.impact && (
                                  <p className="text-sm text-green-600">
                                    <strong>Impact:</strong> {suggestion.impact}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => executeSuggestion(suggestion)}
                                disabled={loading}
                              >
                                Execute
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnhancedAdminAssistantPanel;