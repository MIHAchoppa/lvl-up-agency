import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function BigoAcademyPanel() {
  const [activeCategory, setActiveCategory] = useState('basics');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tutorials, setTutorials] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const currentAudioRef = useRef(null);

  const categories = [
    { id: 'basics', name: '🎯 Basics', icon: '🎯' },
    { id: 'streaming', name: '📹 Streaming Tips', icon: '📹' },
    { id: 'monetization', name: '💰 Monetization', icon: '💰' },
    { id: 'engagement', name: '👥 Engagement', icon: '👥' },
    { id: 'technical', name: '🔧 Technical', icon: '🔧' },
    { id: 'growth', name: '📈 Growth', icon: '📈' }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Welcome message
    setMessages([{
      role: 'assistant',
      content: "📚 Welcome to Bigo Academy! I'm your tutorial assistant powered by compound AI models. Ask me anything about BIGO Live, and I'll generate comprehensive tutorials with real online data!\n\nTry: 'How to increase viewers' or 'Best streaming times'",
      timestamp: new Date()
    }]);
  }, []);

  const generateTutorial = async (topic) => {
    const userMessage = {
      role: 'user',
      content: topic,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/academy/generate`, {
        topic,
        category: activeCategory
      });

      const assistantMessage = {
        role: 'assistant',
        content: data.tutorial,
        timestamp: new Date(),
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save to tutorials collection
      if (data.metadata?.title) {
        setTutorials(prev => ({
          ...prev,
          [activeCategory]: [
            ...(prev[activeCategory] || []),
            {
              title: data.metadata.title,
              content: data.tutorial,
              timestamp: new Date()
            }
          ]
        }));
      }

      // Generate voice for the tutorial
      await speakText(data.tutorial);

      toast.success('Tutorial generated!');
    } catch (error) {
      console.error('Academy error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '⚠️ Sorry, I had trouble generating that tutorial. Please try rephrasing your question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Tutorial generation failed');
    } finally {
      setLoading(false);
    }
  };

  const quickTopics = {
    basics: [
      'Getting started on BIGO Live',
      'Creating an attractive profile',
      'Understanding BIGO interface'
    ],
    streaming: [
      'Best camera angles',
      'Lighting setup guide',
      'Audio quality tips'
    ],
    monetization: [
      'Understanding gifts and beans',
      'Building paid subscriptions',
      'Maximizing earnings'
    ],
    engagement: [
      'Interacting with viewers',
      'Building loyal fanbase',
      'Handling trolls professionally'
    ],
    technical: [
      'OBS setup for BIGO',
      'Internet speed requirements',
      'Troubleshooting common issues'
    ],
    growth: [
      'Growing followers fast',
      'Cross-platform promotion',
      'Collaboration strategies'
    ]
  };

  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      
      // Limit text length for TTS (first 500 characters)
      const textToSpeak = text.substring(0, 500);
      
      const { data } = await axios.post(`${API}/tts/speak`, {
        text: textToSpeak,
        voice: 'Fritz-PlayAI'
      });

      if (data.audio_base64) {
        const audioData = `data:audio/wav;base64,${data.audio_base64}`;
        const audio = new Audio(audioData);
        
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };

        await audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Bigo Academy
            </span>
            <Badge className="ml-auto">AI-Powered</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
            <div className="px-4 border-b">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                    {cat.icon}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {categories.map(cat => (
              <TabsContent key={cat.id} value={cat.id} className="flex-1 flex flex-col m-0 p-4">
                <div className="flex-1 flex gap-4">
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            {msg.metadata && (
                              <div className="mt-2 pt-2 border-t border-gray-300 text-xs opacity-75">
                                {msg.metadata.sources && (
                                  <div>📖 Sources: {msg.metadata.sources}</div>
                                )}
                                {msg.metadata.difficulty && (
                                  <div>🎯 Level: {msg.metadata.difficulty}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              Generating comprehensive tutorial...
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && generateTutorial(input)}
                        placeholder={`Ask about ${cat.name.split(' ')[1].toLowerCase()}...`}
                        className="flex-1"
                        disabled={loading}
                      />
                      {isSpeaking && (
                        <Button
                          onClick={stopSpeaking}
                          variant="outline"
                          className="text-red-500"
                        >
                          🔇 Stop
                        </Button>
                      )}
                      <Button
                        onClick={() => generateTutorial(input)}
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  {/* Quick Topics Sidebar */}
                  <div className="w-64 space-y-2">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Quick Topics</h3>
                    {quickTopics[cat.id]?.map((topic, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(topic);
                          generateTutorial(topic);
                        }}
                        className="w-full text-left p-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        disabled={loading}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Saved Tutorials */}
      {tutorials[activeCategory]?.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Saved Tutorials ({tutorials[activeCategory].length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {tutorials[activeCategory].map((tut, idx) => (
                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium">{tut.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(tut.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BigoAcademyPanel;
