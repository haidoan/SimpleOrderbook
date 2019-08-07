var express = require('express');
var router = express.Router();
const orderController = require('../controller/orderController');

/* GET home page. */
// get order book
router.get('/:pairID', orderController.getOrderBook);
router.post('/', orderController.insertOrFillOrder);

module.exports = router;
