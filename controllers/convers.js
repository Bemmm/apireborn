import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import Order from '../models/Order';

import populate from '../config/populate';

module.exports.createConversation = async (req, res, next) => {

    req.assert('user', 'User id can not be blank').notEmpty();
    req.assert('order', 'Order id can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let {user, order} = req.body;

    let fUser = await User.findById(user).select(populate.user).lean().exec();
    if (!fUser) return next(new Error('User not found'));

    let fOrder = await Order.findById(order).select('_id title').lean().exec();
    if (!fOrder) return next(new Error('Order not found'));

    let conversation = await Conversation.findOne({
        $or: [
            {users: [req.user._id, user]},
            {users: [user, req.user._id]}
        ]}).exec();

    if (conversation) return res.json({conversation: conversation._id});

    let newConvers = new Conversation({
        users: [req.user._id, fUser._id],
        admins: [req.user._id],
        name: fOrder.title
    });

    newConvers.save((err, cConvers) => {
        if (err) return next(err);

        res.json({_id: cConvers._id});
    })

};

module.exports.getConversations = (req, res, next) => {

    Conversation
        .find({users: req.user._id})
        .populate('users', populate.user)
        .populate('lastMsg')
        .select(populate.conversation)
        .exec((err, conversations) => {
            if (err) return next(err);

            res.json(conversations)
        })

};

module.exports.getMessages = (req, res, next) => {

    req.assert('id', 'Conversation id can not be blank').notEmpty();
    let errors = req.validationErrors();
    if (errors) return next(errors);

    let limit = 20;
    let skip = 0;
    if (req.query.skip) {
        skip = req.query.skip * limit;
    }

    Message
        .find({conversation: req.params.id})
        .populate('from', populate.user)
        .sort('created')
        .skip(skip)
        .limit(limit)
        .exec((err, messages) => {
            if (err) return next(err);
            if (!messages.length) return res.json([]);
            res.json(messages)
        });

};