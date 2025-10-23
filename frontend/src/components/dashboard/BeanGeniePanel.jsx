import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function BeanGeniePanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  
  // Data states - Dynamic panels
  const [dynamicPanels, setDynamicPanels] = useState({});
  const [activePanels, setActivePanels] = useState([
    'organic_strategies',
    'bigo_wheel',
    'raffles',
    'financial',
    'analytics',
    'notes'
  ]);
  
  // Legacy states for backward compatibility
  const [raffles, setRaffles] = useState([]);
  const [debts, setDebts] = useState([]);
  const [notes, setNotes] = useState('');
  const [analytics, setAnalytics] = useState({
    totalRaffles: 0,
    totalDebts: 0,
    activeStrategies: 0
  });

  // Bigo Wheel states
  const [activeWheel, setActiveWheel] = useState(null);
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [spinHistory, setSpinHistory] = useState([]);
  const [showWheelConfig, setShowWheelConfig] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);
  const sessionId = useRef(`beangenie_${Date.now()}`);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setVoiceStatus('🎤 Master is commanding...');
      };

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
        
        if (event.results[event.resultIndex].isFinal) {
          setVoiceStatus('✨ Processing master\'s command...');
          setTimeout(() => sendMessage(transcript), 500);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (!isSpeaking) {
          setVoiceStatus('');
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setVoiceStatus('❌ Voice recognition error: ' + event.error);
        setIsRecording(false);
      };
    }

    // Load initial data
    loadBeanGenieData();
    
    // Load wheel data
    loadWheelData();
    
    // Initial greeting
    setMessages([{
      role: 'assistant',
      content: "🎯 Hey Boss! I'm your LVL UP Coach - your AI coach and strategic partner! I'll help you with:\n\n💪 Growth & Strategy\n🎯 Bigo Wheel Management (gift-to-spin prizes!)\n📊 Performance Coaching\n💰 Monetization Tips\n🎬 Content Planning\n\nWhat do you need help with today?",
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadBeanGenieData = async () => {
    try {
      const { data } = await axios.get(`${API}/beangenie/data`);
      
      // Load dynamic panels
      setDynamicPanels(data.dynamicPanels || {});
      
      // Legacy data
      setRaffles(data.raffles || []);
      setDebts(data.debts || []);
      setNotes(data.notes || '');
      updateAnalytics(data);
    } catch (error) {
      console.error('Error loading LVL UP Coach data:', error);
    }
  };

  const sendMessage = async (messageText = null, contextCategory = null) => {
    const message = (messageText || input).trim();
    if (!message) return;
    
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      category: contextCategory
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Include active panel context for smarter responses
      const activePanelContext = Object.entries(dynamicPanels).map(([key, panel]) => ({
        category: key,
        title: panel.title,
        recent_items: panel.items.slice(-3).map(i => i.content)
      }));

      const { data } = await axios.post(`${API}/beangenie/chat`, {
        message,
        session_id: sessionId.current,
        active_context: contextCategory,
        panel_context: activePanelContext,
        user_role: user?.role
      });

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        category: contextCategory,
        sources: data.sources || []  // Capture sources from API
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Categorize and display in panels
      categorizeAndDisplay(data.response);
      
      // Speak response only if it's not the first message (to avoid autoplay error)
      if (messages.length > 1) {
        setTimeout(() => speakText(data.response), 300);
      }
      
    } catch (error) {
      console.error('LVL UP Coach error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '⚠️ Error connecting to LVL UP Coach: ' + (error.response?.data?.detail || error.message),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('LVL UP Coach error');
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      setVoiceStatus('🗣️ Coach speaks...');

      const { data } = await axios.post(`${API}/beangenie/tts`, {
        text: text.substring(0, 500) // Limit length
      });

      if (data.audio_base64) {
        const audioBlob = base64ToBlob(data.audio_base64, data.mime || 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          setVoiceStatus('');
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setVoiceStatus('');
          currentAudioRef.current = null;
        };

        audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      setVoiceStatus('');
    }
  };

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    setVoiceStatus('');
  };

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const categorizeAndDisplay = async (response) => {
    try {
      // Send to backend for intelligent categorization
      const { data } = await axios.post(`${API}/beangenie/categorize`, {
        content: response
      });
      
      if (data.categories && data.categories.length > 0) {
        // Update dynamic panels with categorized content
        const newPanels = { ...dynamicPanels };
        
        data.categories.forEach(category => {
          const panelKey = category.category_key;
          
          if (!newPanels[panelKey]) {
            newPanels[panelKey] = {
              title: category.category_name,
              icon: category.icon || '📋',
              color: category.color || 'yellow',
              items: []
            };
          }
          
          newPanels[panelKey].items.push({
            content: category.extracted_content || response,
            timestamp: new Date().toISOString(),
            metadata: category.metadata || {}
          });
        });
        
        setDynamicPanels(newPanels);
        
        // Make sure new panels are active
        const newActivePanels = [...new Set([...activePanels, ...data.categories.map(c => c.category_key)])];
        setActivePanels(newActivePanels);
      }
      
      // Legacy handlers for raffles and debts
      const lowerResponse = response.toLowerCase();
      
      // Check for raffle mentions
      if (lowerResponse.includes('raffle') || lowerResponse.includes('ticket') || lowerResponse.includes('contest')) {
        const nameMatch = response.match(/(?:add|give|assign)\s+(\w+)/i);
        const ticketMatch = response.match(/(\d+)\s+tickets?/i);
        
        if (nameMatch && ticketMatch) {
          addRaffleEntry(nameMatch[1], parseInt(ticketMatch[1]));
        }
      }
      
      // Check for financial mentions
      if (lowerResponse.includes('debt') || lowerResponse.includes('owe') || lowerResponse.includes('pay') || lowerResponse.includes('money')) {
        const nameMatch = response.match(/(\w+)\s+owes?/i);
        const amountMatch = response.match(/\$?(\d+(?:\.\d{2})?)/);
        
        if (nameMatch && amountMatch) {
          addDebtEntry(nameMatch[1], parseFloat(amountMatch[1]));
        }
      }
    } catch (error) {
      console.error('Error categorizing response:', error);
    }
  };

  const saveStrategy = async (type, strategy) => {
    try {
      await axios.post(`${API}/beangenie/strategy`, { type, ...strategy });
    } catch (error) {
      console.error('Error saving strategy:', error);
    }
  };

  const addRaffleEntry = async (name = null, tickets = null) => {
    name = name || prompt('Enter participant name:');
    tickets = tickets || parseInt(prompt('Enter number of tickets:') || '1');
    
    if (name && tickets > 0) {
      try {
        const { data } = await axios.post(`${API}/beangenie/raffle`, {
          name,
          tickets,
          dateAdded: new Date().toISOString()
        });
        setRaffles(prev => [...prev, data]);
        updateAnalyticsLocal();
        toast.success('Raffle entry added');
      } catch (error) {
        toast.error('Failed to add raffle entry');
      }
    }
  };

  const deleteRaffleEntry = async (id) => {
    try {
      await axios.delete(`${API}/beangenie/raffle/${id}`);
      setRaffles(prev => prev.filter(r => r.id !== id));
      updateAnalyticsLocal();
      toast.success('Raffle entry deleted');
    } catch (error) {
      toast.error('Failed to delete raffle entry');
    }
  };

  const addDebtEntry = async (name = null, amount = null) => {
    name = name || prompt('Enter debtor name:');
    amount = amount || parseFloat(prompt('Enter amount owed:') || '0');
    const dueDate = prompt('Enter due date (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];
    
    if (name && amount > 0) {
      try {
        const { data } = await axios.post(`${API}/beangenie/debt`, {
          name,
          amount,
          dueDate,
          dateAdded: new Date().toISOString()
        });
        setDebts(prev => [...prev, data]);
        updateAnalyticsLocal();
        toast.success('Debt entry added');
      } catch (error) {
        toast.error('Failed to add debt entry');
      }
    }
  };

  const deleteDebtEntry = async (id) => {
    try {
      await axios.delete(`${API}/beangenie/debt/${id}`);
      setDebts(prev => prev.filter(d => d.id !== id));
      updateAnalyticsLocal();
      toast.success('Debt marked as paid');
    } catch (error) {
      toast.error('Failed to delete debt entry');
    }
  };

  const saveNotes = async () => {
    try {
      await axios.post(`${API}/beangenie/notes`, { content: notes });
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    }
  };

  const updateAnalyticsLocal = () => {
    const totalRaffleTickets = raffles.reduce((sum, raffle) => sum + (raffle.tickets || 0), 0);
    const totalDebtAmount = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
    const activeStrategies = Object.keys(dynamicPanels).reduce((sum, key) => {
      return sum + (dynamicPanels[key]?.items?.length || 0);
    }, 0);
    
    setAnalytics({
      totalRaffles: totalRaffleTickets,
      totalDebts: totalDebtAmount,
      activeStrategies,
      activePanels: Object.keys(dynamicPanels).length
    });
  };

  const updateAnalytics = (data) => {
    const totalRaffleTickets = (data.raffles || []).reduce((sum, raffle) => sum + (raffle.tickets || 0), 0);
    const totalDebtAmount = (data.debts || []).reduce((sum, debt) => sum + (debt.amount || 0), 0);
    const activeStrategies = Object.keys(data.dynamicPanels || {}).reduce((sum, key) => {
      return sum + (data.dynamicPanels[key]?.items?.length || 0);
    }, 0);
    
    setAnalytics({
      totalRaffles: totalRaffleTickets,
      totalDebts: totalDebtAmount,
      activeStrategies,
      activePanels: Object.keys(data.dynamicPanels || {}).length
    });
  };

  useEffect(() => {
    updateAnalyticsLocal();
  }, [raffles, debts, dynamicPanels]);

  const clearPanel = async (panelKey) => {
    try {
      await axios.delete(`${API}/beangenie/panel/${panelKey}`);
      const newPanels = { ...dynamicPanels };
      delete newPanels[panelKey];
      setDynamicPanels(newPanels);
      setActivePanels(activePanels.filter(p => p !== panelKey));
      toast.success('Panel cleared');
    } catch (error) {
      toast.error('Failed to clear panel');
    }
  };

  // Bigo Wheel Management
  const createWheel = async (wheelData) => {
    try {
      const { data } = await axios.post(`${API}/beangenie/wheel`, wheelData);
      setActiveWheel(data);
      setWheelPrizes(data.prizes || []);
      toast.success('Wheel created!');
      setShowWheelConfig(false);
    } catch (error) {
      toast.error('Failed to create wheel');
    }
  };

  const addWheelPrize = async (prize) => {
    try {
      const { data } = await axios.post(`${API}/beangenie/wheel/${activeWheel.id}/prize`, prize);
      setWheelPrizes(prev => [...prev, data]);
      toast.success('Prize added');
    } catch (error) {
      toast.error('Failed to add prize');
    }
  };

  const recordSpin = async (winnerId, prizeId) => {
    try {
      const { data } = await axios.post(`${API}/beangenie/wheel/${activeWheel.id}/spin`, {
        winner_id: winnerId,
        prize_id: prizeId
      });
      setSpinHistory(prev => [data, ...prev]);
      toast.success('Spin recorded!');
    } catch (error) {
      toast.error('Failed to record spin');
    }
  };

  const loadWheelData = async () => {
    try {
      const { data } = await axios.get(`${API}/beangenie/wheel/active`);
      if (data.wheel) {
        setActiveWheel(data.wheel);
        setWheelPrizes(data.prizes || []);
        setSpinHistory(data.spins || []);
      }
    } catch (error) {
      console.error('Failed to load wheel data:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Simplified Header */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center justify-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
            alt="LVL UP Coach" 
            className="h-12 w-12 object-contain"
          />
          <h2 className="text-xl font-bold text-gray-800">
            LVL UP Coach
          </h2>
        </div>
        {voiceStatus && (
          <div className="text-sm text-gray-600 text-center mt-2">{voiceStatus}</div>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left - Chat */}
        <div className="flex flex-col w-full md:w-1/3 border-r border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-4 py-3 rounded-lg max-w-xl ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  {/* Sources Section */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300 text-xs">
                      <div className="font-semibold text-gray-600 mb-2">📚 Sources:</div>
                      <div className="space-y-1">
                        {msg.sources.map((source, sidx) => (
                          <div key={sidx}>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {source.label}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <div className="inline-block px-4 py-3 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm">Consulting Coach...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Simplified Input Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center gap-2 bg-white">
            {/* Voice Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              className={`relative p-2 rounded-lg transition-all ${
                isRecording 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              title="Hold to record voice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill={isRecording ? "#fff" : "#374151"} viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') sendMessage(); }}
              placeholder="Ask your coach..."
              className="flex-1 bg-white border-gray-300 text-gray-800"
            />

            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </Button>

            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Right - Simplified Data Panels */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Dynamic Panels - Rendered based on conversation */}
            {Object.entries(dynamicPanels).map(([panelKey, panel]) => (
              <Card key={panelKey} className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50 flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-gray-700 text-base">
                    {panel.icon} {panel.title}
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => clearPanel(panelKey)}
                    className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                  {(!panel.items || panel.items.length === 0) ? (
                    <p className="text-sm text-gray-400">No {panel.title.toLowerCase()} yet...</p>
                  ) : (
                    panel.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gray-50 p-3 rounded border-l-4"
                        style={{ borderLeftColor: panel.color === 'yellow' ? '#EAB308' : panel.color === 'blue' ? '#3B82F6' : panel.color === 'green' ? '#10B981' : panel.color === 'red' ? '#EF4444' : '#A855F7' }}
                      >
                        <div className="text-sm text-gray-700">{item.content}</div>
                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(item.metadata).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                <strong>{key}:</strong> {value}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Raffles & Contests */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 flex flex-row items-center justify-between py-3">
                <CardTitle className="text-gray-700 text-base">🎫 Raffles & Contests</CardTitle>
                <Button size="sm" onClick={() => addRaffleEntry()} className="bg-blue-500 text-white hover:bg-blue-600">
                  Add Entry
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 text-gray-600">Name</th>
                        <th className="text-left p-2 text-gray-600">Tickets</th>
                        <th className="text-left p-2 text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raffles.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-2 text-center text-gray-400">No raffle entries yet...</td>
                        </tr>
                      ) : (
                        raffles.map((raffle) => (
                          <tr key={raffle.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 text-gray-700">{raffle.name}</td>
                            <td className="p-2 text-gray-700">{raffle.tickets}</td>
                            <td className="p-2">
                              <Button size="sm" variant="destructive" onClick={() => deleteRaffleEntry(raffle.id)} className="text-xs">
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Financial Tracking */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 flex flex-row items-center justify-between py-3">
                <CardTitle className="text-gray-700 text-base">💰 Financial Tracking</CardTitle>
                <Button size="sm" onClick={() => addDebtEntry()} className="bg-blue-500 text-white hover:bg-blue-600">
                  Add Debt
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 text-gray-600">Name</th>
                        <th className="text-left p-2 text-gray-600">Amount</th>
                        <th className="text-left p-2 text-gray-600">Due Date</th>
                        <th className="text-left p-2 text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debts.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-2 text-center text-gray-400">No financial records yet...</td>
                        </tr>
                      ) : (
                        debts.map((debt) => (
                          <tr key={debt.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 text-gray-700">{debt.name}</td>
                            <td className="p-2 text-gray-700">${debt.amount.toFixed(2)}</td>
                            <td className="p-2 text-gray-700">{debt.dueDate}</td>
                            <td className="p-2">
                              <Button size="sm" variant="default" onClick={() => deleteDebtEntry(debt.id)} className="text-xs">
                                Paid
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Analytics */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 py-3">
                <CardTitle className="text-gray-700 text-base">📊 Quick Analytics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Active Panels:</span>
                  <span className="font-semibold">{analytics.activePanels || 0}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Total Items:</span>
                  <span className="font-semibold">{analytics.activeStrategies}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Raffle Tickets:</span>
                  <span className="font-semibold">{analytics.totalRaffles}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Outstanding Debts:</span>
                  <span className="font-semibold">${analytics.totalDebts.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Bigo Wheel Management */}
            <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
              <CardHeader className="bg-gray-50 flex flex-row items-center justify-between py-3">
                <CardTitle className="text-gray-700 text-base">🎯 Bigo Wheel Manager</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowWheelConfig(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {activeWheel ? 'Edit Wheel' : '+ Create Wheel'}
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {!activeWheel ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎡</div>
                    <p className="text-yellow-600/70 mb-2">No active wheel</p>
                    <p className="text-sm text-yellow-600/50">
                      Create a digital spin wheel! Viewers send gifts to spin for prizes like tasks, rewards, or challenges.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Wheel Info */}
                    <div className="bg-white/50 p-4 rounded-lg border border-yellow-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-yellow-600">{activeWheel.name}</h3>
                          <p className="text-sm text-yellow-600/70">
                            Cost: {activeWheel.gift_cost} {activeWheel.gift_type}
                          </p>
                        </div>
                        <Badge className="bg-green-500 text-white">Active</Badge>
                      </div>
                    </div>

                    {/* Prizes List */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-yellow-600">Prizes ({wheelPrizes.length})</h4>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const name = prompt('Prize name:');
                            const type = prompt('Type (task/physical/content):');
                            if (name && type) {
                              addWheelPrize({ name, type, icon: type === 'task' ? '🎭' : type === 'physical' ? '🎁' : '📹' });
                            }
                          }}
                          className="text-xs"
                        >
                          + Add Prize
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {wheelPrizes.length === 0 ? (
                          <p className="text-xs text-yellow-600/50 text-center py-4">No prizes yet</p>
                        ) : (
                          wheelPrizes.map((prize) => (
                            <div key={prize.id} className="bg-white/30 p-2 rounded flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{prize.icon}</span>
                                <div>
                                  <div className="text-sm text-yellow-600">{prize.name}</div>
                                  <div className="text-xs text-yellow-600/50">{prize.type}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recent Spins */}
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-600 mb-2">Recent Spins ({spinHistory.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {spinHistory.length === 0 ? (
                          <p className="text-xs text-yellow-600/50 text-center py-2">No spins yet</p>
                        ) : (
                          spinHistory.slice(0, 5).map((spin) => (
                            <div key={spin.id} className="bg-white/30 p-2 rounded text-xs flex justify-between items-center">
                              <div>
                                <span className="text-yellow-600">{spin.winner_name}</span>
                                <span className="text-yellow-600/50"> won </span>
                                <span className="text-yellow-600">{spin.prize_name}</span>
                              </div>
                              {!spin.fulfilled && (
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Master Notes */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 py-3">
                <CardTitle className="text-gray-700 text-base">📝 Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-32 bg-white border border-gray-300 rounded p-3 text-gray-700 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Your notes..."
                />
                <Button onClick={saveNotes} className="mt-2 bg-blue-500 text-white hover:bg-blue-600">
                  Save Notes
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

export default BeanGeniePanel;
