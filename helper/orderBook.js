const { SCENARIO, ORDER_TYPE } = require('../config/constant');
const OrderBookModel = require('../model/orderBook');
const OrderModel = require('../model/order');
function roundNumber(number) {
  if (typeof number == 'string') number = Number(number);
  return Number(number.toFixed(6));
}

async function getPartialOrder(matchOrders, order) {
  let sum = 0;
  // console.log('getPartialOrder ', order.amount, typeof order.amount);
  const orderToFill = [];
  let remainingOrder = [];
  for (let i = 0; i < matchOrders.length; i++) {
    sum += roundNumber(matchOrders[i].amount);
    if (sum === order.amount) {
      // console.log('1111111111');
      orderToFill.push({
        _id: matchOrders[i]._id,
        amount: roundNumber(matchOrders[i].amount)
        // fillAmount: roundNumber(matchOrders[i].amount)
      });
      remainingOrder = remainingOrder.concat(matchOrders.slice(i + 1, matchOrders.length));
      break;
    } else if (sum > order.amount) {
      // console.log('22222222222 ', sum, i);
      let remainAmountLastOrder;
      if (i === 0) {
        remainAmountLastOrder = sum - order.amount;
      } else {
        remainAmountLastOrder = sum - order.amount;
      }
      orderToFill.push({
        _id: matchOrders[i]._id,
        // amount: roundNumber(matchOrders[i].amount),
        amount: roundNumber(matchOrders[i].amount - remainAmountLastOrder)
        // fillAmount: roundNumber(matchOrders[i].amount - remainAmountLastOrder)
      });
      remainingOrder.push({
        _id: matchOrders[i]._id,
        amount: roundNumber(remainAmountLastOrder)
        // amount: roundNumber(matchOrders[i].amount),
        // fillAmount: roundNumber(matchOrders[i].amount - remainAmountLastOrder)
      });
      remainingOrder = remainingOrder.concat(matchOrders.slice(i + 1, matchOrders.length));
      break;
    } else {
      // console.log('3333333333333');
      orderToFill.push({
        _id: matchOrders[i]._id,
        amount: roundNumber(matchOrders[i].amount)
        // fillAmount: roundNumber(matchOrders[i].amount)
      });
    }
  }
  // console.log("sum ", sum);
  // console.log("orderToFill :", orderToFill);
  // console.log("remainingOrder :", remainingOrder);
  return { orderToFill, remainingOrder };
}

async function getAllOrder(matchOrders) {
  for (let i = 0; i < matchOrders.length; i++) {
    // console.log('matchOrders[i].amount', matchOrders[i].amount, typeof matchOrders[i].amount);
    Object.assign(matchOrders[i], {
      fillAmount: roundNumber(matchOrders[i].amount)
    });
  }
  // console.log('matchOrders123 :', matchOrders);
  return matchOrders;
}

async function getOrdersFromIds(records) {
  // can adjust to query 1 shot by $in
  // but the amounts need to be same order of the its order
  const orders = [];
  const amounts = [];
  for (let i = 0; i < records.length; i++) {
    const order = await OrderModel.findOne({ _id: records[i]._id });
    orders.push(order);
    amounts.push(Number(records[i].amount.toFixed(6)));
  }
  return {
    orders,
    amounts
  };
}

async function getHighestPrice(type, pairID, price) {
  // console.log("type  %d pairID %d price %d", type, pairID, price);
  let priceCondition;
  let sortType;
  if (type === ORDER_TYPE.BUY) {
    // if new order is sell -> find buy order with price >= new order's price
    priceCondition = {
      $gte: price
    };
    sortType = -1;
  } else {
    // if new order is buy -> find sell order with price < new order's price
    priceCondition = {
      $lte: price
    };
    sortType = 1;
  }
  const highestPriceRecord = await OrderBookModel.find({
    type,
    pairID,
    price: priceCondition,
    totalAmount: {
      $gt: 0
    }
  }).sort({ price: sortType });
  // console.log('highestPriceRecord :', highestPriceRecord);

  if (highestPriceRecord) {
    return highestPriceRecord;
  }
}

