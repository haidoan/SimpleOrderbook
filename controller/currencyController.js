require('../config/environment');
const CurrencyModel = require('../model/currency');
const status = require('http-status');
const joi = require('joi');

const userController = {
  // this is called by user to submit a token request!
  async insertCurrency(req, res) {
    try {
      // id = price, type, pairID
      const schema = joi.object().keys({
        currencyID: joi.number().required(),
        currencyName: joi.string().required()
      });
      joi.validate(req.body, schema, async (err, value) => {
        if (!err) {
          const newOrder = new CurrencyModel(value);
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
  async getCurrency(req, res) {
    try {
      const currencies = await CurrencyModel.find({}, { _id: 0, __v: 0 });
      res.status(status.OK).send({
        status: 'success',
        data: currencies
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        status: 'failed',
        error: error.message
      });
    }
  },
  // debug function
  async insertMockupCurrency() {
    // insert if its not existed!
    try {
      const currency1 = {
        currencyID: 0,
        currencyName: 'USD'
      };
      const currency2 = {
        currencyID: 1,
        currencyName: 'ETH'
      };
      const currency3 = {
        currencyID: 2,
        currencyName: 'BTC'
      };

      await CurrencyModel.insertMany([currency1, currency2, currency3], { ordered: false });
    } catch (error) {
      // console.log('insert currency error!', error);
    }
  }
};

module.exports = userController;
