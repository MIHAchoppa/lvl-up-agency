import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AdminAgentPanel() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);

  // Quick admin commands
  const quickCommands = [
    "Show me top performing hosts this month",
    "Create a PK tournament for this weekend", 
    "Send motivational announcement to all hosts",
    "Analyze user engagement metrics",
    "Promote high-tier performers to VIP",
    "Generate weekly performance report"
  ];

  useEffect(() => {
    fetchAnalytics();
    fetchSuggestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        setSuggestions(parseSuggestions(response.data.suggestions));
      }
    } catch (error) {
      console.error('Suggestions fetch error:', error);
    }
  };

  const parseSuggestions = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\d+\./)) {
        const actionMatch = line.match(/\*\*Action:\*\*\s*(.+)/);
        if (actionMatch) {
          suggestions.push({
            id: suggestions.length + 1,
            action: actionMatch[1],
            priority: suggestions.length < 2 ? 'high' : 'medium'
          });
        }
      }
    }
    
    return suggestions.slice(0, 5);
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
        auto_execute: false
      });

      const result = response.data;
      
      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        detected_action: result.detected_action,
        requires_confirmation: result.requires_confirmation
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (result.detected_action && result.requires_confirmation) {
        setPendingAction({
          id: `action_${Date.now()}`,
          type: result.detected_action,
          message: messageText,
          timestamp: new Date()
        });
        toast.info('Action detected - confirmation required');
      }

    } catch (error) {
      console.error('Admin chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Admin assistant is temporarily unavailable. Please try manual admin controls.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process admin command');
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async (confirmed) => {
    if (!pendingAction) return;

    try {
      const response = await axios.post(`${API}/admin-assistant/execute-action`, {
        action_id: pendingAction.id,
        confirmed: confirmed,
        parameters: {}
      });

      if (response.data.success) {
        toast.success('Action executed successfully');
        
        const resultMessage = {
          role: 'assistant',
          content: `✅ Action completed: ${response.data.message}`,
          timestamp: new Date(),
          success: true
        };
        
        setMessages(prev => [...prev, resultMessage]);
        fetchAnalytics(); // Refresh data
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">💬 Natural Commands</TabsTrigger>
              <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
              <TabsTrigger value="suggestions">💡 AI Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              {/* Pending Action Alert */}
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

              {/* Chat Area */}
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
                              ? 'bg-red-100 text-red-800'
                              : msg.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                          {msg.detected_action && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              Action: {msg.detected_action}
                            </Badge>
                          )}
                          {msg.timestamp && (
                            <div className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          Processing admin request...
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Commands */}
              <div className="space-y-3">
                <div className="text-sm font-medium">⚡ Quick Admin Commands:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quickCommands.map((command, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(command)}
                      disabled={loading}
                      className="text-left justify-start text-xs"
                    >
                      {command}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to manage users, create events, send announcements..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={loading}
                />
                <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                  Send
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.metrics?.total_users || 0}
                      </div>
                      <p className="text-sm text-gray-600">Total Users</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.metrics?.active_hosts || 0}
                      </div>
                      <p className="text-sm text-gray-600">Active Hosts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {analytics.metrics?.pending_submissions || 0}
                      </div>
                      <p className="text-sm text-gray-600">Pending Tasks</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {analytics.metrics?.upcoming_events || 0}
                      </div>
                      <p className="text-sm text-gray-600">Upcoming Events</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {analytics?.ai_insights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">🧠 AI Platform Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm">
                      {analytics.ai_insights}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">💡 AI Action Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {suggestions.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        <Button onClick={fetchSuggestions} variant="outline">
                          Get AI Suggestions
                        </Button>
                      </div>
                    ) : (
                      suggestions.map((suggestion) => (
                        <Card key={suggestion.id} className="border border-gray-200">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={suggestion.priority === 'high' ? 'default' : 'secondary'} size="sm">
                                    {suggestion.priority}
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm">{suggestion.action}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => sendMessage(`Execute: ${suggestion.action}`)}
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

export default AdminAgentPanel;
