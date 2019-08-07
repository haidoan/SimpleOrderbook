const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CurrencyModel = new Schema({
  currencyID: { type: Number, index:  { unique: true }, required: true },
  currencyName: { type: String, index: 1, required: true }
});

module.exports = mongoose.model('currency', CurrencyModel, 'currency');
