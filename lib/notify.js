import User from '../models/User';
import mongoose from 'mongoose';


module.exports.toUser = (io) => {

    io.emit('categories', 211111111)

};

module.exports.orderCounter = (io, categories) => {
    console.log('EMITTTTTTTTTTTTTTTTING!!');
    io.emit('order:count', {categories})

};

module.exports.notify = async (io, options) => {

    let sendTo = [];
    let notify = {
        _id: mongoose.Types.ObjectId(),
        type: options.type || null
    };

    options['order'] ? notify['order'] = options.order._id : null;
    options['answer'] ? notify['answer'] = options.answer._id : null;

    let lawyers = await User.find({type: 2, categories: {$in: options.order.categories}}).select('_id').lean().exec();
    lawyers.map(item => sendTo.push(item._id));

    switch (options.type) {
        case 'order': {
            notify['text'] = 'Нове замовлення в вашій категорії';

            if (options.order.invited && options.order.invited.length) {
                sendTo = options.order.invited;
                break;
            }

            break;
        }
        case 'answer': {
            notify['text'] = 'Нова відповідь на ваше замовлення.';
            sendTo = [options.order.creator && options.order.creator._id ? options.order.creator._id : options.order.creator];
            break;
        }
        case 'set-performer': {
            notify['text'] = 'Вас обрали виконавцем.';
            sendTo = [options.performer && options.performer._id ? options.performer._id : options.performer];
            break;
        }
        case 'unset-performer': {
            notify['text'] = 'Від вас відмовились як від виконавця.';
            sendTo = [options.performer && options.performer._id ? options.performer._id : options.performer];
            break;
        }
        default: {
            return new Error('Incorrect notification type.');
        }
    }

    if (!sendTo.length) return new Error('Recipients not found.');

    User.find({_id: {$in: sendTo}})
        .select('system')
        .exec((err, users) => {
            if (err) return new Error(err);
            if (!users) return;

            users.map(item => {
                item['system'].push(notify);
                item.save();
            })
        });

    io.to(sendTo).emit('notify:system', notify);

};