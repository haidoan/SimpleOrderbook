const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserModel = new Schema({
  userId: { type: String, index: { unique: true }, required: true },
  token: { type: String },
  balances: { type: Array }
});

module.exports = mongoose.model('user', UserModel, 'user');
