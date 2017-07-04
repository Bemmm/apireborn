"use strict";

import express from 'express';
import path from 'path';
import mongoose from 'mongoose';

import secrets from './config/secrets';
import logger from './lib/logger.js';

const app = express();
const server = require('http').Server(app);

mongoose.connect(secrets.db);
mongoose.connection.on('error', () => {
    logger.error('MongoDB Connection Error. Make sure MongoDB is running.');
});
mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully.');
    const socket = require('./chat/index')(server);
    app.use('/api', require('./api.js')(socket));
});

app.get('/main', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
});

// app.use('/admin', require('./admin.js')());

app.set('port', secrets.port );
app.set('views', __dirname + '/public/views');
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

process.on('uncaughtException', (err) => {
    logger.error(err.message, {stack: JSON.stringify(err.stack)});
    setTimeout(() => {
        logger.error('Server was shut down safely.');
        process.exit(1);
    }, 3000);
});


server.listen(app.get('port'), '0.0.0.0', () => {
    logger.info('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;