# Documentation

| Section    | Description                             |
|------------|-----------------------------------------|
| [Methods](#methods)    | Methods of the class                    |
| [Properties](#properties) | Properties of the class                 |
| [Events](#events)     | Available event that you can attach to. |

Start by requiring the package
```js
const API = require( 'digitex-node' ).api;
```

### Instantiation
Create a new instance of the class.

**Example:** 
```js
const BTCUSD = new API( { 
    key: 'xxx', 
    symbol: 'BTCUSD-PERP' 
});
```

**Parameters**: opts {object} see below
| opts.Property | Required  | Type  |                         Description                  |
|----------|:--------: | :---: |:--------------------------------------------------------- |
| key      | true      | string | This is your API key provided from your exchange account |
| symbol   | true      | string | This is the pair that this instance will track.          |
---
### Methods

|       Method      | Description                                                                                       |
|-------------------|---------------------------------------------------------------------------------------------------|
|     [placeOrder]    | Places an order on the orderbook                                                                  |
| [placeConditional]  | Place a conditional order.                                                                        |
|   [closePosition]   | Close position (all contracts)                                                                    |
|    [cancelOrder]    | Cancels an order already on the orderbook.                                                        |
| [cancelAllOrders]   | Cancels all non-conditional orders. Can pass an opts object to dictate which orders are canceled. |
| [cancelConditional] | Cancel a single conditional order                                                                 |
| [levelHasOrder]     | Returns a boolean, true if there is at least one order at a price level.                          |

### Properties

|       Property    |Type    | Description                                                                               |
|-------------------|:------:|-------------------------------------------------------------------------------------------|
|     leverage      | integer|  The leverage of the pair                                                                 |
| orders            | array  |   An array of Orders currently on the orderbook                                           |
| conditionalOrders | array  |  An array of conditionalOrders currently on the orderbook                                 |
| symbol            | string |  **Read-only** The symbol of the pair that the exchang understands  *Ex.* ``BTCUSD-PERP`` |

## Events
Attach to an  event with `API.on('eventName', data => { /* Your Code... */ })`
|       Event Name  |Data Type  | Description                                                                               |
|-------------------|:------:|-------------------------------------------------------------------------------------------|
|     ready         | void   |  Emitted when all data is loaded. Trader data, pair data and market data **Most actions need to wait for this event!**  |
|     connect       | void   |  Emitted when the websocket connection is opened.                                         |
|     close         | void   |  Emitted when the websocket connection is closed.                                         |
| orderFilled            | Order  |   Emitted when an order is filled and returns the Order object.                      |
| orderCancelled         | Order  |   Emitted when an order is cancelled and returns the Order object.                   |
| orderRejected          | string |   Emitted when an order is rejected and returns the error message.                   |
| orderPlaced | Order  |  Emitted when an order is placed on the orderbook by the trader.                                |
| error | string  |  Emitted when the exchange returns an error of any type. The data is the error message.              |
| authorized | void  |  Emitted when successfully authorized to your account using the API key provided.                 |
| spotUpdate | float  |  Emitted when the spot price changes. Data is the new spot price.                                |
| futuresPxUpdate | integer  |  Emitted when the futures price changes. Data is the new futures price.                   |
| kline | object  |  Emitted when a new k-line (candle) is received from the exchange. Data is the candle data.          |
| gapChange | float  |  Emitted when the gap in the spread changes. Data is the price difference between bid and ask price. |
| trades | object  |  Emitted when the exchange sends a new trade. Data is the new trade info.                           |
| conditionalPlaced | ConditionalOrder  |  Emitted when a conditional order is placed on the exchange                    |
| conditionalCancelled | ConditionalOrder  |  Emitted when a conditional order is cancelled on the exchange              |
| conditionalTriggered | ConditionalOrder  |  Emitted when a conditional order is triggered on the exchange              |
| conditionalRejected | string  |  Emitted when a conditional order is rejected and is passed the error message.         |


### Changing Leverage
    
*Change leverage on a pair.*

**Example:** `BTCUSD.leverage = 10;`

---

### Place Order
Place a new order on the pair.

**Parameters**: opts {object} see below
| Property | Required  | Type  |                         Description                          |
|----------|:--------: | :---: |:------------------------------------------------------------ |
| entry    | false     |integer| The price that you would like the limit order to execute at.</br>If omitted, the order becomes a market order. |
| side     | true      |string | BUY/SELL: "BUY" for long orders, "SELL" for short orders.    |
| qty      | true      |integer| positive, none-zero integer for how many contracts you'd like to place the order for. |

**Example** 

```js
// Market buy 10 contracts

BTCUSD.placeOrder({
    side: 'BUY',
    qty:  10
});
```
```js
// Limit buy 10 contracts at $15,045

BTCUSD.placeOrder({
    entry: 15045,
    side: 'BUY',
    qty:  10
});
```
Also see: 
[cancelOrder], [cancelAllOrders]

Back to [methods]

---

### Close Position
The trader can close the position (all available contracts)

**Parameters**:
| Parameter | Required  | Type  |                         Description                          |
|----------|:--------: | :---: |:------------------------------------------------------------ |
| price    | false     | float | The price that you would like the position to execute at with a limit order.</br>If omitted, the order becomes a market order. |

**Example** 

```js
// Market close your position

BTCUSD.closePosition();
```
```js
// Limit close your position at $15,045

BTCUSD.placeOrder( 15045 );
```

Back to [methods]

---

### CancelOrder
Cancels an order that is sitting on the orderbook

**Parameters**: order {Order} see below
| Property | Required  | Type  |                         Description                          |
|----------|:--------: | :---: |:------------------------------------------------------------ |
|  order   | true      | Order | This is an instance of the Order class. When an order is placed,a new Order object is placed into the `API.orders` array. Using this array, you can cancel the order. |

**Example** 

```js
BTCUSD.cancelOrder(Order);
```

Also see: 
[placeOrder], [cancelAllOrders]

Back to [methods]

---

### Place Conditional
Place a conditional order on the exchange

**Parameters**: opts {object} see below
| Property | Required  | Type  |                         Description                          |
|----------|:--------: | :---: |:------------------------------------------------------------ |
| side     | true      |string | ``BUY or SELL``: "BUY" for long orders, "SELL" for short orders.    |
| qty      | true      |integer| positive, none-zero integer for how many contracts you'd like to place the order for. |
| type     | true      |string | ``MARKET or LIMIT`` Order type of the conditional |
| condition| true      |string | ``GREATER_EQUALS or LESS_EQUALS``: This is the condition that will cause the order to trigger. GREATER_EQUALS if you want to trigger when the spot price is greater than or equal to opts.pxValue. LESS_EQUALS when the spot price is less than or equal to ``opts.pxValue``. |
|mayIncrPosition| false|boolean| Is this order allowed to add contracts to your position? ``true or false`` |
|timeInForce| false|string| How long should this order stay on the exchang?``GTC (default)`` ``GFD`` (Good-For-Day), ``GTC`` (Good-Till-Cancel), ``GTF`` (Good-Till-Funding), ``IOC`` (Immediate-Or-Cancel), ``FOK`` (Fill-Or-Kill) |
|price| false|float| Is this order allowed to add contracts to you position? ``true or false`` **If omitted, you must have opts.offset set.** |
|offset| true if price not omitted|object| Has two properties; trigger & ticks. ``opts.offset.trigger`` is the price at which you would like the order to trigger and ``opts.offset.ticks`` is the amount of ticks from the current spot price you would like the order placed. |
**Examples**

```js
// Market buy 10 contracts when the price goes above $15,250

BTCUSD.placeConditional({
    side: 'BUY',
    qty:  10,
    type: 'MARKET'
    condition: 'GREATER_EQUAL',
    price: 15250.00
});
```
```js
// Limit buy 10 contracts when the price drops 30 ticks below what it is at entry time. 
// When the price is 25 ticks away from current price, the limit order will be placed.

BTCUSD.placeConditional({
    side: 'BUY',
    qty:  10,
    type: 'MARKET'
    condition: 'LESS_EQUAL',
    offset: { ticks: 30, trigger 5 }
});
```
Also see: 
[cancelAllConditionals], [cancelConditional]

Back to [methods]

---


[placeOrder]: <#place-order>
[closePosition]: <#close-position>
[placeConditional]: <#place-conditional-order>
[cancelOrder]: <#cancelorder>
[cancelAllOrders]: <#cancel-all-orders>
[cancelConditional]: <#cancel-conditional>
[levelHasOrder]: <#levelhasorder>
[methods]: <#methods>
