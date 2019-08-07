# SimpleOrderbook
This implements simple logic for orderbook for exchange

## Scenario
- Every exchange need and order book handler with in/out orders. So this litle guy is to handle many order of any pair to filter a open order book with bid/aks structure.
- Idealy, all order of a pair with same price with be group into an record orderbook, each record is identyfied by order's price and order's pairID
## Structure
there are 2 part of this app
- API : REST API for CRUD Pair, Currency, User, Order, Orderbook
- Orderbook Logic : an matcher to filter input order and tell user that whether his/her order is matched with the existing order? if yes then fill that order, other wise insert into orderbook.
  - there are 4 scenario when an order is insert
    - FULL_FILLED: 0 : new order is matched and able to be fully filed by the existing orderbook.
    - FULL_FILLED_WITH_REMAIN: 1 : new order is matched and able to be fully filed by the existing orderbook record and orderbook record still left some remaining.
    - PARTIAL_FILLED: 2 : new order is matched and able to be partial filed by the existing orderbook, so there is new sub-order will be created.
    - NEW_ORDER: 3 : new order is not matched, and insert it to the order book.

## Clone and Deploy app
- `git clone https://github.com/haidoan/SimpleOrderbook`
- `cd SimpleOrderbook`
### Without Docker
NOTE : if running without docker,then it need to have mongodb and nodejs installed
- `npm i`
- `node app.js`
### With Docker
NOTE : please make sure that pc has docker installed
- `docker-compose build`
- `docker-compose up`
## App info
- app running default by port 3001 and data base name is `SIMPLE_EX`

## How to interact with app
it should be an GUI for this, but I just cant make it for now. so I set up API doc via swagger.
api document is available on http://localhost:3001/api-docs
## Dependency
my test dependency referency
- mongodb : v4.0.10
- nodejs : v10.16.0
- Docker version 18.09.6, build 481bc77

