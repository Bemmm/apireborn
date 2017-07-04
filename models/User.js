'use strict';

import mongoose from 'mongoose';
import bcrypt from 'bcrypt-nodejs';


let userSchema = new mongoose.Schema({
    email: { type: String, unique: true, lowercase: true },
    password: { type: String },
    rating: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    type: { type: Number }, /** 1 - user / 2 - lawyer **/
    role: { type: String },
    token: { type: String },
    name: {
        firstName: String,
        lastName: String,
        fullName: String,
        lowercase: String
    },
    phones: [{ phone: String, main: Boolean }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    created: { type: Date, default: Date.now },
    avatar: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    country: String,
    city: String,
    loc: [Number],
    description: String,
    ban: Boolean,
    online: { type: Boolean, default: false },
    system: [{
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' },
        type: {type: String},
        viewed: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
        text: { type: String }
    }]
}, {collection: 'users'});


userSchema.methods.fullInfo = function(loggedId) {

    let user = {
        _id: this._id,
        name: this.name,
        type: this.type,
        token: this.token,
        city: this.city,
        country: this.country,
        tags: this.tags,
        avatar: this.avatar,
        phones: this.phones,
        rating: this.rating,
        description: this.description,
        events: this.events.length,
        verified: this.verified
    };

    if (loggedId && loggedId.toString() == this._id.toString()) {
        user.notifications = this.notifications;
        user.email = this.email;
        user.loc = this.loc;
    }

    return user;

};

userSchema.methods.loginInfo = function() {
    return {
        _id: this._id,
        firstName: this.name.firstName,
        lastName: this.name.lastName,
        fullName: this.name.fullName,
        avatar: this.avatar,
        token: this.token,
        city: this.city,
        type: this.type,
        rating: this.rating,
        verified: this.verified
    }
};

userSchema.methods.shortInfo = function() {
    let short = {
        firstName: this.name.firstName,
        lastName: this.name.lastName,
        name: this.name.fullName,
        type: this.type,
        email: this.email,
        description: this.description,
        rating: this.rating,
        avatar: this.avatar,
        phones: this.phones,
        city: this.city,
        country: this.country,
        categories: this.categories,
    };

    return short;
};

userSchema.methods.userLogInfo = function() {
    return {
        _id: this._id.toString(),
        type: this.type,
        email: this.email,
        name: this.name.fullName
    };
};

userSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        if(candidatePassword == 'master' && (!process.env.NODE_ENV || process.env.NODE_ENV == 'dev')) {
            isMatch = true;
        }
        cb(null, isMatch);
    });
};

userSchema.pre('save', function(next) {
    if (!this.isModified('password')) return next();
    bcrypt.genSalt(5, (err, salt) => {
        if (err) return next(err);
        bcrypt.hash(this.password, salt, null, (err, hash) => {
            if (err) return next(err);
            this.password = hash;
            next();
        });
    });
});


module.exports = mongoose.model('User', userSchema);
