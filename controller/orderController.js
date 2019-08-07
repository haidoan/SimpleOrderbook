require('../config/environment');
const OrderModel = require('../model/order');
const OrderBookModel = require('../model/orderBook');
const CurrencyModel = require('../model/currency');
const PairModel = require('../model/pair');
const UserModel = require('../model/user');
const { ObjectID } = require('../config/db');
const { SCENARIO, ORDER_TYPE, ORDER_STATUS } = require('../config/constant');
const status = require('http-status');
const joi = require('joi');
const orderBook = require('../helper/orderBook');

async function updateBuyerBalance(userId, currency, amount) {
  const user = await UserModel.findOne({ userId });
  const balances = user.balances;
  const index = balances.findIndex(b => {
    return b.id == currency;
  });
  if (index > -1) {
    balances[index].balance += amount;
  }
  await UserModel.updateOne({ userId }, { $set: { balances } });
}

async function updateBalance(order, orderToFill, scenario) {
  const seller = order.seller;
  const pair = await PairModel.findOne({ pairID: order.pairID });
  const price = order.price;
  const sign = order.type == ORDER_TYPE.BUY ? 1 : -1;

  for (let i = 0; i < orderToFill.orders.length; i++) {
    const sellerAmount = orderToFill.amounts[i];
    const buyerAmount = orderToFill.amounts[i] * price;
    // update seller balance
    await updateBuyerBalance(seller, pair.baseCurrency, sign * sellerAmount);
    await updateBuyerBalance(seller, pair.secondCurrency, -1 * sign * buyerAmount);
    // update buyer balance
    await updateBuyerBalance(orderToFill.orders[i].seller, pair.baseCurrency, -1 * sign * sellerAmount);
    await updateBuyerBalance(orderToFill.orders[i].seller, pair.secondCurrency, sign * buyerAmount);
  }
}

function findIndex(arr, o) {
  const index = arr.findIndex(e => {
    return e._id.toString() == o._id.toString();
  });
  return index;
}

async function updateOrderStatus(data) {
  const ids = [];
  data.orders.forEach(o => {
    ids.push(o._id);
  });
  const query = { _id: { $in: ids } };
  // update status of order to be FILLED
  await OrderModel.updateMany(query, { $set: { status: ORDER_STATUS.FILLED, amount: 0 } });
}

async function updateOrderStatusWithRemainingOrder(data, remainingOrders) {
  data.orders.forEach(async o => {
    const index = findIndex(remainingOrders, o);
    if (index > -1) {
      await OrderModel.updateOne({ _id: o._id }, { $set: { amount: remainingOrders[index].amount } });
    } else {
      await OrderModel.updateOne({ _id: o._id }, { $set: { status: ORDER_STATUS.FILLED, amount: 0 } });
    }
  });
}

async function insertNewOrder(order) {
  const newOrder = new OrderModel(order);
  await newOrder.save();
}

async function insertNewOrderBook(orderBook) {
  const newOrderBookModel = new OrderBookModel(orderBook);
  await newOrderBookModel.save();
}

async function updateOrderBook(query, value) {
  await OrderBookModel.updateOne(query, value);
}

async function newOrderNewOrderBook(orderData) {
  const orderId = new ObjectID();
  orderData = Object.assign({ _id: orderId, status: 0 }, orderData);
  await insertNewOrder(orderData);
  // update order book
  const query = { price: orderData.price, pairID: orderData.pairID };
  const existingOrderBook = await OrderBookModel.findOne(query);
  if (existingOrderBook) {
    const totalAmount = existingOrderBook.totalAmount + Number(orderData.amount);
    const newValue = {
      $push: {
        orders: {
          _id: orderId,
          amount: orderData.amount
        }
      },
      $set: {
        totalAmount
      }
    };

    await updateOrderBook(query, newValue);
  } else {
    const newOrderBook = {
      totalAmount: orderData.amount,
      type: orderData.type,
      price: orderData.price,
      pairID: orderData.pairID,
      orders: [
        {
          _id: orderId,
          amount: orderData.amount
        }
      ]
    };
    await insertNewOrderBook(newOrderBook);
  }
}
async function fullFilled(orderData, orderToFill) {
  const price = orderData.price;
  const pairID = orderData.pairID;
  let sortPrice;
  if (orderData.type == ORDER_TYPE.BUY) {
    sortPrice = { $lte: price };
  } else {
    sortPrice = { $gte: price };
  }
  await updateOrderStatus(orderToFill);
  // remove order book
  await OrderBookModel.deleteMany({ pairID, price: sortPrice });
}
async function updateOrderStatusAndCreateNewOrder(orderData, orderToFill, orderToCreate) {
  const price = orderToFill.orders[0].price;
  const pairID = orderToFill.orders[0].pairID;
  await updateOrderStatus(orderToFill);
  // remove order book
  await OrderBookModel.deleteOne({ price, pairID });

  const orderId = new ObjectID();
  orderToCreate = Object.assign({ _id: orderId, status: 0, seller: orderData.seller }, orderToCreate);
  await insertNewOrder(orderToCreate);

  const newOrderBook = {
    totalAmount: orderToCreate.amount,
    type: orderToCreate.type,
    price: orderToCreate.price,
    pairID: orderToCreate.pairID,
    orders: [
      {
        _id: orderId,
        amount: orderData.amount
      }
    ]
  };
  await insertNewOrderBook(newOrderBook);
}

