// const MongoClient = require('mongodb').MongoClient;
require('./environment');
const ObjectID = require('mongodb').ObjectID;
const mongoose = require('mongoose');

// const dbUrl = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/SIMPLE_EX2';
const dbUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/SIMPLE_EX';
mongoose.connect(
  dbUrl,
  {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false
  },
  function(err) {
    if (err) {
      console.log('cant connect db, app is exiting...');
      process.exit(1);
    }
  }
);
console.log('object dburl', dbUrl);
module.exports = { ObjectID, mongoose };
