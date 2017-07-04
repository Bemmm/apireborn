import mongoose from 'mongoose';

let comment = {
    text: { type: String },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    created: { type: Date, default: Date.now },
    answerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer'
    }
};

let commentSchema = new mongoose.Schema(comment, { collection: 'comments' });

module.exports = mongoose.model('Comment', commentSchema);