const orderBookHelper = {
  updateMatcher: async order => {
    try {
      console.log('\nfilering........\n');
      let matchRecords;
      order.amount = Number(order.amount);
      // if buy
      // suppose that this new order's price is within the matcher's price
      if (order.type == ORDER_TYPE.BUY) {
        // "buy"
        matchRecords = await getHighestPrice(ORDER_TYPE.SELL, Number(order.pairID), order.price); // pairID :1 and buy order
      } else if (order.type == ORDER_TYPE.SELL) {
        // sell
        // check the highest buy
        // if price <= highest buy -> fill
        // if price > highest buy -> update(same price existed) or insert (completed new price)
        matchRecords = await getHighestPrice(ORDER_TYPE.BUY, Number(order.pairID), order.price); // pairID :1 and buy order
      } else {
        // console.log('order.type is invalid :', order.type);
      }

      // console.log('matchRecords :', JSON.stringify(matchRecords, undefined, 2));
      if (matchRecords && matchRecords.length > 0) {
        // fill order now
        let i,
          totalOpenAmount = 0;
        let matchOrders = [];
        let orderBookToDelete = [];
        for (i = 0; i < matchRecords.length; i++) {
          totalOpenAmount += roundNumber(matchRecords[i].totalAmount);
          // console.log("matchRecords[i].orders :", matchRecords[i].orders);
          matchOrders = matchOrders.concat(matchRecords[i].orders);
          orderBookToDelete.push(matchRecords[i]._id);
          if (totalOpenAmount >= order.amount) break;
          // matchOrders = matchOrders.concat(matchRecords[i].orders);
        }
        // console.log('matchOrders :', matchOrders);
        // console.log('totalOpenAmount :', totalOpenAmount, typeof totalOpenAmount);
        // console.log('order.amount :', order.amount, typeof order.amount);

        if (totalOpenAmount == order.amount) {
          // case 1: fill all order in the matchOrders
          console.log('scenario case 1 : request %d tokens, available %d tokens ', order.amount, totalOpenAmount);
          // this is to get full order detail to client
          // shortOrderInfo is helpful for matcher or api to update its data since orders is filled or reject
          const shortOrderInfo = await getAllOrder(matchOrders);
          const orderToFill = await getOrdersFromIds(shortOrderInfo);
          return {
            scenario: SCENARIO.FULL_FILLED,
            orderToFill
          };
        } else if (totalOpenAmount > order.amount) {
          //case 3: fill partial
          console.log('scenario case 3 : request %d tokens, available %d tokens ', order.amount, totalOpenAmount);
          const { orderToFill, remainingOrder } = await getPartialOrder(matchOrders, order);
          // console.log('orderToFill111', orderToFill);

          const orderToFill2 = await getOrdersFromIds(orderToFill);
          return {
            scenario: SCENARIO.FULL_FILLED_WITH_REMAIN,
            orderToFill: orderToFill2,
            remainingOrder,
            orderBookToDelete
          };
        } else {
          // fill all and new order still available some amount
          // 1. fill all order
          // 2. create new order with amount = order.amount - totalOpenAmount
          console.log('scenario case 2 : request %d tokens, available %d tokens ', order.amount, totalOpenAmount);
          // this is to get full order detail to client
          // shortOrderInfo is helpful for matcher or api to update its data since orders is filled or reject
          const shortOrderInfo = await getAllOrder(matchOrders);
          // console.log('shortOrderInfo :', shortOrderInfo);

          let orderToFill;
          if (shortOrderInfo && shortOrderInfo.length > 0) {
            orderToFill = await getOrdersFromIds(shortOrderInfo);
          }

          return {
            scenario: SCENARIO.PARTIAL_FILLED,
            orderToFill,
            orderToCreate: {
              type: order.type, // or might be number for sake of sorting
              pairID: order.pairID,
              amount: roundNumber(order.amount - totalOpenAmount),
              price: order.price
            }
          };
        }
      } else {
        return {
          scenario: SCENARIO.NEW_ORDER,
          orderToCreate: {
            amount: order.amount,
            type: order.type
          }
        };
      }
    } catch (error) {
      console.log('error happen ', error);
    }
  }
};

module.exports = orderBookHelper;
