import User from '../models/User';
import Order from '../models/Order';
import config from '../config/secrets';
import {send} from '../lib/mailer';

import jwt from 'jsonwebtoken';
import ssr from 'nunjucks';
ssr.configure('./public', {
    autoescape: true
});

module.exports.home = (req, res, next) => {
    res.json({api: true, v: '0.0.1'});
};

module.exports.checkEmail = async (req,res,next) => {

    req.assert('email', 'Email cannot be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    let exist = await User.findOne({email: body.email}).exec();
    if (exist) return res.json({success: true, email: exist.email, avatar: exist.avatar || null, name: exist.name.fullName });
    res.json({success: false});

};

module.exports.signUp = async (req, res, next) => {

    req.assert('email', 'Email cannot be blank').notEmpty();
    req.assert('firstName', 'First name cannot be blank').notEmpty();
    req.assert('lastName', 'Last name cannot be blank').notEmpty();
    req.assert('type', 'Type can not be blank').notEmpty();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
    let errors = req.validationErrors();
    if (errors) return next(errors);

    if (req.body.type != 1 && req.body.type != 2) return res.status(500).json({success: false, msg: 'Unspecified user type.'});
    if (req.body.type == 2) {
        if (!req.body.categories || !req.body.categories.length)
            return next([{param: "categories", msg: "Categories cannot be blank"}]);
    }

    let body = req.body;

    let exist = await User.findOne({email: body.email}).exec();
    if (exist) return res.json({success: false, msg: 'User already exist.'});

    let firstName = body.firstName.trim();
    let lastName = body.lastName.trim();

    let newUser = new User({
        email: body.email,
        password: body.password,
        type: body.type,
        avatar: body.avatar,
        categories: req.body.categories,
        'name.firstName': firstName,
        'name.lastName': lastName,
        'name.fullName': firstName + ' ' + lastName,
        'name.lowercase': (firstName + ' ' + lastName).toLowerCase()
    });

    newUser.save(async (err, user) => {
        if (err) return next(err);

        let token = jwt.sign({ iss: user._id }, config.tokenSecret);
        let confirm_link = 'http://' + config.siteUrl + '/api/confirmEmail/' + token;
        let emailBody = ssr.render('register.html', { confirm_link: confirm_link });
        send(user.email, 'Registration', emailBody);

        user.markModified('token');
        user.save();
        res.json(user.loginInfo());
    })

};

module.exports.signIn = async (req, res, next) => {

    req.assert('email', 'Email can not be blank').notEmpty();
    req.assert('password', 'Password can not be blank.').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    let exist = await User.findOne({email: body.email}).select('_id password name verified type rating').exec();
    if (!exist) return next();

    exist.comparePassword(body.password, (err, isMatch) => {
        if (err) return next(err);
        if (!isMatch) return next(new Error('Incorrect credentials.'));

        // let emailBody = ssr.render('register.html');
        // send(exist.email, 'Contact Request', emailBody);
        exist.token = jwt.sign({ iss: exist._id }, config.tokenSecret);

        res.json(exist.loginInfo());
    })

};

module.exports.lawyersCount = (req, res, next) => {

    User
        .count({type: 2})
        .exec((err, lawyersCount) => {
            if (err) return next(err);
            res.json({count: lawyersCount})
        });

};

module.exports.ordersCount = (req, res, next) => {

    Order
        .count()
        .exec((err, ordersCount) => {
            if (err) return next(err);
            res.json({count: ordersCount})
        });

};

module.exports.verifyAccount = (req, res, next) => {

    let decoded = jwt.decode(req.params.token, config.sessionSecret);
    console.log(decoded)
    if (!decoded) return res.status(500).json({success:false, error: 'bad-token.'});

    let iss = decoded.iss.id ? decoded.iss.id : decoded.iss;

    User.findOne({ _id: iss }, function(err, cuser) {
        if(!cuser) return res.status(403).json({ success:false, 'error': 'bad-token'});

        cuser.verified = true;
        cuser.save();
        res.json({success:true});
    })

};












