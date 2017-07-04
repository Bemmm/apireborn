import Order from '../models/Order';
import File from '../models/File';
import Answer from '../models/Answer';
import Comment from '../models/Comment';

import config from '../config/secrets';
import {checkAccess, vote} from '../lib/actions';
import populate from '../config/populate';
import socket from '../lib/notify';

import async from 'async';


module.exports.insertAnswer = async (req, res, next) => {

    req.assert('text', 'text can not be blank').notEmpty();
    req.assert('orderId', 'set order id').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    let oExists = await Order
        .findById(body.orderId)
        .select('description title creator categories')
        .populate('creator', populate.user)
        .lean().exec();

    if (!oExists) return next();

    let newAnswer = new Answer({
        text: body.text,
        anon: body.anon || false,
        price: body.price || null,
        deadline: body.deadline || null,
        creator: req.user._id,
        orderId: body.orderId
    });

    newAnswer.save((err, answer) => {
        if (err) return next(err);

        socket.notify(req.app.get('io'), {
            type: 'answer',
            order: oExists,
            answer: answer
        });

        res.json({success: true, data: answer})
    })

};

module.exports.updateAnswer = (req, res, next) => {

    req.assert('answerId', 'answer id can not be blank').notEmpty();
    req.assert('text', 'text can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    Answer
        .update({_id: body.answerId}, {$set: {text: body.text}})
        .exec((err, upd) => {
            if (err) return next(err);
            if (upd.n == 0) return next();
            let resp = {success: true};
            if (upd.nModified < 1 || !upd.ok) resp.success = false;
            res.json(resp)
        });

};

module.exports.orderAnswers = async (req, res, next) => {

    req.assert('id', 'order id can not be blank.').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    async.waterfall([
        (done) => {
            Order.findById(req.params.id).exec((err, order) => {
                if (err) return done(err);
                if (!order) return done(new Error('Order not found.'));
                let access = checkAccess(order, req.user ? req.user._id : null);

                if (access && access.success && access.success == false) return done(new Error('Access denied.'));
                done(null, order);
            });
        },
        (order, done) => {

            Answer.aggregate([
                {
                    $match: {orderId: order._id}
                },
                {
                    $lookup: {
                        from: "comments",
                        localField: "_id",
                        foreignField: "answerId",
                        as: "comments"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "creator",
                        foreignField: "_id",
                        as: "creator"
                    }
                },
                {
                    $unwind: '$creator'
                },
                {
                    $project: { creator: {_id: 1, name: 1, avatar: 1, online: 1, rating: 1, type: 1}, comments: 1, vote: 1, performer: 1, created: 1, orderId: 1, text: 1}
                }
            ], (err, answers) => {
                if (err) return done(err);
                Answer.populate(answers, {path: 'comments.creator', select: populate.user}, (err, populated) => {
                    if (err) return next(err);

                    File.populate(populated, { path : 'creator.avatar', select: populate.avatar}, (err, populated) => {
                        if (err) return next(err);
                        done(null, populated)
                    });

                });
            });
        }
    ], (err, result) => {
        if (err) return next(err);
        res.json(result)
    });

};

module.exports.insertComment = async (req, res, next) => {

    req.assert('text', 'text can not be blank').notEmpty();
    req.assert('answerId', 'answer id can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    let oExists = await Answer.findById(body.answerId).lean().exec();
    if (!oExists) return next();

    let newComment = new Comment({
        text: body.text,
        creator: req.user._id,
        answerId: body.answerId
    });

    newComment.save((err, comment) => {
        if (err) return next(err);
        res.json({success: true, data: comment})
    })

};

module.exports.updateComment = (req, res, next) => {

    req.assert('commentId', 'comment id can not be blank').notEmpty();
    req.assert('text', 'text can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    Comment
        .update({_id: body.commentId}, {$set: {text: body.text}})
        .exec((err, upd) => {
            if (err) return next(err);
            if (upd.n == 0) return next();
            let resp = {success: true};
            if (upd.nModified < 1 || !upd.ok) resp.success = false;
            res.json(resp)
        });

};

module.exports.answerVote = (req, res, next) => {

    vote(Answer, req.voteOptions, (err, voted) => {
        if (err) return next(err);
        res.json(voted);
    });

};
















