import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AICoachPanel() {
  const [activeMode, setActiveMode] = useState('text'); // text, voice
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [hasMemory, setHasMemory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/ai/chat/history`);
      setMessages(data.map(chat => ({
        role: 'user',
        content: chat.message,
        timestamp: chat.created_at
      })).concat(data.map(chat => ({
        role: 'assistant',
        content: chat.ai_response,
        timestamp: chat.created_at
      }))).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    } catch (e) {
      // No history or error, start fresh
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);
    
    try {
      // Use memory-enabled chat endpoint
      const { data } = await axios.post(`${API}/ai/chat/with-memory`, { 
        message: userMessage, 
        chat_type: 'strategy_coach',
        session_id: sessionId
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        timestamp: new Date(),
        enhanced: true
      }]);
      
      setHasMemory(data.has_memory || false);
      
    } catch (e) {
      toast.error('Failed to get AI response');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I had trouble responding. Try again.',
        timestamp: new Date(),
        error: true
      }]);
    }
    setLoading(false);
  };

  const clearMemory = async () => {
    try {
      await axios.delete(`${API}/ai/chat/memory/${sessionId}`);
      toast.success('Memory cleared! Starting fresh conversation.');
      setSessionId(`session_${Date.now()}`);
      setHasMemory(false);
      setMessages([]);
    } catch (e) {
      toast.error('Failed to clear memory');
    }
  };

  const sendVoiceMessage = async (text) => {
    setVoiceLoading(true);
    
    const userMessage = { role: 'user', content: text, timestamp: new Date(), voice: true };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post(`${API}/tts/speak`, {
        text: text,
        voice: 'Fritz-PlayAI'
      });

      const result = response.data;
      
      if (result.audio_base64) {
        const assistantMessage = {
          role: 'assistant',
          content: text,
          timestamp: new Date(),
          audio_base64: result.audio_base64,
          voice: true,
          enhanced: true
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-play audio response
        await playAudioResponse(result.audio_base64);
        
        toast.success('🎙️ Voice response generated!');
      } else {
        throw new Error('Voice generation failed');
      }
      
    } catch (error) {
      console.error('Voice message error:', error);
      toast.error('Voice processing failed');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Voice processing is temporarily unavailable. Please try text chat.',
        timestamp: new Date(),
        error: true
      }]);
    } finally {
      setVoiceLoading(false);
    }
  };

  const playAudioResponse = async (audioBase64) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
      }
      
      const audioData = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioData);
      
      setCurrentAudio(audio);
      
      audio.onended = () => setCurrentAudio(null);
      audio.onerror = () => {
        setCurrentAudio(null);
        toast.error('Audio playback failed');
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      toast.error('Could not play audio response');
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Quick strategy commands
  const quickCommands = [
    "What's my optimal streaming schedule?",
    "How do I maximize beans this week?",
    "PK battle strategies for tonight",
    "Help me reach the next tier",
    "Best gift request techniques",
    "Community building tips"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              🧠 AI Strategy Coach
              <Badge variant="default">Enhanced</Badge>
              {hasMemory && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  🧠 Memory Active
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasMemory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearMemory}
                  className="text-xs"
                >
                  🗑️ Clear Memory
                </Button>
              )}
              <Tabs value={activeMode} onValueChange={setActiveMode}>
                <TabsList>
                  <TabsTrigger value="text">💬 Text Chat</TabsTrigger>
                  <TabsTrigger value="voice">🎙️ Voice Chat</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TabsContent value="text" className="space-y-4">
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-4">
                {messages.filter(m => !m.voice).map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : msg.error 
                          ? 'bg-red-100 text-red-800'
                          : msg.enhanced
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-800'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.timestamp && (
                        <div className="text-xs opacity-70 mt-1">
                          {formatMessageTime(msg.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        Analyzing your strategy...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Quick Commands */}
            <div className="space-y-3">
              <div className="text-sm font-medium">💡 Quick Strategy Questions:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickCommands.map((command, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(command);
                      sendMessage();
                    }}
                    disabled={loading}
                    className="text-left justify-start text-xs"
                  >
                    {command}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your AI strategy coach..."
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading}>
                Send
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4">
            {/* Voice Chat Interface */}
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">🎙️ Voice Strategy Coach</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Activate with "Hey Coach" or click to start voice conversation
                </p>
                
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => sendVoiceMessage("Hey Coach, I need strategy advice")}
                    disabled={voiceLoading}
                    variant="default"
                    size="lg"
                  >
                    {voiceLoading ? '⏳ Processing...' : '🎤 Start Voice Chat'}
                  </Button>
                  
                  {currentAudio && (
                    <Button onClick={stopAudio} variant="outline" size="lg">
                      🔇 Stop Audio
                    </Button>
                  )}
                </div>
              </div>

              {/* Voice Bocademas */}
              <div className="text-left">
                <h4 className="font-medium mb-3">🗣️ Voice Commands (Bocademas):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['Check my beans', 'PK strategy', 'Schedule help', 'Tier advice', 'Event planning', 'Motivation boost'].map((command) => (
                    <Button
                      key={command}
                      variant="outline"
                      size="sm"
                      onClick={() => sendVoiceMessage(command)}
                      disabled={voiceLoading}
                      className="text-xs"
                    >
                      🎙️ {command}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Voice History */}
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {messages.filter(m => m.voice).map((msg, i) => (
                    <Card key={i} className="text-left">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={msg.role === 'user' ? 'secondary' : 'default'} size="sm">
                                {msg.role === 'user' ? '🎤 You' : '🤖 Coach'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatMessageTime(msg.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          {msg.audio_base64 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => playAudioResponse(msg.audio_base64)}
                              disabled={!!currentAudio}
                            >
                              🔊 Replay
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </CardContent>
      </Card>

      {/* Coach Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">🎯 BIGO Live Success Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-600 mb-1">💎 Bean Optimization</h4>
              <p className="text-gray-600">210 beans = $1 USD. Focus on gift psychology and timing.</p>
            </div>
            <div>
              <h4 className="font-medium text-purple-600 mb-1">⚔️ PK Battles</h4>
              <p className="text-gray-600">Energy buildup early, engage audience, backup strategies.</p>
            </div>
            <div>
              <h4 className="font-medium text-green-600 mb-1">📈 Tier Climbing</h4>
              <p className="text-gray-600">Consistent streaming + loyal audience = tier advancement.</p>
            </div>
            <div>
              <h4 className="font-medium text-orange-600 mb-1">🕐 Prime Time</h4>
              <p className="text-gray-600">7-10 PM local time for maximum gift potential.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AICoachPanel;
