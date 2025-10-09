import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
    
    // Initial greeting
    setMessages([{
      role: 'assistant',
      content: "🧞‍♂️ Master, I am BeanGenie™ - your strategic assistant. Command me for organic strategies, bigo wheel tactics, raffle management, and financial tracking!",
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
      console.error('Error loading BeanGenie data:', error);
    }
  };

  const sendMessage = async (messageText = null) => {
    const message = (messageText || input).trim();
    if (!message) return;
    
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/beangenie/chat`, {
        message,
        session_id: sessionId.current
      });

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Categorize and display in panels
      categorizeAndDisplay(data.response);
      
      // Speak response
      setTimeout(() => speakText(data.response), 300);
      
    } catch (error) {
      console.error('BeanGenie error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '⚠️ Error connecting to BeanGenie: ' + (error.response?.data?.detail || error.message),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('BeanGenie error');
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      setVoiceStatus('🗣️ BeanGenie speaks...');

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

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header with BeanGenie Logo */}
      <div className="p-4 text-center border-b border-yellow-500/30">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img 
            src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/uzty33em_bean_genie_no_bg.webp" 
            alt="BeanGenie" 
            className="h-16 w-16 object-contain"
          />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
            BeanGenie™ Master Assistant
          </h2>
        </div>
        {voiceStatus && (
          <div className="text-sm text-yellow-400 animate-pulse">{voiceStatus}</div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Chat */}
        <div className="flex flex-col w-1/3 border-r border-yellow-500/30">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-4 py-2 rounded-2xl max-w-xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black'
                    : 'bg-gray-900 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <div className="inline-block px-4 py-2 rounded-2xl bg-gray-900 text-yellow-400">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                    Consulting BeanGenie...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-4 border-t border-yellow-500/30 flex items-center gap-2">
            {/* Voice Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              className={`relative p-3 rounded-full transition-all ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-yellow-400 to-orange-400'
              }`}
              title="Hold to record voice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="#000" viewBox="0 0 24 24" className="w-6 h-6">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') sendMessage(); }}
              placeholder="Command the genie..."
              className="flex-1 bg-black border-yellow-500 text-yellow-400"
            />

            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:brightness-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 fill-black">
                <path d="M12 2C10.343 2 9 3.343 9 5C9 6.657 10.343 8 12 8C13.657 8 15 6.657 15 5C15 3.343 13.657 2 12 2Z"/>
              </svg>
            </Button>

            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                className="bg-red-500 hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Right - Data Panels */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Organic Strategies */}
            <Card className="bg-gray-900 border-yellow-500/30">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                <CardTitle className="text-yellow-400">🌱 Organic Strategies</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {organicStrategies.length === 0 ? (
                  <p className="text-sm text-yellow-400/50">Waiting for organic strategy suggestions...</p>
                ) : (
                  organicStrategies.map((strategy, idx) => (
                    <div key={idx} className="bg-black/50 p-2 rounded border-l-4 border-yellow-500">
                      <div className="text-sm text-yellow-400">{strategy.content}</div>
                      <div className="text-xs text-yellow-400/50 mt-1">
                        {new Date(strategy.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Digital Bigo Wheel */}
            <Card className="bg-gray-900 border-yellow-500/30">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                <CardTitle className="text-yellow-400">🎯 Digital Bigo Wheel</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {bigoWheelStrategies.length === 0 ? (
                  <p className="text-sm text-yellow-400/50">No wheel strategies loaded...</p>
                ) : (
                  bigoWheelStrategies.map((strategy, idx) => (
                    <div key={idx} className="bg-black/50 p-2 rounded border-l-4 border-blue-500">
                      <div className="text-sm text-yellow-400">{strategy.content}</div>
                      <div className="text-xs text-yellow-400/50 mt-1">
                        {new Date(strategy.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Raffles & Contests */}
            <Card className="bg-gray-900 border-yellow-500/30">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 flex flex-row items-center justify-between">
                <CardTitle className="text-yellow-400">🎫 Raffles & Contests</CardTitle>
                <Button size="sm" onClick={() => addRaffleEntry()} className="bg-yellow-500 text-black hover:bg-yellow-400">
                  Add Entry
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-yellow-500/30">
                        <th className="text-left p-2 text-yellow-400">Name</th>
                        <th className="text-left p-2 text-yellow-400">Tickets</th>
                        <th className="text-left p-2 text-yellow-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raffles.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-2 text-center text-yellow-400/50">No raffle entries yet...</td>
                        </tr>
                      ) : (
                        raffles.map((raffle) => (
                          <tr key={raffle.id} className="border-b border-yellow-500/10 hover:bg-yellow-500/5">
                            <td className="p-2 text-yellow-400">{raffle.name}</td>
                            <td className="p-2 text-yellow-400">{raffle.tickets}</td>
                            <td className="p-2">
                              <Button size="sm" variant="destructive" onClick={() => deleteRaffleEntry(raffle.id)}>
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
            <Card className="bg-gray-900 border-yellow-500/30">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 flex flex-row items-center justify-between">
                <CardTitle className="text-yellow-400">💰 Financial Tracking</CardTitle>
                <Button size="sm" onClick={() => addDebtEntry()} className="bg-yellow-500 text-black hover:bg-yellow-400">
                  Add Debt
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-yellow-500/30">
                        <th className="text-left p-2 text-yellow-400">Name</th>
                        <th className="text-left p-2 text-yellow-400">Amount</th>
                        <th className="text-left p-2 text-yellow-400">Due Date</th>
                        <th className="text-left p-2 text-yellow-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debts.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-2 text-center text-yellow-400/50">No financial records yet...</td>
                        </tr>
                      ) : (
                        debts.map((debt) => (
                          <tr key={debt.id} className="border-b border-yellow-500/10 hover:bg-yellow-500/5">
                            <td className="p-2 text-yellow-400">{debt.name}</td>
                            <td className="p-2 text-yellow-400">${debt.amount.toFixed(2)}</td>
                            <td className="p-2 text-yellow-400">{debt.dueDate}</td>
                            <td className="p-2">
                              <Button size="sm" variant="default" onClick={() => deleteDebtEntry(debt.id)}>
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
            <Card className="bg-gray-900 border-yellow-500/30">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                <CardTitle className="text-yellow-400">📊 Quick Analytics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-yellow-400">
                  <span>Total Raffle Entries:</span>
                  <span className="font-bold">{analytics.totalRaffles}</span>
                </div>
                <div className="flex justify-between text-yellow-400">
                  <span>Outstanding Debts:</span>
                  <span className="font-bold">${analytics.totalDebts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-yellow-400">
                  <span>Active Strategies:</span>
                  <span className="font-bold">{analytics.activeStrategies}</span>
                </div>
              </CardContent>
            </Card>

            {/* Master Notes */}
            <Card className="bg-gray-900 border-yellow-500/30">
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900">
                <CardTitle className="text-yellow-400">📝 Master Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-32 bg-black border border-yellow-500/30 rounded p-2 text-yellow-400 resize-none focus:border-yellow-500 outline-none"
                  placeholder="Master's private notes..."
                />
                <Button onClick={saveNotes} className="mt-2 bg-yellow-500 text-black hover:bg-yellow-400">
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
