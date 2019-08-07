require('../config/environment');
const PairModel = require('../model/pair');
const { ObjectID } = require('../config/db');
const { SCENARIO, ORDER_TYPE, ORDER_STATUS } = require('../config/constant');
const status = require('http-status');
const joi = require('joi');

const userController = {
  // this is called by user to submit a token request!
  async insertPair(req, res) {
    try {
      // id = price, type, pairID
      const schema = joi.object().keys({
        pairID: joi.number().required(),
        pairName: joi.string().required(),
        baseCurrency: joi.number().required(),
        secondCurrency: joi.number().required()
      });
      const user = req.body;
      joi.validate(user, schema, async (err, value) => {
        if (!err) {
          const newOrder = new PairModel(value);
          await newOrder.save();
          // update order book
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
  async getPair(req, res) {
    try {
      const pairs = await PairModel.find({}, { _id: 0, __v: 0 });
      res.status(status.OK).send({
        status: 'success',
        data: pairs
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        status: 'failed',
        error: error.message
      });
    }
  },
  // debug function
  async insertMockupPair() {
    // insert if its not existed!
    try {
      const pair1 = {
        pairID: 1,
        pairName: 'USD_ETH',
        baseCurrency: 0,
        secondCurrency: 1
      };
      const pair2 = {
        pairID: 2,
        pairName: 'USD_BTC',
        baseCurrency: 0,
        secondCurrency: 2
      };
      const pair3 = {
        pairID: 3,
        pairName: 'ETH_BTC',
        baseCurrency: 1,
        secondCurrency: 2
      };

      await PairModel.insertMany([pair1, pair2, pair3], { ordered: false });
      console.log('done add 3 mockup pairs into db!');
    } catch (error) {
      // console.log('insert pair error!', error);
    }
  }
};

module.exports = userController;
