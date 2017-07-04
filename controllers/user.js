'use strict';

import jwt from 'jsonwebtoken';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

import config from '../config/secrets';

import User from '../models/User';
import File from '../models/File';
import {removeTemp, getNotify} from '../lib/actions'
import populate from '../config/populate';
import ssr from 'nunjucks';
ssr.configure('../public', {
    autoescape: true
});
import {send} from '../lib/mailer';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!req.user) return cb(new Error('No permission.'));
        let fullPath = path.join(config.files.dir, 'temp');
        if (!fs.existsSync(fullPath)){
            fs.mkdirSync(fullPath);
        }
        file.fullPath = fullPath;
        cb(null, fullPath);
    },

    filename: async (req, file, cb) => {
        try {

            let ext = path.extname(file.originalname);
            let basename =  path.basename(file.originalname, ext);
            let fileName = basename + '-' + Date.now() + ext;

            let newFile = new File();
            newFile.container = req.query.container;
            newFile.original = file.originalname;
            newFile.name = fileName;
            newFile.ext = ext;
            newFile.path = file.path;   //TODO: change from temp dir
            newFile.owner = req.user._id;
            newFile.temp = true;
            //TODO: order id

            if (req.body.files) {
                req.body['files'].push(newFile._id);
            } else {
                req.body.files = [newFile._id];
            }

            let savedFile = await newFile.save();
            if (!savedFile) return cb(new Error('File saving error.'));

            return cb(null, fileName, {test: 1});
        } catch (e) {
            return cb(e)
        }
    }
});

const uploadMulti = multer({storage: storage, limits: {fileSize: config.files.size}}).array('files',  config.files.count);

exports.multiUpload = (req, res, next) => {
    let container = req.query.container;
    if (!container && container != 'avatar' && container != 'files') {
        return res.status(403).json({success: false, msg: 'Destination container field is empty.'});
    }
    let files = [];
    console.log(req.files);
    uploadMulti(req, res, (err) => {
        if (err) return next(err);
        res.json({success: true, msg: 'Uploaded successfully.', data: req.body})
    })
};

module.exports.removeTempFile = async (req, res, next) => {

    let id = req.body.fileId;

    let file = await File.findById(id).exec();

    if (!file) return next();

    fs.unlinkSync(path.join(config.tempDir, file.name));
    file.remove();

    res.json({success: true, msg: `${file.name} was removed from temp directory`});

};

exports.getProfile = async (req, res, next) => {

    req.assert('id', 'Id can not be blank.').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    User
        .findById(req.params.id)
        .populate('avatar', populate.avatar)
        .populate('categories', populate.category)
        .exec((err, fUser) => {
            if (err) return next(err);
            if (!fUser) return next();

            res.json(fUser.shortInfo())
        })

};

exports.getUsers = async (req, res, next) => {

    const users = await User.find().exec();
    if(!users) return next();
    res.json(users);

};

exports.getUserById = async (req, res, next) => {

    if (!req.params.id) return res.status(500).json({success: false, msg: 'Id can not be blank.'});

    let user = await User.findById(req.params.id).exec();
    if (!user) return next(new Error('Not Found.'));

    res.json(user.shortInfo());

};

module.exports.getLawyers = (req, res, next) => {

    let sortBy = req.query.sortBy;
    let sort = {};

    if (sortBy && sortBy == 'name') {
        sort = 'name.lowercase 1'
    }

    if (sortBy && sortBy == 'rating') {
        sort['rating'] = -1
    }

    User
        .find({type: 2})
        .select(populate.user)
        .populate('avatar', populate.avatar)
        .lean()
        .sort(sort)
        .exec((err, lawyers) => {
            if (err) return next(err);
            res.json(lawyers)
        })

};

module.exports.getLawyersByCategories = (req, res, next) => {

    req.assert('categories', 'Categories can not be blank.').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    User
        .find({type: 2, categories: {$in: req.body.categories}})
        .populate('avatar', populate.avatar)
        .select(populate.user)
        .exec((err, lawyers) => {
            if (err) return next(err);
            res.json(lawyers);
        })

};

module.exports.setAvatar = async (req, res, next) => {

    req.assert('avatarId', 'Avatar id can not be blank.').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    removeTemp([req.body.avatarId], (err, data) => {
        if (err) return next(err);
        console.log('FILE ID', data.file)
        req.user.avatar = data.file;
        req.user.save();

        res.json({success: true});
    });


};

module.exports.updateProfile = async (req, res, next) => {

    let body = req.body;
    let user = req.user;

    if (body.firstName) user.name.firstName = body.firstName.trim();
    if (body.lastName) user.name.lastName = body.lastName.trim();

    if (body.firstName || body.lastName) {
        user.name.fullName = user.name.firstName + ' ' + user.name.lastName;
        user.lowercase = user.name.fullName.toLowerCase();
    }

    if (body.phones) user.phones = body.phones;
    if (body.categories) user.categories = body.categories;
    if (body.country) user.country = body.country;
    if (body.city) user.city = body.city;
    if (body.description) user.description = body.description;

    if (body.password && body.cPassword) {
        let pass = body.password.toString().trim();
        let cPass = body.cPassword.toString().trim();
        let equals = pass == cPass;
        if (equals) {
            user.password = pass;
            user.token = jwt.sign({ iss: user._id }, config.tokenSecret);
        }
    }

    user.save((err, sUser) => {
        if (err) return next(err);
        res.json(sUser.loginInfo());
    })

};

module.exports.updatePassword = (req, res, next) => {

    req.assert('oldPassword', 'Old password can not be blank').notEmpty();
    req.assert('newPassword', 'New password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.newPassword);
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    req.user.comparePassword(body.oldPassword, (err, isMatch) => {
        if (err) return next(err);
        if (!isMatch) return next(new Error('Incorrect credentials.'));

        req.user.password = body.newPassword;
        req.user.save();
        // let emailBody = ssr.render('change_pass.html');
        // send(req.user.email, 'Change password', emailBody);
        res.json({success: true});
    })

};

module.exports.getUserNotify = async (req, res, next) => {

    await getNotify(req.user._id, (err, data) => {
        if (err) return next(err);
        res.json(data)
    });

};

module.exports.removeNotify = async (req, res, next) => {

    User.findByIdAndUpdate(req.user._id, {
        '$pull': {
            'system':{ '_id': req.body.id }
        }
    }, (err) => {
        if (err) return next(err);
        res.json({success: true})
    });

};













