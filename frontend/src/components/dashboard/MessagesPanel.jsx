import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MessagesPanel() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [privateMessages, setPrivateMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChannels();
    fetchPrivateMessages();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const { data } = await axios.get(`${API}/chat/channels`);
      setChannels(data);
      if (data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (e) {
      toast.error('Failed to load channels');
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const { data } = await axios.get(`${API}/chat/channels/${channelId}/messages`);
      setMessages(data);
    } catch (e) {
      toast.error('Failed to load messages');
    }
  };

  const fetchPrivateMessages = async () => {
    try {
      const { data } = await axios.get(`${API}/messages`);
      setPrivateMessages(data);
    } catch (e) {
      toast.error('Failed to load private messages');
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    try {
      await axios.post(`${API}/chat/channels/${selectedChannel.id}/messages`, { body: newMessage.trim() });
      setNewMessage('');
      fetchMessages(selectedChannel.id);
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <Tabs defaultValue="lounge" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="lounge">Agency Lounge</TabsTrigger>
        <TabsTrigger value="dms">DMs</TabsTrigger>
      </TabsList>

      <TabsContent value="lounge" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannel?.id === channel.id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedChannel(channel)}
                  >
                    # {channel.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>{selectedChannel ? `#${selectedChannel.name}` : 'Select a channel'}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-96">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {msg.user_id ? msg.user_id[0].toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">User {msg.user_id}</p>
                        <p className="text-sm">{msg.body}</p>
                        <p className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              {selectedChannel && (
                <div className="flex gap-2 mt-4">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="dms" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Private Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {privateMessages.length === 0 ? (
              <p className="text-gray-600">No private messages.</p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {privateMessages.map((msg) => (
                    <Card key={msg.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{msg.sender_id === 'current_user_id' ? 'You' : `From: ${msg.sender_id}`}</p>
                            <p className="text-gray-600">{msg.message}</p>
                            <p className="text-xs text-gray-500">{new Date(msg.sent_at).toLocaleString()}</p>
                          </div>
                          <Badge variant={msg.status === 'read' ? 'secondary' : 'default'}>
                            {msg.status}
                          </Badge>
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
    </Tabs>
  );
}

export default MessagesPanel;
