const env = process.env.NODE_ENV || 'development';

import express from 'express';
import bodyParser from 'body-parser';
import expressValidator from 'express-validator';
import loggerDef from 'morgan';
import mung from 'express-mung';

import config from './config/secrets';
import {checkUpdatePermission, checkAdmin, vote, getNotify} from './lib/actions';
import apiMidd from './lib/api-midd';

import homeController from './controllers/home';
import userController from './controllers/user';
import categoryController from './controllers/category';
import orderController from './controllers/order';
import answerController from './controllers/answer';
import conversController from './controllers/convers';


const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit: '20mb', extended: true}));
app.use(expressValidator());
app.use(loggerDef('dev'));

app.locals.isApi = true;

app.use(mung.json(apiMidd.changeJsonResponse));
app.use(apiMidd.accessMiddleware);

/** Home **/
app.get('/', homeController.home);
app.post('/check/email', homeController.checkEmail);
app.get('/confirmEmail/:token', homeController.verifyAccount);
app.post('/sign-up', homeController.signUp);
app.post('/sign-in', homeController.signIn);

/** ----------------------------------------------------------------------------*/
app.use(apiMidd.checkToken);                      /** Check user toke existing  */
/** ----------------------------------------------------------------------------*/


/** Category **/
app.get('/category', categoryController.getCategories);
app.get('/category/:name', categoryController.getByPublicName);
app.get('/category/:id/orders', categoryController.categoryOrders);
app.get('/category/:id/lawyers', categoryController.categoryLawyers);
app.post('/category/lawyers', userController.getLawyersByCategories);

/** Order **/
app.get('/order/:id', orderController.orderById);
app.get('/order/:id/answers', answerController.orderAnswers);
app.get('/search', orderController.search);

/** User **/
app.get('/user/:id', userController.getProfile);
app.get('/lawyers', userController.getLawyers);

/** Count **/
app.get('/count/lawyers', homeController.lawyersCount);
app.get('/count/orders', homeController.ordersCount);

/** ----------------------------------------------------------------------------*/
app.use(apiMidd.userIsLogged);                           /** Check user logged  */
/** ----------------------------------------------------------------------------*/

/** Order **/
app.post('/order', orderController.newOrder);
app.route('/order/:id')
    .put(checkUpdatePermission, orderController.updateOrder)
    .delete(checkUpdatePermission, orderController.deleteOrder);
app.post('/performer', orderController.setPerformer);

/** Answers **/
app.route('/answer')
    .post(answerController.insertAnswer)
    .put(answerController.updateAnswer);

app.route('/comment')
    .post(answerController.insertComment)
    .put(answerController.updateComment);

/** Category **/
app.route('/category')
    .post(checkAdmin, categoryController.newCategory);

/** Conversation **/
app.post('/conversation', conversController.createConversation);
app.get('/conversation/:id', conversController.getMessages);
app.get('/conversation', conversController.getConversations);


/** Vote **/
app.post('/vote', vote);

/** Files **/
app.post('/user/avatar', userController.setAvatar);
app.put('/user/profile', userController.updateProfile);
app.put('/user/password', userController.updatePassword);

app.get('/user/notify/system', userController.getUserNotify);
app.delete('/user/notify/system', userController.removeNotify);

app.post('/file/multi', checkUpdatePermission, userController.multiUpload);
app.post('/file/temp/remove', userController.removeTempFile);

/** ----------------------------------------------------------------------------*/
/** ---------------------------- ERROR HANDLER ---------------------------------*/
app.use(apiMidd.notFoundError);
app.use(apiMidd.serverError);
/** ----------------------------------------------------------------------------*/

module.exports = function init(io){
    app.set('io', io);
    return app;
};


