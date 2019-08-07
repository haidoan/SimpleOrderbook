var express = require('express');
var router = express.Router();
const currencyControler = require('../controller/currencyController');

/* GET users listing. */

/* GET users listing. */
router.post('/', currencyControler.insertCurrency);
router.get('/', currencyControler.getCurrency);

module.exports = router;
