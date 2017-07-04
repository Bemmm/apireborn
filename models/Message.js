import mongoose from 'mongoose';


const messageSchema = mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  text: { type: String },
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File'}],
  created: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  viewed: { type: Boolean, default: false },
  viewedBy:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  deleted: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User'} ]
},{ collection: 'messages' });

module.exports = mongoose.model('Message', messageSchema);
