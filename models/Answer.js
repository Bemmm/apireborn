import mongoose from 'mongoose';
import Comment from './Comment';

let commentSchema = Comment.base.models.Comment.schema.obj;

let answerSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    created: { type: Date, default: Date.now },
    performer: { type: Boolean, default: false },
    anon: { type: Boolean, default: false },
    price: { type: Number },
    deadline: { type: Date },
    vote: {
        like: { type: Number, default: 0 },
        likedPersons: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
        dislike: { type: Number, default: 0 },
        dislikedPersons: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
        equals: { type: Number, default: 0 }
    },
    comments: [commentSchema]
}, { collection: 'answers' });

module.exports = mongoose.model('Answer', answerSchema);
