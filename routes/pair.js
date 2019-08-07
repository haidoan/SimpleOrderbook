var express = require('express');
var router = express.Router();
const pairController = require('../controller/pairController');

/* GET users listing. */
router.post('/', pairController.insertPair);
router.get('/', pairController.getPair);

module.exports = router;
