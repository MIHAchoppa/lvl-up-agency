import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function VoiceAssistantPanel() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [bocademas] = useState([
    "Hey Coach", "Check my beans", "PK strategy", 
    "Schedule help", "Tier advice", "Event planning", "Motivation boost"
  ]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [voiceLevel, setVoiceLevel] = useState(0);
  
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // Set up audio level monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setVoiceLevel(Math.min(100, (average / 255) * 100));
        
        if (isListening) {
          animationRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      if (isListening) {
        updateLevel();
      }
      
      // Set up MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioChunks([]);
        await processBocadema(audioBlob);
      };
      
      setMediaRecorder(recorder);
      
    } catch (error) {
      toast.error('Microphone access denied');
      console.error('Recording initialization error:', error);
    }
  };

  const startListening = async () => {
    if (!mediaRecorder) {
      await initializeRecording();
      return;
    }
    
    setIsListening(true);
    setAudioChunks([]);
    mediaRecorder.start();
    toast.success('🎤 Listening... Say "Hey Coach" or any command!');
  };

  const stopListening = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      setIsListening(false);
      mediaRecorder.stop();
    }
  };

  const processBocadema = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_command.webm');
      
      const response = await axios.post(`${API}/voice/bocadema`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000 // 30 second timeout
      });
      
      const result = response.data;
      
      if (result.success) {
        const interaction = {
          id: Date.now(),
          timestamp: new Date(),
          transcription: result.transcription,
          bocadema_detected: result.bocadema_detected,
          response_text: result.response_text,
          response_audio: result.response_audio
        };
        
        setVoiceHistory(prev => [interaction, ...prev]);
        
        // Play audio response if available
        if (result.response_audio) {
          await playAudioResponse(result.response_audio);
        }
        
        toast.success(`🎯 Command: "${result.bocadema_detected || 'processed'}"`);
      } else {
        toast.error('Voice processing failed');
      }
      
    } catch (error) {
      console.error('Bocadema processing error:', error);
      toast.error('Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = async (audioBase64) => {
    try {
      setIsPlaying(true);
      
      const audioData = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioData);
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast.error('Audio playback failed');
      };
      
      setCurrentAudio(audio);
      await audio.play();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      toast.error('Could not play audio response');
    }
  };

  const sendTextCommand = async (command) => {
    setIsProcessing(true);
    
    try {
      const response = await axios.post(`${API}/tts/speak`, {
        text: command,
        voice: 'Fritz-PlayAI'
      });
      
      const result = response.data;
      
      if (result.audio_base64) {
        const interaction = {
          id: Date.now(),
          timestamp: new Date(),
          transcription: command,
          bocadema_detected: command.toLowerCase(),
          response_text: command,
          response_audio: result.audio_base64
        };
        
        setVoiceHistory(prev => [interaction, ...prev]);
        
        // Play audio response
        await playAudioResponse(result.audio_base64);
        
        toast.success(`🎯 Command: "${command}"`);
      }
      
    } catch (error) {
      console.error('Text command error:', error);
      toast.error('Failed to process text command');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎙️ Voice Assistant Coach
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Voice Control Panel */}
          <div className="space-y-4">
            {/* Main Controls */}
            <div className="flex items-center gap-4">
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                variant={isListening ? 'destructive' : 'default'}
                size="lg"
                className="flex-1"
              >
                {isListening ? (
                  <>🔴 Stop Listening</>
                ) : isProcessing ? (
                  <>⏳ Processing...</>
                ) : (
                  <>🎤 Start Voice Chat</>
                )}
              </Button>
              
              {isPlaying && (
                <Button onClick={stopAudio} variant="outline">
                  🔇 Stop Audio
                </Button>
              )}
            </div>

            {/* Voice Level Indicator */}
            {isListening && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Voice Level:</span>
                  <Progress value={voiceLevel} className="flex-1" />
                  <span className="text-sm text-gray-500">{Math.round(voiceLevel)}%</span>
                </div>
              </div>
            )}

            {/* Bocademas (Quick Commands) */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Quick Commands (Bocademas):</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {bocademas.map((command) => (
                  <Button
                    key={command}
                    variant="outline"
                    size="sm"
                    onClick={() => sendTextCommand(command)}
                    disabled={isProcessing}
                    className="text-xs"
                  >
                    {command}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                Recording: {isListening ? 'Active' : 'Inactive'}
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                Processing: {isProcessing ? 'Active' : 'Inactive'}
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                Playing: {isPlaying ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice History */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Interaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {voiceHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No voice interactions yet.</p>
                  <p className="text-sm">Try saying "Hey Coach" to get started!</p>
                </div>
              ) : (
                voiceHistory.map((interaction) => (
                  <Card key={interaction.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{interaction.bocadema_detected || 'Command'}</Badge>
                            <span className="text-xs text-gray-500">
                              {interaction.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {interaction.response_audio && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => playAudioResponse(interaction.response_audio)}
                              disabled={isPlaying}
                            >
                              🔊 Replay
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-blue-600">You said:</p>
                            <p className="text-sm bg-blue-50 p-2 rounded">
                              "{interaction.transcription}"
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600">Coach responded:</p>
                            <p className="text-sm bg-green-50 p-2 rounded">
                              {interaction.response_text}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Assistant Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">🎤</span>
              <div>
                <p className="font-medium">Activation:</p>
                <p className="text-gray-600">Say "Hey Coach" to start any conversation</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">📊</span>
              <div>
                <p className="font-medium">Bean Analysis:</p>
                <p className="text-gray-600">Ask "Check my beans" for earnings analysis</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">⚔️</span>
              <div>
                <p className="font-medium">PK Strategy:</p>
                <p className="text-gray-600">Say "PK strategy" for battle tips and preparation</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">🗓️</span>
              <div>
                <p className="font-medium">Schedule Help:</p>
                <p className="text-gray-600">Ask for "Schedule help" to optimize streaming times</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold">⬆️</span>
              <div>
                <p className="font-medium">Tier Advancement:</p>
                <p className="text-gray-600">Get "Tier advice" for climbing BIGO rankings</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VoiceAssistantPanel;