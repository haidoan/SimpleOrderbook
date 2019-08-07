require('./config/db');
require('./config/environment');
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const pairRouter = require('./routes/pair');
const currencyRouter = require('./routes/currency');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const app = express();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/order', ordersRouter);
app.use('/user', usersRouter);
app.use('/pair', pairRouter);
app.use('/currency', currencyRouter);
// debug helper function, thi is insert mockup currency and pair
const currencyControler = require('./controller/currencyController');
const pairControler = require('./controller/pairController');

const server = http.createServer(app);
const port = process.env.PORT || 3001;
server.listen(port, err => {
  if (!err) {
    // init some mockup db if its not existed!
    pairControler.insertMockupPair();
    currencyControler.insertMockupCurrency();
    console.log('server is listening on port', port);
  } else {
    console.log('cant start app, app is exiting error : ', err);
    process.exit(1);
  }
});
