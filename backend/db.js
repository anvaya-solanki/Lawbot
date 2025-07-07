// db.js - MongoDB connection setup
const mongoose = require('mongoose')
const MONGO_URI = 'mongodb://localhost:27017/IPD'

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  lastMessage: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

// Create model
const ChatSession = mongoose.model('ChatSession', chatSessionSchema)

module.exports = {
  mongoose,
  ChatSession,
}
