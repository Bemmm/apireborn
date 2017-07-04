const requestIp = require('request-ip');
const jwt = require('jsonwebtoken');

const logger = require('./logger.js');
const config = require('../config/secrets');

import User from '../models/User'

module.exports.changeJsonResponse = (body, req, res) => {
    if (res.locals.disableLogs && res.locals.disableLogs === true) return body;
    try {
        if (req.dbLogs) {
            let message = req.dbLogs.message || req.dbLogs.url || '';
            delete req.dbLogs.message;
            if (res.locals.logBody && res.locals.logBody === true) {
                req.dbLogs.response = JSON.parse(JSON.stringify(body));
            }
            logger[req.dbLogs.status || 'info'](message, req.dbLogs);
        }
    } catch (e){
        console.error('Logger exception', e);
    }
    return body;
};

module.exports.accessMiddleware = (req, res, next) => {
    let clientIp = requestIp.getClientIp(req);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    req.dbLogs = {
        message: null,
        body: req.body,
        status: null,
        params: req.params,
        query: req.query,
        method: req.method,
        url: req.url,
        ip: clientIp,
        headers: req.headers,
        response: {}
    };
    next();
};

module.exports.checkAdmin = (req, res, next) => {
    let role = req.user && req.user.role ? req.user.role : null;
    if (role !=  'admin') return res.status(401).json({success: false, msg: 'Access denied.'});
};

module.exports.checkToken = async (req, res, next) => {
    req.user = null;
    res.locals.isApi = true;
    let token = req.headers[config.tokenField] || req.query.token;

    if (!token) return next();

    let decoded = jwt.decode(token, config.sessionSecret);

    let err = {success: false, msg: 'Incorrect token credentials.'};
    if (!decoded) return res.status(401).json(err);

    let user = await User.findById(decoded.iss).select('-system').exec();
    if (!user) return res.status(401).json(err);

    req.user = user;
    req.dbLogs['user'] = user.userLogInfo();
    req.dbLogs['token'] = token;
    next();
};

module.exports.userIsLogged = (req, res, next) => {

    if (!req.user) return res.status(403).json({ success: false, message: 'No token provided or user not found.' });
    next();

};

module.exports.notFoundError = (req, res, next) => {
    console.log('>>>>>>>>>>>>>>>> 404 <<<<<<<<<<<<<<<<<');
    res.status(404);
    logger.error('Not found', req.dbLogs);
    return res.json({ error: 'Not found' });
};

module.exports.serverError = (err, req, res, next) => {
    console.log('>>>>>>>>>>>>>>>> 500 <<<<<<<<<<<<<<<<<');
    res.status(err.status || 500);
    let message = err && err.message ? err.message : 500;
    // let error = err ? JSON.stringify(err) : null;
    req.dbLogs['stack'] ? req.dbLogs['stack'] = JSON.stringify(err) : null;
    logger.error(message, req.dbLogs);
    // && err.err ? err.err : error
    return res.json({err: err , message: message });
};