require('../config/environment');
const UserModel = require('../model/user');
const { ObjectID } = require('../config/db');
const { SCENARIO, ORDER_TYPE, ORDER_STATUS } = require('../config/constant');
const status = require('http-status');
const joi = require('joi');
const crypto = require('../helper/crypto');

const userController = {
  // this is called by user to submit a token request!
  async register(req, res) {
    try {
      // id = price, type, pairID
      const schema = joi.object().keys({
        userId: joi.string().required(),
        password: joi.string().required()
      });
      const user = req.body;
      joi.validate(user, schema, async (err, value) => {
        if (!err) {
          // save order
          const balances = [
            { id: 0, name: 'USD', balance: 100 },
            { id: 1, name: 'ETH', balance: 100 },
            { id: 2, name: 'BTC', balance: 100 }
          ];
          const token = crypto.encode({ userId: value.userId, password: value.password });
          Object.assign(value, { balances, token });
          const newUser = new UserModel(value);
          try {
            await newUser.save();
          } catch (error) {
            let message;
            if (error.code === 11000) {
              message = `userId = ${value.userId} is existed`;
            }
            return res.status(status.OK).send({
              status: 'success',
              data: message || error.message
            });
          }

          res.status(status.OK).send({
            status: 'success',
            data: value
          });
        } else {
          console.log('insertOrder err :', err);
          res.status(status.INTERNAL_SERVER_ERROR).send({
            status: 'error',
            error: err.message
          });
        }
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        error: error.message
      });
    }
  },
  // async getUsers(req, res) {
  //   try {
  //     const users = await UserModel.find({});
  //     res.status(status.OK).send({
  //       status: 'success',
  //       data: users
  //     });
  //   } catch (error) {
  //     res.status(status.INTERNAL_SERVER_ERROR).send({
  //       status: 'failed',
  //       error: error.message
  //     });
  //   }
  // },
  async getUserById(req, res) {
    try {
      const schema = joi.object().keys({
        userId: joi.string().required()
      });
      joi.validate(req.params, schema, async (err, value) => {
        if (!err) {
          const user = await UserModel.find({ userId: value.userId }, { _id: 0, userId: 1, balances: 1 });
          res.status(status.OK).send({
            status: 'success',
            data: user
          });
        }
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        status: 'failed',
        error: error.message
      });
    }
  },
  async login(req, res) {
    try {
      const schema = joi.object().keys({
        userId: joi.string().required(),
        password: joi.string().required()
      });
      joi.validate(req.body, schema, async (err, value) => {
        if (!err) {
          const authenToken = req.headers['authorization'];
          console.log('authenToken', authenToken);
          console.log('value', value);
          // const data = crypto.decode({ userId: value.userId, password: value.password });
          const data = crypto.decode(authenToken);
          if (data && data.userId === value.userId && data.userId === value.password) {
            const user = await UserModel.find({ userId: value.userId }, { _id: 0, userId: 1, balances: 1 });
            res.status(status.OK).send({
              status: 'success',
              data: user
            });
          } else {
            return res.status(status.BAD_REQUEST).send({
              status: 'failed',
              data: 'invalid username or pasword'
            });
          }
        }
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        status: 'failed',
        error: error.message
      });
    }
  }
};

module.exports = userController;
