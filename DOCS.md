### Documentation

Start by requiring the package
`const API = require( 'digitex-node' ).api;`

##### Instantiation
Create a new instance of the class.

**Example:** 
```
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
## Methods

|       Method      | Description                                                                                       |
|-------------------|---------------------------------------------------------------------------------------------------|
|     [placeOrder]    | Places an order on the orderbook                                                                  |
| [placeConditional]  | Place a conditional order.                                                                        |
|    [cancelOrder]    | Cancels an order already on the orderbook.                                                        |
| [cancelAllOrders]   | Cancels all non-conditional orders. Can pass an opts object to dictate which orders are canceled. |
| [cancelConditional] | Cancel a single conditional order                                                                 |
| [levelHasOrder]     | Returns a boolean, true if there is at least one order at a price level.                          |

## Properties

|       Property    |Type    | Description                                                                               |
|-------------------|:------:|-------------------------------------------------------------------------------------------|
|     leverage      | integer|  The leverage of the pair                                                                 |
| orders            | array  |   An array of Orders currently on the orderbook                                           |
| conditionalOrders | array  |  An array of conditionalOrders currently on the orderbook                                 |
| symbol            | string |  **Read-only** The symbol of the pair that the exchang understands  *Ex.* ``BTCUSD-PERP`` |



##### Changing Leverage
    
*Change leverage on a pair.*

**Example:** `BTCUSD.leverage = 10;`

---

##### Place Order
Place a new order on the pair.

**Example** `BTCUSD.placeOrder({opts})`
**Parameters**: opts {object} see below
| Property | Required  | Type  |                         Description                       |
|----------|:--------: | :---: |:--------------------------------------------------------- |
| key      | true      | string | This is your API key provided from your exchange account |
| symbol   | true      | string | This is the pair that this instance will track.          |

Back to [methods]
---

[placeOrder]: <#place-order>
[placeConditional]: <#place-conditional-order>
[cancelOrder]: <#cancel-order>
[cancelAllOrders]: <#cancel-all-orders>
[cancelConditional]: <#cancel-conditional>
[orderHasLevel]: <#orderhaslevel>
[methods]: <#methods>