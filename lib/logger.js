import winston from 'winston';
// var winstonGraylog = require('winston-graylog2');
require('winston-mongodb').MongoDB;

import config from '../config/secrets.js';

// let options = {
//     name: 'Graylog',
//     level: 'info',
//     silent: false,
//     handleExceptions: false,
//     prelog: function(msg) {
//         return msg.trim();
//     },
//     graylog: {
//         servers: [{host: 'dev.myco.com', port: 12201}],
//         hostname: 'dev.myco.com',
//         facility: 'myco-api-' + (process.env.NODE_ENV || 'dev'),
//         bufferSize: 1400
//     },
//     staticMeta: {env: 'staging'}
// };
// let wGraylog = new(winstonGraylog)(options);

winston.loggers.add('_logs', {
    transports: [
        // wGraylog,
        new (winston.transports.Console)({
            prettyPrint: false,
            colorize: true,
            silent: false,
            timestamp: true
        }),
        new (winston.transports.MongoDB)({
            db: config.db,
            collection: '_logs',
        })
    ]
});

var mdb_logger = winston.loggers.get('_logs');

mdb_logger.on('logging', (transport, level, msg, meta) => {

});

mdb_logger.on('error', (err) => {

});

module.exports = mdb_logger;