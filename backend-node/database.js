/**
 * Database connection layer for MongoDB
 */

const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
      const dbName = process.env.DB_NAME || 'lvl_up_agency';
      
      console.log(`Attempting to connect to MongoDB at: ${mongoUrl}`);
      
      this.client = new MongoClient(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10
      });

      await this.client.connect();
      this.db = this.client.db(dbName);
      this.isConnected = true;
      
      console.log(`✅ Connected to MongoDB database: ${dbName}`);
      
      // Initialize collections if needed
      await this.initializeCollections();
      
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async initializeCollections() {
    try {
      const collections = ['users', 'announcements', 'events', 'messages', 'aiChats', 'voiceSessions'];
      
      for (const collectionName of collections) {
        const exists = await this.db.listCollections({ name: collectionName }).hasNext();
        if (!exists) {
          await this.db.createCollection(collectionName);
          console.log(`Created collection: ${collectionName}`);
        }
      }

      // Create indexes for better performance
      await this.createIndexes();
      
    } catch (error) {
      console.error('Error initializing collections:', error.message);
    }
  }

  async createIndexes() {
    try {
      // Users indexes
      await this.db.collection('users').createIndex({ bigo_id: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
      
      // Messages indexes
      await this.db.collection('messages').createIndex({ channel_id: 1 });
      await this.db.collection('messages').createIndex({ created_at: -1 });
      
      // Events indexes
      await this.db.collection('events').createIndex({ start_time: 1 });
      await this.db.collection('events').createIndex({ active: 1 });
      
      // AI Chats indexes
      await this.db.collection('aiChats').createIndex({ user_id: 1 });
      await this.db.collection('aiChats').createIndex({ created_at: -1 });
      
      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error.message);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  // Collection getters
  get users() {
    return this.db?.collection('users');
  }

  get announcements() {
    return this.db?.collection('announcements');
  }

  get events() {
    return this.db?.collection('events');
  }

  get messages() {
    return this.db?.collection('messages');
  }

  get aiChats() {
    return this.db?.collection('aiChats');
  }

  get voiceSessions() {
    return this.db?.collection('voiceSessions');
  }

  // Utility methods
  isHealthy() {
    return this.isConnected && this.client && this.db;
  }

  async ping() {
    try {
      if (!this.isConnected) return false;
      await this.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database ping failed:', error.message);
      return false;
    }
  }

  // Fallback to in-memory storage if database is not available
  getInMemoryFallback() {
    return {
      users: new Map(),
      announcements: new Map(), 
      events: new Map(),
      messages: new Map(),
      aiChats: new Map(),
      voiceSessions: new Map()
    };
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