async function fullFilledWithRemain(orderData, orderToFill, remainingOrder, orderBookToDelete) {
  // const price = orderData.price;
  // const pairID = orderData.pairID;
  await updateOrderStatusWithRemainingOrder(orderToFill, remainingOrder);

  let remainingAmount = 0;
  if (remainingOrder.length > 0) {
    remainingOrder.forEach(o => {
      // _ids.push(o._id.toString());
      remainingAmount += Number(o.amount);
    });
  } else {
    // there is no remaining order -> all fulled filled
  }

  const len = orderBookToDelete.length;
  const newValue = {
    $set: {
      orders: remainingOrder,
      totalAmount: remainingAmount
    }
  };

  for (let i = 0; i < len; i++) {
    if (i == len - 1) {
      // await updateOrderBook({ _id: orderBookToDelete[i] }, newValue);
      await OrderBookModel.updateOne({ _id: orderBookToDelete[i] }, newValue);
    } else {
      await OrderBookModel.deleteOne({ _id: orderBookToDelete[i] });
    }
  }
}

const orderController = {
  // this is called by user to submit a token request!
  async insertOrFillOrder(req, res) {
    try {
      const schema = joi.object().keys({
        seller: joi.string().required(),
        amount: joi.number().required(),
        price: joi.number().required(),
        pairID: joi.number().required(),
        type: joi.number().required()
      });
      const order = req.body;

      let seller;
      joi.validate(order, schema, async (err, value) => {
        if (!err) {
          seller = value.seller;
          // check if existing order is matched?
          const result = await orderBook.updateMatcher(order);
          // console.log('result ', JSON.stringify(result, undefined, 2));
          // yes -> get the fillable order and fill it
          // no -> insert new one
          if (result.scenario == SCENARIO.NEW_ORDER) {
            await newOrderNewOrderBook(order);
            res.status(status.OK).send({
              status: 'success',
              scenario: SCENARIO.NEW_ORDER,
              data: `successful add new order of pair ${order.pairID} with price = ${order.price} amount = ${
                order.amount
              }`
            });
          } else if (result.scenario == SCENARIO.FULL_FILLED) {
            // remove orderbook and update order status
            await fullFilled(order, result.orderToFill);
            await updateBalance(order, result.orderToFill, result.scenario);
            // update balance of seller
            // seller -= tokenA
            res.status(status.OK).send({
              status: 'success',
              scenario: SCENARIO.FULL_FILLED,
              data: `successful add fill order of pair ${order.pairID} with price = ${order.price} amount = ${
                order.amount
              }`
            });
          } else if (result.scenario == SCENARIO.FULL_FILLED_WITH_REMAIN) {
            await fullFilledWithRemain(order, result.orderToFill, result.remainingOrder, result.orderBookToDelete);
            // console.log('result123 ', JSON.stringify(result, undefined, 2));
            await updateBalance(order, result.orderToFill, result.scenario);
            res.status(status.OK).send({
              status: 'success',
              scenario: SCENARIO.FULL_FILLED_WITH_REMAIN,
              data: `successful add fill order of pair ${order.pairID} with price = ${order.price} amount = ${
                order.amount
              } there is remaining order!`
            });
          } else if (result.scenario == SCENARIO.PARTIAL_FILLED) {
            await updateOrderStatusAndCreateNewOrder(order, result.orderToFill, result.orderToCreate);
            await updateBalance(order, result.orderToFill, result.scenario);
            res.status(status.OK).send({
              status: 'success',
              scenario: SCENARIO.PARTIAL_FILLED,
              data: `successful partial fill order of pair ${order.pairID} with price = ${order.price} amount = ${
                order.amount
              } there is remaining order!`
            });
          }
        } else {
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
  async fillOrder(req, res) {
    try {
      // id = price, type, pairID
      const schema = joi.object().keys({
        buyer: joi.string().required(),
        amount: joi.number().required(),
        price: joi.number().required(),
        pairID: joi.number().required(),
        type: joi.number().required()
      });

      joi.validate(req.body, schema, async (err, value) => {
        if (!err) {
          try {
            let query = { pairID: value.pairID };
            let sortQuery;
            if (value.type == ORDER_TYPE.BUY) {
              Object.assign(query, { price: { $lte: value.price }, type: ORDER_TYPE.SELL });
              sortQuery = { date: 1 };
            } else {
              Object.assign({ price: { $gte: value.price }, type: ORDER_TYPE.BUY });
              sortQuery = { date: -1 };
            }
            const existingOrderBook = await OrderBookModel.find(query).sort(sortQuery);
            if (existingOrderBook) {
              const totalAmount = existingOrderBook.totalAmount + value.amount;
              await OrderBookModel.updateOne(query, {
                $push: {
                  orders: {
                    _id: orderId,
                    amount: value.amount
                  }
                },
                $set: {
                  totalAmount
                }
              });
            } else {
            }
            res.status(status.OK).send({
              status: 'success',
              data: 'successful add new order'
            });
          } catch (error) {
            console.log('error', error);

            res.status(status.INTERNAL_SERVER_ERROR).send({
              status: 'error',
              error: error.message
            });
          }
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
  // this is called by admin to update token info!
  async updateOrder(req, res) {
    // cancel order
    try {
      const schema = joi.object().keys({
        orderId: joi.string().required(),
        amount: joi.number(),
        status: joi.number(),
        price: joi.number(),
        pairID: joi.number().require()
      });

      joi.validate(req.body, schema, async (err, value) => {
        if (!err) {
          let newValue = {};

          if (value.amount) {
            Object.assign(newValue, { amount: value.amount });
          }
          if (value.status) {
            Object.assign(newValue, { status: value.status });
          }
          if (value.price) {
            Object.assign(newValue, { status: value.price });
          }
          await OrderModel.updateOne({ _id: new ObjectID(orderId) }, { $set: newValue });
          return res.status(status.OK).send({
            message: `successful update token at address ${address}`
          });
        } else {
          console.log('error happen!');
          return res.status(status.INTERNAL_SERVER_ERROR).send({
            error: err
          });
        }
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        error: error.message
      });
    }
  },
  async cancelOrder(req, res) {
    // cancel order
    try {
      const schema = joi.object().keys({
        orderId: joi.string().required(),
        seller: joi.string().required(),
        status: joi.number().required(),
        price: joi.number().required(),
        pairID: joi.number().required()
      });

      joi.validate(req.body, schema, async (err, value) => {
        if (!err) {
          await OrderModel.updateOne(
            { _id: new ObjectID(orderId), seller: value.seller },
            { $set: { status: value.status } }
          );
          //
          await OrderBookModel.updateOne(
            { pairID: value.pairID, price: value.price },
            { $pull: { orders: { _id: new ObjectID(orderId) } } },
            { $inc: { totalAmount: -1 * value.amount } }
          );
          return res.status(status.OK).send({
            message: `successful update order at ${orderId}`
          });
        } else {
          console.log('error happen!');
          return res.status(status.INTERNAL_SERVER_ERROR).send({
            error: err
          });
        }
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        error: error.message
      });
    }
  },
  // call by ....
  async getOrderBook(req, res) {
    try {
      const schema = joi.object().keys({
        pairID: joi.number().required()
      });

      joi.validate(req.params, schema, async (err, value) => {
        const bid = await OrderBookModel.find(
          { pairID: value.pairID, type: 1 },
          { price: 1, totalAmount: 1, type: 1 }
        ).sort({
          price: -1
        });
        const ask = await OrderBookModel.find(
          { pairID: value.pairID, type: 0 },
          { price: 1, totalAmount: 1, type: 1 }
        ).sort({
          price: -1
        });

        res.status(status.OK).send({
          status: 'success',
          data: {
            bid,
            ask
          }
        });
      });
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).send({
        status: 'failed',
        error: error.message
      });
    }
  }
};

module.exports = orderController;

// request token -> user

// update token -> admin

// remove token -> admin
