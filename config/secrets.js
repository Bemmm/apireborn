let env = process.env.NODE_ENV || 'dev';
let path = require('path');

const mb = 1024 * 1024;

let config = {
    production: {
        port: process.env.PORT,
        db: process.env.MONGOLAB_URI || process.env.MONGODB || 'mongodb://13.95.149.21:27017/lexterr',
        sessionSecret: process.env.SESSION_SECRET || 'Dshtrih2',
        tokenSecret: process.env.TOKEN_SECRET || 'Dshtrih2',
        files: { dir: path.join(__dirname, '../public/uploads/'), size: mb * 3, count: 8 },
        tokenField: 'x-access-token',
        tempDir: path.join(__dirname, '../public/uploads/temp'),
        avatarsDir: path.join(__dirname, '../public/uploads/avatars'),
        filesDir: path.join(__dirname, '../public/uploads/files'),
    },
    dev: {
        port: 4000,
        siteUrl: 'localhost:4000',
        db: process.env.MONGOLAB_URI || process.env.MONGODB || 'mongodb://lexter:qwerty@ds147052.mlab.com:47052/lexter_dev',
        sessionSecret: process.env.SESSION_SECRET || 'Dshtrih2',
        tokenSecret: process.env.TOKEN_SECRET || 'Dshtrih2',
        files: { dir: path.join(__dirname, '../public/uploads/'), size: mb * 3, count: 8 },
        tokenField: 'x-access-token',
        tempDir: path.join(__dirname, '../public/uploads/temp'),
        avatarsDir: path.join(__dirname, '../public/uploads/avatars'),
        filesDir: path.join(__dirname, '../public/uploads/files'),
    }
};

module.exports = config[env];