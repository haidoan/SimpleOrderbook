const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderModel = new Schema({
  seller: { type: String, index: 1, required: true },
  amount: { type: Number, required: true },
  status: { type: Number, default: 0, index: 1 },
  price: { type: Number, required: true },
  pairID: { type: Number, required: true },
  type: { type: Number, required: true }
});

module.exports = mongoose.model('order', OrderModel, 'order');
