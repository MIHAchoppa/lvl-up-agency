import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function VoiceRecruiter({ onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setTimeout(() => sendMessage(transcript), 500);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Show greeting text immediately (no auto-speak due to browser restrictions)
    const greeting = {
      role: 'assistant',
      content: "👋 Hey there! Welcome to Level Up Agency! I'm your AI recruiter. Are you interested in becoming a BIGO Live host with us, or are you already a host looking to join?",
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const { data } = await axios.post(`${API}/recruiter/chat`, {
        message
      });

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      speakText(data.response);

      // Handle navigation based on intent
      if (data.action === 'audition') {
        setTimeout(() => {
          navigate('/audition');
          onClose();
        }, 3000);
      } else if (data.action === 'register') {
        setTimeout(() => {
          navigate('/login');
          onClose();
        }, 3000);
      }

    } catch (error) {
      console.error('Recruiter error:', error);
      const errorMessage = {
        role: 'assistant',
        content: "Sorry, I had trouble connecting. Please try again or click the buttons below to continue.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      const { data } = await axios.post(`${API}/beangenie/tts`, {
        text: text.substring(0, 500)
      });

      if (data.audio_base64) {
        const audioBlob = base64ToBlob(data.audio_base64, data.mime || 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
        };

        audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
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

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-100 to-white border-2 border-yellow-500/50 shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/uzty33em_bean_genie_no_bg.webp" 
                alt="BeanGenie Recruiter" 
                className="h-14 w-14 transition-smooth hover:scale-110"
              />
              <div>
                <h2 className="text-xl font-bold text-yellow-600">AI Recruiter</h2>
                <p className="text-sm text-yellow-600/70">Let's get you started!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-yellow-600 hover:text-yellow-700"
            >
              ✕
            </Button>
          </div>

          {/* Messages */}
          <div className="bg-white/40 rounded-lg p-4 h-64 overflow-y-auto mb-4 space-y-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div 
                  className={`max-w-[80%] p-4 rounded-xl transition-smooth ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900'
                      : 'bg-gray-200 text-yellow-600 border border-yellow-500/30'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-yellow-600 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={startListening}
              disabled={isListening}
              className={`p-3.5 rounded-xl transition-smooth shadow-gold ${
                isListening
                  ? 'bg-red-500 animate-pulse scale-110'
                  : 'gradient-gold hover:scale-105'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="#000" viewBox="0 0 24 24" className="w-6 h-6">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your response..."
              className="flex-1 bg-white border-yellow-500 text-yellow-600"
            />

            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900"
            >
              Send
            </Button>

            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </Button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            {messages.length === 1 && (
              <Button
                size="sm"
                onClick={() => speakText(messages[0].content)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={isSpeaking}
              >
                🔊 Hear Greeting
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                sendMessage("I want to audition");
                // Navigate after message or based on action
                setTimeout(() => {
                  navigate('/audition');
                  onClose();
                }, 2000);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              🎤 I want to audition
            </Button>
            <Button
              size="sm"
              onClick={() => {
                sendMessage("I want to register");
                // Navigate after message or based on action
                setTimeout(() => {
                  navigate('/login');
                  onClose();
                }, 2000);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              📝 Register
            </Button>
            <Button
              size="sm"
              onClick={() => sendMessage("I'm already a host")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              ⭐ I'm already a host
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VoiceRecruiter;
