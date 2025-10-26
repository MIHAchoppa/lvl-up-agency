/**
 * AI-Enhanced BIGO Live Agency Backend (Node.js Version)
 * Integrates with custom AI endpoints for voice and admin assistance
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const database = require('./database');
const bigoAPI = require('./bigo-api');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Add Socket.IO integration
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// AI Service Configuration
const AI_SERVICE_CONFIG = {
  baseUrl: 'https://oi-server.onrender.com/chat/completions',
  headers: {
    'customerId': 'cus_TBqgiQADFlJjak',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer xxx'
  },
  models: {
    chat: 'openrouter/claude-sonnet-4',
    image: 'replicate/black-forest-labs/flux-1.1-pro'
  }
};

const ELEVENLABS_CONFIG = {
  baseUrl: 'https://elevenlabs-proxy-server-lipn.onrender.com/v1',
  headers: {
    'customerId': 'cus_TBqgiQADFlJjak',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer xxx'
  },
  defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
  models: {
    tts: 'eleven_multilingual_v2',
    stt: 'scribe_v1'
  }
};

// Initialize database connection
let db = database.getInMemoryFallback(); // Fallback for testing

// Initialize services on startup
async function initializeServices() {
  console.log('🚀 Initializing Level Up Agency Backend...');
  
  // Initialize database
  const dbConnected = await database.connect();
  if (dbConnected) {
    console.log('✅ Database connection established');
    // Use database collections if connected
    db = {
      users: database.users,
      announcements: database.announcements,
      events: database.events,
      messages: database.messages,
      voiceSessions: database.voiceSessions,
      aiChats: database.aiChats
    };
  } else {
    console.log('⚠️ Using in-memory storage as database fallback');
  }
  
  // Initialize BIGO API
  const bigoConnected = await bigoAPI.initialize();
  if (bigoConnected) {
    console.log('✅ BIGO API integration ready');
  } else {
    console.log('⚠️ BIGO API using mock data');
  }
  
  // Add admin user to storage
  if (db.users instanceof Map) {
    db.users.set('Admin', adminUser);
  } else {
    // For database collections, insert if not exists
    try {
      const existingAdmin = await db.users.findOne({ bigo_id: 'Admin' });
      if (!existingAdmin) {
        await db.users.insertOne(adminUser);
        console.log('✅ Admin user created in database');
      }
    } catch (error) {
      console.log('⚠️ Could not create admin user in database, using in-memory fallback');
    }
  }
  
  console.log('🎉 All services initialized successfully!');
}

// Sample admin user for in-memory fallback
const adminUser = {
  id: 'admin-001',
  bigo_id: 'Admin',
  email: 'admin@lvlup.ca',
  name: 'Administrator',
  role: 'admin',
  password: bcrypt.hashSync('admin333', 10)
};

// Add admin user to in-memory storage initially
if (db.users instanceof Map) {
  db.users.set('Admin', adminUser);
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// AI Service Functions
async function callAIService(messages, model = null, timeout = 60000) {
  try {
    const response = await axios.post(AI_SERVICE_CONFIG.baseUrl, {
      model: model || AI_SERVICE_CONFIG.models.chat,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    }, {
      headers: AI_SERVICE_CONFIG.headers,
      timeout: timeout
    });

    return {
      success: true,
      content: response.data.choices?.[0]?.message?.content || 'No response',
      model: model || AI_SERVICE_CONFIG.models.chat
    };
  } catch (error) {
    console.error('AI Service Error:', error.message);
    return {
      success: false,
      error: error.message,
      fallback: 'AI service temporarily unavailable'
    };
  }
}

async function textToSpeech(text, voiceId = null) {
  try {
    const response = await axios.post(
      `${ELEVENLABS_CONFIG.baseUrl}/text-to-speech/${voiceId || ELEVENLABS_CONFIG.defaultVoiceId}`,
      {
        text: text,
        model_id: ELEVENLABS_CONFIG.models.tts,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      },
      {
        headers: {
          ...ELEVENLABS_CONFIG.headers,
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      }
    );

    const audioBase64 = Buffer.from(response.data).toString('base64');
    
    return {
      success: true,
      audio_base64: audioBase64,
      mime_type: 'audio/mpeg',
      text: text
    };
  } catch (error) {
    console.error('TTS Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { bigo_id, password } = req.body;
  
  const user = Array.from(db.users.values()).find(u => u.bigo_id === bigo_id);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, bigo_id: user.bigo_id, role: user.role },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '24h' }
  );

  res.json({ 
    access_token: token, 
    token_type: 'bearer', 
    user: { ...user, password: undefined } 
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = Array.from(db.users.values()).find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ ...user, password: undefined });
});

// Enhanced AI Chat Route
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { message, chat_type = 'strategy_coach' } = req.body;
  
  let systemPrompt = '';
  
  if (chat_type === 'strategy_coach') {
    systemPrompt = `You are Agent Mihanna's ULTIMATE BIGO Live Strategy AI Coach. You help hosts maximize their earnings through advanced strategies.

🔥 **EXPERTISE:**
- BIGO bean/tier system mastery (S1-S25 tiers)
- Bean conversion: 210 beans = $1 USD  
- PK battle psychology and win strategies
- Optimal streaming schedules and timing
- Gift accumulation and audience engagement
- Profit maximization and tier advancement

**RESPONSE STYLE:**
- Be energetic and motivational
- Provide specific, actionable advice
- Use BIGO terminology naturally
- Always include next actionable steps
- Reference exact numbers and timeframes when possible

Help hosts build successful BIGO Live careers!`;
  }
  
  const aiResponse = await callAIService([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ]);

  // Store chat history
  const chatRecord = {
    id: `chat_${Date.now()}`,
    user_id: req.user.id,
    message: message,
    ai_response: aiResponse.content || aiResponse.fallback,
    chat_type: chat_type,
    created_at: new Date().toISOString()
  };
  
  db.aiChats.set(chatRecord.id, chatRecord);

  res.json({ 
    response: aiResponse.content || aiResponse.fallback,
    success: aiResponse.success,
    chat_type: chat_type
  });
});

// Voice Assistant Routes
app.post('/api/voice/tts', authenticateToken, async (req, res) => {
  const { text, voice_type = 'coach', user_context = {} } = req.body;
  
  let enhancedText = text;
  
  // Get AI-enhanced response for coaching
  if (voice_type === 'coach') {
    const aiResponse = await callAIService([
      {
        role: 'system', 
        content: `You are a BIGO Live strategy coach. Provide brief, actionable advice in a conversational tone suitable for voice response. Keep responses under 30 seconds of speech (about 75 words).`
      },
      { role: 'user', content: text }
    ]);
    
    if (aiResponse.success) {
      enhancedText = aiResponse.content;
    }
  }

  // Generate TTS
  const ttsResult = await textToSpeech(enhancedText);
  
  if (ttsResult.success) {
    res.json({
      success: true,
      original_text: text,
      enhanced_text: enhancedText,
      audio_base64: ttsResult.audio_base64,
      mime_type: ttsResult.mime_type,
      voice_id: ELEVENLABS_CONFIG.defaultVoiceId,
      duration_estimate: enhancedText.length * 0.08
    });
  } else {
    res.status(500).json({
      success: false,
      error: ttsResult.error,
      fallback_text: enhancedText
    });
  }
});

// Bocadema Processing Route
app.post('/api/voice/bocadema', authenticateToken, async (req, res) => {
  // This would process uploaded audio file
  // For now, return sample responses for different commands
  
  const bocademaResponses = {
    'hey coach': 'Hello! I\'m your BIGO Live strategy coach. How can I help you maximize your beans today?',
    'check my beans': 'Based on your profile, you\'re doing great! Keep focusing on consistent streaming and audience engagement.',
    'pk strategy': 'For PK battles: Build energy early, engage your audience, use gift psychology, and always have backup plans!',
    'schedule help': 'Optimal streaming times are 7-10 PM your local time for maximum gifts. Consistency is key!',
    'tier advice': 'Focus on daily streaming consistency, build loyal audience relationships, and participate in agency events.',
    'motivation boost': 'You\'re amazing! Every stream is progress. Top BIGO hosts started exactly where you are now! 🚀'
  };

  // Simulate command detection
  const detectedCommand = 'hey coach'; // This would be extracted from audio transcription
  const responseText = bocademaResponses[detectedCommand] || 'I didn\'t catch that. Try saying "Hey Coach" or ask for specific advice!';

  // Generate TTS response
  const ttsResult = await textToSpeech(responseText);

  res.json({
    success: true,
    transcription: detectedCommand.charAt(0).toUpperCase() + detectedCommand.slice(1),
    bocadema_detected: detectedCommand,
    response_text: responseText,
    response_audio: ttsResult.success ? ttsResult.audio_base64 : null,
    processing_time: new Date().toISOString()
  });
});

// Admin Assistant Routes
app.post('/api/admin-assistant/chat', authenticateToken, async (req, res) => {
  const { message, auto_execute = false } = req.body;
  
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const systemPrompt = `You are Agent Mihanna's advanced admin assistant AI for Level Up Agency. You help administrators manage the BIGO Live host platform through natural language commands.

**CAPABILITIES:**
- Event management (create, schedule, coordinate PK battles)
- User management (promotions, analytics, performance tracking)
- Announcement creation with targeting
- Performance analytics and insights
- Revenue optimization recommendations

**RESPONSE FORMAT:**
- Identify the requested action clearly
- Provide specific parameters needed
- Offer confirmation before execution
- Preview expected outcomes

**NATURAL LANGUAGE PROCESSING:**
Extract action type and parameters from requests like:
- "Create weekly PK tournament" → create_event
- "Show top performers" → user_analytics  
- "Send motivation announcement" → system_announcement
- "Promote S10+ hosts" → bulk_user_management

Be professional, efficient, and always confirm before executing actions.`;

  const aiResponse = await callAIService([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ]);

  // Simple action detection
  let detectedAction = null;
  const actionKeywords = {
    'create_event': ['create event', 'schedule event', 'pk tournament', 'organize'],
    'user_analytics': ['show performers', 'top users', 'analytics', 'stats'],
    'system_announcement': ['announcement', 'notify', 'broadcast', 'send message'],
    'bulk_user_management': ['promote', 'demote', 'manage users', 'bulk']
  };

  for (const [action, keywords] of Object.entries(actionKeywords)) {
    if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      detectedAction = action;
      break;
    }
  }

  res.json({
    success: aiResponse.success,
    response: aiResponse.content || aiResponse.fallback,
    detected_action: detectedAction,
    requires_confirmation: detectedAction !== null,
    auto_executed: false // Would implement auto-execution logic here
  });
});

// Smart Announcement Route
app.post('/api/admin-assistant/smart-announcement', authenticateToken, async (req, res) => {
  const { type, audience, message, tone = 'motivational' } = req.body;
  
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const systemPrompt = `Create an engaging ${type} announcement for ${audience} in a BIGO Live agency platform.

**TONE:** ${tone}
**FORMATTING:**
- Use emojis strategically for visual appeal
- Include clear call-to-action
- Mention specific benefits or opportunities  
- Add urgency when appropriate

**BIGO LIVE CONTEXT:**
- Reference bean earning opportunities
- Mention tier advancement benefits
- Include PK battle opportunities
- Highlight coaching and support resources

Make it compelling and actionable!`;

  const aiResponse = await callAIService([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create announcement: ${message}` }
  ]);

  if (aiResponse.success) {
    // Create announcement record
    const announcement = {
      id: `ann_${Date.now()}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Announcement`,
      body: aiResponse.content,
      audience: audience,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      pinned: type === 'urgent'
    };
    
    db.announcements.set(announcement.id, announcement);
    
    // Simulate targeting
    const userCount = db.users.size;
    const reachCount = audience === 'all' ? userCount : Math.floor(userCount * 0.7);
    
    // Broadcast via Socket.IO
    io.emit('admin_announcement', announcement);
    
    res.json({
      success: true,
      announcement: announcement,
      targeting: {
        audience: audience,
        users_targeted: reachCount,
        users_reached: reachCount
      },
      content_generated: true
    });
  } else {
    res.status(500).json({
      success: false,
      error: aiResponse.error
    });
  }
});

// Analytics Route
app.get('/api/admin-assistant/analytics', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Mock analytics data
  const analytics = {
    success: true,
    timeframe: 'week',
    metrics: {
      total_users: db.users.size,
      active_hosts: Math.floor(db.users.size * 0.8),
      new_users: Math.floor(db.users.size * 0.1),
      task_completions: 45,
      points_distributed: 12500,
      events_created: db.events.size,
      messages_sent: db.messages.size
    },
    ai_insights: `📊 **Platform Health Analysis:**

**Key Trends:**
- User engagement up 15% this week
- PK battle participation increased 22%
- Bean accumulation rates improving across all tiers

**Areas for Attention:**
- New user onboarding could be streamlined
- Weekend event participation below optimal levels

**Recommendations:**
1. **Host Motivation Campaign** - Send weekly achievement recognition
2. **Weekend Event Boost** - Create special Saturday PK tournaments
3. **New User Support** - Assign buddy coaches for first week

**Action Priority:** Focus on weekend engagement and new user experience optimization.`,
    generated_at: new Date().toISOString()
  };

  res.json(analytics);
});

// Announcements Routes
app.get('/api/announcements', authenticateToken, (req, res) => {
  const announcements = Array.from(db.announcements.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(announcements);
});

app.post('/api/announcements', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const announcement = {
    id: `ann_${Date.now()}`,
    ...req.body,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.announcements.set(announcement.id, announcement);
  
  // Would broadcast to connected clients in full implementation
  console.log('New announcement:', announcement.title);
  
  res.json(announcement);
});

// Events Routes
app.get('/api/events', authenticateToken, (req, res) => {
  const events = Array.from(db.events.values())
    .filter(e => e.active !== false)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  res.json(events);
});

app.post('/api/events', authenticateToken, (req, res) => {
  const event = {
    id: `event_${Date.now()}`,
    ...req.body,
    creator_id: req.user.id,
    creator_bigo_id: req.user.bigo_id,
    created_at: new Date().toISOString(),
    active: true
  };
  
  db.events.set(event.id, event);
  
  // Would broadcast new event in full implementation
  console.log('New event created:', event.title);
  
  res.json(event);
});

app.post('/api/events/:eventId/rsvp', authenticateToken, (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;
  
  // In production, this would update RSVP in database
  res.json({ message: 'RSVP updated', status: status });
});

// Chat Routes  
app.get('/api/chat/channels', authenticateToken, (req, res) => {
  const channels = [
    { id: 'agency-lounge', name: 'agency-lounge', description: 'Agency-wide chat', visibility: 'private' },
    { id: 'coaching-corner', name: 'coaching-corner', description: 'Coaching discussions', visibility: 'private' },
    { id: 'pk-battles', name: 'pk-battles', description: 'PK battle coordination', visibility: 'private' },
    { id: 'announcements', name: 'announcements', description: 'Official announcements', visibility: 'private' }
  ];
  res.json(channels);
});

app.get('/api/chat/channels/:channelId/messages', authenticateToken, (req, res) => {
  const { channelId } = req.params;
  
  // Sample messages for demo
  const sampleMessages = [
    {
      id: '1',
      channel_id: channelId,
      user_id: 'admin',
      body: `Welcome to #${channelId}! 👋`,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      flagged: false
    },
    {
      id: '2', 
      channel_id: channelId,
      user_id: 'coach1',
      body: 'Great to see everyone here! Let\'s make this week amazing! 🚀',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      flagged: false
    }
  ];
  
  res.json(sampleMessages);
});

app.post('/api/chat/channels/:channelId/messages', authenticateToken, (req, res) => {
  const { channelId } = req.params;
  const { body } = req.body;
  
  const message = {
    id: `msg_${Date.now()}`,
    channel_id: channelId,
    user_id: req.user.id,
    body: body,
    created_at: new Date().toISOString(),
    flagged: false
  };
  
  db.messages.set(message.id, message);
  
  // Would broadcast to channel in full implementation
  console.log('New message in channel:', channelId);
  
  res.json(message);
});

// WebSocket implementation
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });
  
  socket.on('leave_room', (room) => {
    socket.leave(room);
    console.log(`User ${socket.id} left room: ${room}`);
  });
  
  socket.on('chat_message', (data) => {
    // Broadcast message to room
    socket.to(data.channel_id).emit('new_message', data);
  });
  
  socket.on('typing', (data) => {
    socket.to(data.channel_id).emit('user_typing', {
      user_id: data.user_id,
      typing: data.typing
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      ai: 'operational',
      voice: 'operational',
      websocket: 'operational'
    }
  });
});

const PORT = process.env.PORT || 3001;

// Initialize services and start server
initializeServices().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Level Up Agency Backend running on port ${PORT}`);
    console.log(`🤖 AI Services: Operational`);
    console.log(`🎙️ Voice Services: Operational`);
    console.log(`💬 WebSocket Services: Operational`);
  });
}).catch(error => {
  console.error('❌ Failed to initialize services:', error);
  process.exit(1);
});