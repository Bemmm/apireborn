'use strict';

import mongoose from 'mongoose';

import secrets from './../config/secrets';

let orderSchema = new mongoose.Schema({
    title: { type: String },
    description: { type: String },
    views: { type: Number, default: 0 },
    performer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deadline: { type: Date },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    status: { type: String, default: 'open' }, // open, close, process
    anon: { type: Boolean, default: false },
    vote: {
        like: { type: Number, default: 0 },
        likedPersons: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
        dislike: { type: Number, default: 0 },
        dislikedPersons: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
        equals: { type: Number, default: 0 }
    },
    files: [ { type: mongoose.Schema.Types.ObjectId, ref: 'File' } ],
    invited: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
    price: { type: Number },
    readyToPay: { type: Boolean, default: false  },
    reserved: { type: Boolean, default: false },
    deleted: { type: Boolean },
    created: { type: Date, default: Date.now }
});

orderSchema.methods.preview = function (user) {
    //TODO: choose fields for preview;
    let data = this;
    //TODO: if creator add pro access;
    return data;
};

module.exports = mongoose.model('Order', orderSchema);
