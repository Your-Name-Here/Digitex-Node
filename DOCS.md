# Documentation

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

### CancelOrder
Cancels an order that is sitting on the orderbook

**Parameters**: payload {object} see below
| Property | Required  | Type  |                         Description                          |
|----------|:--------: | :---: |:------------------------------------------------------------ |
| payload  | true      |object | This is returned from the Order object using `Order.cancelPayload`  |

**Example** 

```js
// Market buy 10 contracts

BTCUSD.cancelOrder(Order.cancelPayload);
```

Also see: 
[placeOrder], [cancelAllOrders]

Back to [methods]

---


[placeOrder]: <#place-order>
[placeConditional]: <#place-conditional-order>
[cancelOrder]: <#cancelorder>
[cancelAllOrders]: <#cancel-all-orders>
[cancelConditional]: <#cancel-conditional>
[levelHasOrder]: <#levelhasorder>
[methods]: <#methods>
