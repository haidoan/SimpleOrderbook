const ORDER_STATUS = {
  OPEN: 0,
  FILLED: 1,
  CANCEL: 2
};

const ORDER_TYPE = {
  BUY: 0,
  SELL: 1
};

const SCENARIO = {
  FULL_FILLED: 0,
  FULL_FILLED_WITH_REMAIN: 1,
  PARTIAL_FILLED: 2,
  NEW_ORDER: 3
};

module.exports = { ORDER_STATUS, ORDER_TYPE, SCENARIO };
