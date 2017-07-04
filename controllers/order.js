'use strict';
import File from "../models/File";
import Order from "../models/Order";
import Answer from "../models/Answer";
import action from "../lib/actions";
import config from "../config/secrets";
import async from "async";

import socket from '../lib/notify';
import populate from '../config/populate';

module.exports.newOrder = (req, res, next) => {

    req.assert('title', 'Title can not be blank').notEmpty();
    req.checkBody({
        description: {
            isLength: {
                options: [{min: 50}],
                errorMessage: "Description length must greatest than 50 symbols."
            }
        }
    });
    req.assert('description', 'Description can not be blank').notEmpty();
    req.assert('categories', 'Categories can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    async.waterfall([
            async (done)=>{
                let newOrder = new Order({
                    creator: req.user._id,
                    title: body.title,
                    description: body.description,
                    categories: body.categories,
                    anon: body.anon || false,
                    price: body.price || null,
                    readyToPay: body.readyToPay,
                    invited: body.invited || [],
                    deadline: body.deadline || null,
                    files: body.files || null
                });

                if (newOrder.files) {
                    await action.removeTemp(newOrder.files, (err, data) => {});
                }

                newOrder.save((err, cOrder)=>{
                    if (err) return done(err);
                    return done(null, cOrder)
                })
            },
            (order, done) => {
                if (!order) return done({err: 'Order not created.'});
                action.upCategoryRating(order.categories, (err) => {
                    if (err) return done(err);
                    done(null, order);
                });
            }
        ],
        (err, order)=>{
            if (err) return next(err);

            socket.orderCounter(req.app.get('io'), order.categories);
            socket.notify(req.app.get('io'), {type: 'order', order: order});

            res.json(order);
        });

};

module.exports.updateOrder = (req, res, next) => {

    let order = req.order;

    if (order.performer) {
        return res.status(403).json({success: false, msg: 'Can\'t update, order already have a performer.'})
    }

    let update = {};

    req.body.title ? update.title = req.body.title : null;
    req.body.description ? update.description = req.body.description : null;
    req.body.price ? update.price = req.body.price : null;

    order.set(update);

    order.save((err, updOrder) => {
        if (err) { return next(err) };
        return res.json({id: updOrder._id});
    });


};

module.exports.deleteOrder = (req, res, next) => {

    let order = req.order;

    order.update({$set: {deleted: true}}, (err) => {
        if (err) return next(err);
        res.json({success: true, msg: 'Order was deleted.'});
    });


};

module.exports.orderById = (req, res, next) => {

    Order
        .findById(req.params.id)
        .populate('creator', populate.user)
        .populate('performer', populate.user)
        .populate('invited', populate.user)
        .populate('categories', '_id name publicName')
        .populate('files')
        .exec((err, order) => {
            if (err) return next(err);
            if (!order)  return next();
            let cOrder = action.checkAccess(order, req.user ? req.user._id : null);
            cOrder.views += 1;
            cOrder.save();
            res.json(cOrder);
        })

};

module.exports.search = async (req, res, next) => {

    let query = req.query;

    let page = query.page || 1;
    let limit = query.limit || 10;
    let skip = (page - 1) * limit;

    let options = {};
    let sort = { created: -1 };
    let search = new RegExp(query.search, 'i');


    if (query.search && query.search.length > 3) {
        options['$or'] = [
            { title: search },
            { description: search }
        ]
    }
    /** Profile filters **/
    if (req.user) {
        if (query.type == 'own') {
            options['creator'] = req.user._id;
        } else if (query.type == 'closed') {
            options['performer'] = req.user._id;
            options['status'] = 'closed';
        } else if (query.type == 'process') {
            options = {
                performer: {
                    _id: req.user._id
                },
                status: 'process'
            };
        } else if (query.type == 'invitations') {
            options['invited'] = req.user._id;
            options['status'] = 'open';
        }
    }

    /** Filters **/
    if (query.category){
        options['categories'] = query.category
    }
    if (query.status) {
        options['status'] = query.status;
    }
    if (query.payed) {
        options['$or'] = [
            { readyToPay: true },
            { price: {$gt: 0} }
        ]
    }

    let priceAnd = [
        query.pFrom ? {price: {$gte: query.pFrom}} : {},
        query.pTo ? {price: {$lte: query.pTo}} : {},
    ];
    options['$and'] = priceAnd;

    console.log('OPTIONS', JSON.stringify(options));

    Order
        .find(options)
        .skip(skip)
        .limit(limit)
        .populate('creator', populate.user)
        .populate('invited', populate.user)
        .populate('performer', populate.user)
        .populate('categories', populate.category)
        .populate('files', populate.avatar)
        .sort(sort)
        .lean()
        .exec((err, orders) => {
            if (err) return next(err);

            let checked = [];

            orders.map(order => {
                let result = action.checkAccess(order, req.user ? req.user._id : null);
                if (result.success && result.success == false) return null;
                return checked.push(result);
            });

            File.populate(checked, { path : 'performer.avatar', select: populate.avatar}, (err, populated) => {
                if (err) return next(err);
                res.json(populated);
            });

        });

};

module.exports.setPerformer = (req, res, next) => {

    req.assert('answerId', 'answer id can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;
    let answerId = body.answerId;
    let msg, performer;
    let notifyType = 'set-performer';

    async.waterfall([
        (done) => {
            Answer
                .findById(answerId)
                .exec((err, answer) => {
                    if (err) return done(err);
                    if (!answer) return next();
                    if (!answer.performer) {
                        answer.performer = true;
                    } else {
                        notifyType = 'unset-performer';
                        answer.performer = false;
                    }
                    performer = answer.creator;
                    done(null, answer);
                })
        },
        (answer, done) => {
            Order
                .findById(answer.orderId)
                .exec((err, order) => {
                    if (err) return done(err);
                    if (!order) return next();
                    msg = 'Performer selected.';

                    if (order.creator.toString() !== req.user._id.toString()) {
                        return done(new Error('Access denied.'));
                    }
                    if (!order.performer) {
                        order.performer = answer.creator;
                        order.status = 'process';
                    } else {
                        msg = 'Performer deleted.';
                        order.performer = null;
                        order.status = 'open';
                    }
                    order.save();
                    answer.save();
                    done(null, order);
                })
        },
        (order, done) => {
            socket.notify(req.app.get('io'), {
                type: notifyType,
                order: order,
                performer
            });
            done(null);
        }
    ], (err) => {
        if (err) return next(err);
        res.json({success: true, data: msg});
    });

};