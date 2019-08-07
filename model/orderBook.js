const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderBookModel = new Schema({
  orders: { type: Array, required: true },
  totalAmount: { type: Number, required: true },
  price: { type: Number, required: true },
  pairID: { type: Number, required: true },
  type: { type: Number, required: true }
});

module.exports = mongoose.model('orderbook', OrderBookModel, 'orderbook');
