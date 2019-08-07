const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PairModel = new Schema({
  pairID: { type: Number, index: { unique: true }, required: true },
  pairName: { type: String, index: 1, required: true },
  baseCurrency: { type: Number, required: true },
  secondCurrency: { type: Number, required: true }
});

module.exports = mongoose.model('pair', PairModel, 'pair');
