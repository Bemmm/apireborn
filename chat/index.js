import jwt from 'jsonwebtoken';
import _ from 'lodash';
import config from '../config/secrets';
import mongoose from 'mongoose';
import cookie from 'cookie';
import User from '../models/User';
import logger from '../lib/logger.js';

import populate from '../config/populate';

import Message from '../models/Message';
import Conversation from '../models/Conversation';

const ObjectId = mongoose.Types.ObjectId;
String.prototype.toObjectId = function() {
    return new ObjectId(this.toString());
};

const onlineUsers = {};

module.exports = (server) => {

    const io = require('socket.io').listen(server);

    io.set('origins', '*:*');

    io.on('connection', async function (socket) {
        logger.info('Web socket was connected.');

        let cookies;

        logger.info(socket.client.request.headers)



        if(socket.client.request.headers['cookie']){
            cookies = cookie.parse(socket.client.request.headers['cookie']);
        }

        let token = (cookies && cookies.token) || socket.client.request._query['x-access-token'];

        logger.info('------------------------------------------------------------------------------------------------');
        logger.info('*********************************************', socket.client.request.headers);
        logger.info('------------------------------------------------------------------------------------------------');

        if(!token) return socket.disconnect();

        const decoded= jwt.decode(token, config.sessionSecret);
        socket.uid = decoded.iss;

        const user = await User.findById(socket.uid).populate('avatar', populate.avatar).select(`${populate.user} email`).exec();
        if(!user) return socket.disconnect();

        logger.info(`:: connected [${user._id}] [${user.email}]`);

        if (!(socket.uid in onlineUsers)) {
            onlineUsers[socket.uid] = user;
            user.online = true;
            await User.findByIdAndUpdate(socket.uid, {online:true})
        }

        socket.join(socket.uid);

        socket.on('join', async (data, done) => {
            let convId = data.conversation;
            if (!convId) return done({success: false, msg: 'Conversation id can not be blank.'});

            let convers = await Conversation.findById(convId).select('activeUsers').exec();
            convers.activeUsers.push(socket.uid);
            convers.save();

            socket.join(convId);
            done(null, {success: true});
        });

        socket.on('leave', async (data, done) => {
            let convId = data.conversation;
            if (!convId) return done({success: false, msg: 'Conversation id can not be blank.'});

            let convers = await Conversation.findById(convId).select('activeUsers').exec();
            let index = convers.activeUsers.indexOf(socket.uid);
            if (index !== -1) {
                convers.activeUsers.splice(index, 1);
            }
            convers.save();
            console.log('LEAVE ROOM', socket.uid);
            socket.leave(convId);
            done(null, {success: true})
        });

        socket.on('on:message', async (data) => {

            let conv = await Conversation.findById(data.conversation).select(populate.conversation).lean().exec();
            if (!conv) return {success: false, msg: 'Conversation id can not be blank.'};

            let message = new Message({
                text: data.text,
                conversation: data.conversation,
                from: {
                    _id: user._id
                },
                files: data.files,
                viewedBy: [socket.uid]
            });

            message = await message.save();
            if (!message) return {success: false, msg: 'Message not created.'};

            conv.lastMsg = message._id;
            conv.updated = new Date().toISOString();

            // socket.to(conv.activeUsers).emit('emit:message', message);
            console.log('__________________________conv_______________________________', conv);
            io.emit('emit:message', message);
            
            let offlineUsers = _.difference(conv.users, conv.activeUsers);
            socket.to(offlineUsers).emit('notify:chat', {
                conversation: {
                    _id: conv._id,
                    name: conv.name,
                },
                message
            });

        });

        socket.on('logout', () => doLogout(socket.uid));

        socket.on('disconnect', () => {
            logger.info('SOCKET DISCONNECTED --------------------------------------')
        });

        async function doLogout (uid) {

            if (!(uid in io.sockets.adapter.rooms) && onlineUsers[uid]) {
                onlineUsers[uid].online = false;
                await User.findByIdAndUpdate(socket.uid, {online:false});
                delete onlineUsers[uid];
                console.log('disconnected - ' + uid);
            }

        }

    });


    return io
};


