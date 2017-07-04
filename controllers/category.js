
import Category from '../models/Category';
import Order from '../models/Order';
import User from '../models/User';

import {transliteration as tr, slugify} from 'transliteration';
import {waterfall} from 'async';
import _ from 'lodash';
import config from '../config/secrets';
import populate from '../config/populate';
import socket from '../lib/notify';

module.exports.newCategory = (req, res, next) => {

    req.assert('name', 'Name can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;
    let public_name = slugify(body.name);

    waterfall([
            (done)=> {
                Category
                    .findOne({publicName: public_name})
                    .lean()
                    .exec((err, exist)=>{
                        if (err) return next(err);
                        if (exist) {
                            return res.status(500).json({err: err, msg: 'Category with current public id is exist.'});
                        }
                        done(null);
                    });
            },
            (done) => {
                let newCategory = new Category({
                    name: body.name,
                    publicName: public_name,
                    description: body.description || null
                });

                newCategory.save((err) => {
                    if (err) return next(err);
                    done(null, {success: true, msg: 'New category was created.'});
                })
            }
        ],
        (err, status)=>{
            if (err) return next(err);
            res.json(status)
        })

};

module.exports.getByPublicName = (req, res, next) => {

    req.assert('name', 'Name can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    Category
        .findOne({publicName: req.params.name})
        .exec((err,category)=>{
            if (err) return next(err);
            res.json(category);
        })

};

module.exports.getCategories = (req, res, next) => {

    /**
     * query params: sort 1(alphabet) / 2(rating)
     **/

    let query = req.query;

    if (!query.sort || (query.sort != 1 && query.sort != 2)) query.sort = 1;

    let sortParams = {};

    if (query.sort == 1) {
        sortParams = [
            {
                $group: {
                    _id: '$firstChar',
                    categories: { $push: { _id: '$_id', name: "$name", publicName: "$publicName" }}
                }
            },
            {
                $sort: {
                    'categories.name': 1
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]
    }
    if (query.sort == 2) {
        sortParams = [
            {
                $project: {_id: 1, name: 1, publicName: 1, order_count: 1}
            },
            {
                $sort: { order_count: -1 }
            }
        ]
    }

    Category
        .aggregate(sortParams)
        .exec((err, categories)=>{
            if (err) return next(err);

            // let sortedCategories = [];

            res.json(categories)
        });

};

module.exports.categoryOrders = (req, res, next) => {

    let query = req.query;

    let perPage = query.perPage || 10, page = query.page || 1;
    let paginationParams = {
        skip: (page - 1) * perPage,
        limit: perPage
    };

    if (page == 'all') paginationParams = { skip: null, limit: null };

    Order
        .find({categories: req.params.id})
        .skip(paginationParams.skip)
        .limit(paginationParams.limit)
        .populate('creator', populate.user)
        .populate('categories', populate.category)
        .sort({created: -1})
        .lean()
        .exec((err, orders) => {
            if (err) return next(err);
            res.json(orders);
        });

};

module.exports.categoryLawyers = (req, res, next) => {

    req.assert('id', 'Id can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    User
        .find({type: 2, categories: req.params.id})
        .select(populate.user)
        .exec((err, lawyers) => {
            if (err) return next(err);
            res.json(lawyers);
        })

};