import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import AIAssistButton from '../ui/AIAssistButton';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function EnhancedMessagingPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('lounge');
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [wsConnection, setWsConnection] = useState(null);
  
  // New message dialog
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState('');
  
  // @ mention states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    initializeWebSocket();
    fetchInitialData();
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const initializeWebSocket = () => {
    // In a real implementation, this would connect to the WebSocket endpoint
    // For now, we'll simulate with polling
    console.log('WebSocket connection would be initialized here');
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchChannels(),
        fetchPrivateMessages(),
        initializeDefaultChannel(),
        fetchAllUsers()
      ]);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/users`);
      setAllUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Fallback to empty array
      setAllUsers([]);
    }
  };

  const fetchChannels = async () => {
    try {
      const { data } = await axios.get(`${API}/chat/channels`);
      setChannels(data);
      if (data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (error) {
      console.error('Channels fetch error:', error);
      // Create default channel structure if API fails
      const defaultChannels = [
        { id: 'agency-lounge', name: 'agency-lounge', description: 'Agency-wide chat', visibility: 'private' },
        { id: 'coaching-corner', name: 'coaching-corner', description: 'Coaching discussions', visibility: 'private' },
        { id: 'pk-battles', name: 'pk-battles', description: 'PK battle coordination', visibility: 'private' },
        { id: 'announcements', name: 'announcements', description: 'Official announcements', visibility: 'private' }
      ];
      setChannels(defaultChannels);
      setSelectedChannel(defaultChannels[0]);
    }
  };

  const initializeDefaultChannel = async () => {
    try {
      await axios.post(`${API}/chat/channels/init-default`);
    } catch (error) {
      console.error('Default channel init error:', error);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const { data } = await axios.get(`${API}/chat/channels/${channelId}/messages`);
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Messages fetch error:', error);
      // Show sample messages if API fails
      const sampleMessages = [
        {
          id: '1',
          user_id: 'admin',
          body: 'Welcome to the agency lounge! 👋',
          created_at: new Date().toISOString(),
          flagged: false
        },
        {
          id: '2',
          user_id: 'coach1',
          body: 'Great to see everyone here! Let\'s make this week amazing! 🚀',
          created_at: new Date().toISOString(),
          flagged: false
        }
      ];
      setMessages(sampleMessages);
    }
  };

  const fetchPrivateMessages = async () => {
    try {
      const { data } = await axios.get(`${API}/messages`);
      setPrivateMessages(data || []);
    } catch (error) {
      console.error('Private messages fetch error:', error);
      setPrivateMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    const tempMessage = {
      id: `temp_${Date.now()}`,
      user_id: 'current_user',
      body: newMessage.trim(),
      created_at: new Date().toISOString(),
      flagged: false,
      sending: true
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const response = await axios.post(`${API}/chat/channels/${selectedChannel.id}/messages`, {
        body: newMessage.trim()
      });

      // Replace temp message with actual message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...response.data, sent: true }
            : msg
        )
      );

      toast.success('Message sent!');
    } catch (error) {
      console.error('Message send error:', error);
      
      // Remove temp message and show error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      toast.error('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTyping = () => {
    // Simulate typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
    }, 3000);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    handleTyping();

    // Check for @ mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      
      // Check if we're in a mention (no space after @)
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setMentionQuery(textAfterAt.toLowerCase());
        
        // Filter users by BIGO ID
        const filtered = allUsers.filter(u => 
          u.bigo_id.toLowerCase().includes(textAfterAt.toLowerCase())
        ).slice(0, 5);
        
        setFilteredUsers(filtered);
        setShowMentionDropdown(filtered.length > 0);
        setSelectedMentionIndex(0);

        // Calculate dropdown position
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setMentionPosition({
            top: rect.top - 200, // Above the input
            left: rect.left
          });
        }
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const selectMention = (userBigoId) => {
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const textAfterCursor = newMessage.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    const beforeMention = newMessage.substring(0, lastAtSymbol);
    const newText = beforeMention + `@${userBigoId} ` + textAfterCursor;

    setNewMessage(newText);
    setShowMentionDropdown(false);
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = (beforeMention + `@${userBigoId} `).length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showMentionDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && filteredUsers.length > 0) {
        e.preventDefault();
        selectMention(filteredUsers[selectedMentionIndex].bigo_id);
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessageWithMentions = (text) => {
    // Match @mentions (@ followed by word characters)
    const parts = text.split(/(@\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const mentionedBigoId = part.substring(1);
        const mentionedUser = allUsers.find(u => u.bigo_id === mentionedBigoId);
        
        if (mentionedUser) {
          return (
            <span 
              key={index} 
              className="bg-blue-100 text-blue-800 px-1 rounded font-medium cursor-pointer hover:bg-blue-200"
              title={`${mentionedUser.name} (${mentionedUser.bigo_id})`}
            >
              {part}
            </span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getUserDisplayName = (userId) => {
    // In a real app, this would map user IDs to display names
    const userMap = {
      'admin': '🛡️ Admin',
      'coach1': '🏆 Coach Sarah',
      'coach2': '🏆 Coach Mike',
      'current_user': '👤 You',
      'host1': '⭐ Host Amanda',
      'host2': '⭐ Host David'
    };
    return userMap[userId] || `👤 ${userId}`;
  };

  const getChannelIcon = (channelName) => {
    const icons = {
      'agency-lounge': '🏢',
      'coaching-corner': '🏆',
      'pk-battles': '⚔️',
      'announcements': '📢'
    };
    return icons[channelName] || '💬';
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/read`);
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  // Channel selection handler
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const channelStats = {
    totalMessages: messages.length,
    activeUsers: new Set(messages.map(m => m.user_id)).size,
    todayMessages: messages.filter(m => {
      const msgDate = new Date(m.created_at);
      const today = new Date();
      return msgDate.toDateString() === today.toDateString();
    }).length
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              💬 Enhanced Messaging Hub
              <Badge variant="default">Real-time</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {onlineUsers.length} online
              </div>
              <div>
                📊 {channelStats.todayMessages} messages today
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="lounge">🏢 Agency Channels</TabsTrigger>
              <TabsTrigger value="dms">📫 Direct Messages</TabsTrigger>
              <TabsTrigger value="announcements">📢 Announcements</TabsTrigger>
            </TabsList>

            <TabsContent value="lounge" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Channel List */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm">Channels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {channels.map((channel) => (
                        <Button
                          key={channel.id}
                          variant={selectedChannel?.id === channel.id ? 'default' : 'ghost'}
                          className="w-full justify-start text-left"
                          onClick={() => setSelectedChannel(channel)}
                        >
                          <div className="flex items-center gap-2">
                            <span>{getChannelIcon(channel.name)}</span>
                            <div>
                              <div className="font-medium text-xs">#{channel.name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {channel.description}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>

                    {/* Channel Stats */}
                    {selectedChannel && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-xs font-medium mb-2">Channel Stats</h4>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>Messages: {channelStats.totalMessages}</div>
                          <div>Active users: {channelStats.activeUsers}</div>
                          <div>Today: {channelStats.todayMessages}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {selectedChannel && (
                          <>
                            {getChannelIcon(selectedChannel.name)}
                            #{selectedChannel.name}
                            <Badge variant="secondary" className="text-xs">
                              {messages.length} messages
                            </Badge>
                          </>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {channelStats.activeUsers} participants
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col h-96">
                    {/* Messages Area */}
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            <p>No messages in this channel yet.</p>
                            <p className="text-sm">Be the first to say something! 👋</p>
                          </div>
                        ) : (
                          messages.map((message) => (
                            <div key={message.id} className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {message.user_id[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {getUserDisplayName(message.user_id)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                  {message.flagged && (
                                    <Badge variant="destructive" size="sm">
                                      Flagged
                                    </Badge>
                                  )}
                                  {message.sending && (
                                    <Badge variant="secondary" size="sm">
                                      Sending...
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                  {renderMessageWithMentions(message.body)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        
                        {/* Typing Indicators */}
                        {typingUsers.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    {selectedChannel && (
                      <div className="flex gap-2 relative">
                        <Input
                          ref={inputRef}
                          value={newMessage}
                          onChange={handleInputChange}
                          placeholder={`Message #${selectedChannel.name}... (Type @ to mention)`}
                          onKeyDown={handleKeyDown}
                          disabled={loading}
                          className="flex-1"
                        />
                        <AIAssistButton
                          fieldName="Chat Message"
                          currentValue={newMessage}
                          onSuggest={(text) => setNewMessage(text)}
                          context={{ channel: selectedChannel?.name }}
                        />
                        <Button 
                          onClick={sendMessage} 
                          disabled={loading || !newMessage.trim()}
                          size="sm"
                        >
                          Send
                        </Button>

                        {/* Mention Dropdown */}
                        {showMentionDropdown && (
                          <div 
                            className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto min-w-[250px]"
                          >
                            {filteredUsers.map((mentionUser, index) => (
                              <div
                                key={mentionUser.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                  index === selectedMentionIndex ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => selectMention(mentionUser.bigo_id)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {mentionUser.bigo_id[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{mentionUser.name}</div>
                                    <div className="text-xs text-gray-500">@{mentionUser.bigo_id}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dms" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Direct Messages</CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => setShowNewMessageDialog(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Message
                  </Button>
                </CardHeader>
                <CardContent>
                  {privateMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No direct messages yet.</p>
                      <p className="text-sm">Start a conversation with someone!</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {privateMessages.map((msg) => (
                          <Card key={msg.id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">
                                      {msg.sender_id === 'current_user_id' ? 'You' : getUserDisplayName(msg.sender_id)}
                                    </span>
                                    <Badge variant={msg.status === 'read' ? 'secondary' : 'default'} size="sm">
                                      {msg.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{msg.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatMessageTime(msg.sent_at)}
                                  </p>
                                </div>
                                {msg.status === 'sent' && msg.sender_id !== 'current_user_id' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => markMessageAsRead(msg.id)}
                                  >
                                    Mark Read
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="announcements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📢 Official Announcements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sample announcements */}
                    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-blue-800">
                              🚀 Weekly PK Tournament Announced!
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              Join us this Friday for the weekly PK battle tournament! 
                              Prizes include bonus beans and exclusive recognition badges.
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              Posted by Admin • 2 hours ago
                            </p>
                          </div>
                          <Badge variant="secondary" size="sm">Pinned</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-green-800">
                              🎉 New Coaching Sessions Available
                            </h4>
                            <p className="text-sm text-green-700 mt-1">
                              Advanced BIGO Live strategies and tier optimization sessions 
                              are now available. Book your spot today!
                            </p>
                            <p className="text-xs text-green-600 mt-2">
                              Posted by Coach Sarah • 5 hours ago
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 bg-purple-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-purple-800">
                              ⭐ Top Performer Recognition
                            </h4>
                            <p className="text-sm text-purple-700 mt-1">
                              Congratulations to this month's top performers! Your dedication 
                              to excellence continues to inspire the entire agency.
                            </p>
                            <p className="text-xs text-purple-600 mt-2">
                              Posted by Admin • 1 day ago
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">💡 Smart Messaging Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              🤖 AI Message Summary
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              📊 Channel Analytics
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              🔍 Search Messages
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              ⚡ Quick Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnhancedMessagingPanel;