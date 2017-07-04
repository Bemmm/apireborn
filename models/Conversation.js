import mongoose from 'mongoose';

const conversationSchema = mongoose.Schema({
  hasMessages: { type: Boolean, default: false },
  started: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now,},
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  lastMsg: { type: mongoose.Schema.Types.ObjectId, ref: 'Message'},
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'File'},
  admins: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User'} ],
  muted: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User'} ],
  activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  name: { type: String },
  avatar: { type: String },
  isGroup:{ type: Boolean, default: false },
  settings:{ type: mongoose.Schema.Types.Mixed, default:{}}
},{ collection: 'conversations' });

module.exports = mongoose.model('Conversation', conversationSchema);

