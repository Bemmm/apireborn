import Category from '../models/Category';
import Order from '../models/Order';
import Answer from '../models/Answer';
import Comment from '../models/Comment';
import File from '../models/File';
import User from '../models/User';

import config from '../config/secrets';
import populate from '../config/populate';

import async, {map} from 'async';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import easyimg from 'easyimage';
import im from 'imagemagick';

// const ObjectId = mongoose.Types.ObjectId;
// String.prototype.toObjectId = function() {
//     return new ObjectId(this.toString());
// };


module.exports.checkAdmin = (req, res, next) => {

    if (req.user && req.user.role != 'admin')
        return res.status(401).json({success: false, msg: 'Permission denied'});

    next();

};

module.exports.checkUpdatePermission = (req, res, next) => {

    next();
    // Order
    //     .findById(id)
    //     .exec((err, order)=> {
    //         if (err) return next(err);
    //         if (order.creator.toString() != req.user._id.toString()) return res.status(403).json({success: false, msg:'Permission denied.'});
    //         req.order = order;
    //         next();
    //     })

};

module.exports.upCategoryRating = (categories, done) => {

    Category
        .find({_id: {$in: categories}})
        .exec((err, categories) => {
            if (err) return done(err);
            map(categories, (item, done)=>{
                    item.update({$inc: {order_count: 1}}, (err)=> {if (err) return done(err)});
                    done(null, item._id);
                },
                (err, updCategories)=>{
                    if (err) return done(err);
                    done(null,{categories: updCategories});
                })
        });

};

module.exports.checkAccess = (order, user) => {

    if (!order.creator) return order;
    let creator = order.creator._id || order.creator;
    let owner = user ? user.toString() == creator.toString() : false;
    let invited = !!order.invited.length;

    if (order.anon && !owner) order.creator = null;
    if (invited && user) {
        let index = _.findIndex(order.invited, {_id: user});
        if (index == -1 && !owner) return {success: false, msg: 'Access denied.'};
        return order;
    } else return order;

};

module.exports.vote = (req, res, next) => {

    req.assert('itemId', 'item id can not be blank').notEmpty();
    req.assert('essence', 'essence can not be blank').notEmpty();
    req.assert('type', 'type can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let body = req.body;

    if (body.type != 'like' && body.type != 'dislike') {
        return next(new Error('Vote type must be equals "like" or "dislike"'));
    }

    let collection = null;

    if (body.essence == 'order') collection = Order;
    if (body.essence == 'answer') collection = Answer;
    if (body.essence == 'comment') collection = Comment;

    if (!collection) return next(new Error('Essence must equals: "order", "answer", "comment"'));

    let itemId = body.itemId;
    let userId = req.user._id;
    let type = body.type;
    let field = type == 'like' ? 'likedPersons' : 'dislikedPersons';

    collection
        .findById(itemId)
        .exec((err, item) => {
            if (err) return next(err);
            if (!item) return next(new Error('Not found.'));

            let list = item.vote['likedPersons'].concat(item.vote['dislikedPersons']).toString().split(',');
            let index = list.indexOf(userId.toString());

            if (index != -1) return next(new Error('Already voted.'));

            item.vote[field].push(userId);
            item.vote[type] += 1;
            item.vote['equals'] = item.vote['like'] - item.vote['dislike'];

            item.save((err, voted) => {
                if (err) return next(err);
                res.json({success: true, data: voted});
            })

        })

};

module.exports.removeTemp = async (filesIDs, done) => {

    if (!filesIDs) return console.error(new Error('Files not found.'));

    let files = await File.find({_id: {$in: filesIDs}}).exec();

    async.map(files,
        (file, done) => {
            fs.readFile(path.join(config.tempDir, file.name), (err, data) => {
                if (err) return done(err);

                let destDir = config.filesDir;
                if (file.container == 'avatar') destDir = config.avatarsDir;

                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

                fs.writeFile(path.join(destDir, file.name), data, async (err) => {
                    if (err) return done(new Error('Change dir fails.'));

                    let unlinkDir = path.join(config.tempDir, file.name);

                    await cropImage(300, 300, file.name, destDir, (err, dest) => {
                        if (err) return done(err);

                        file.crop = dest;
                        file.path = path.join(destDir, file.name);
                        file.temp = false;
                        file.save();

                        fs.unlinkSync(unlinkDir);
                        done(null, file._id);
                    });

                });
            });
        },
        (err, data) => {
            if (err) return done(err);
            return done(null, {file: data[0]});
        }
    );

    function cropImage(w, h, name, dest, done) {
        let prefix = 'crop-' + w + '-' + h + '-';
        let newName = prefix + name;
        let src = path.join(dest, name);
        dest = path.join(dest, newName );

        im.resize({
            srcPath: src,
            dstPath: dest,
            width: w,
            height: h,
            gravity: 'Center',
        }, function(err, stdout, stderr){
            if (err) return done({err});
            return done(null,dest);
        });

        // easyimg.rescrop({
        //     src: src,
        //     dst: dest,
        //     gravity: 'Center',
        //     width: w, height: h,
        //     cropwidth: w, cropheight: h,
        //     x: 0, y: 0
        // }).then(
        //     (image) => {
        //         console.log(image)
        //     },
        //     (err) => {
        //         console.error(err)
        //         return done(err)
        //     }
        // );
    }

};

module.exports.getNotify = async (logged, done) => {

    User
        .findById(logged)
        .select('system')
        .populate('system.order', populate.info)
        .populate('system.answer', populate.info)
        .exec((err, user) => {
            if (err) return done(err);
            done(null, user.system);
        })

};















