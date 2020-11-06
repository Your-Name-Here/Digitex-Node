const EVENTS = require( 'events' ).EventEmitter;
const request = require( 'request' );
const ws = require( 'ws' );

class DigitexAPI extends EVENTS {

	constructor( opts ) {

		super();
		this.apikey = opts.key;
		this.retryMS = opts.retryMS || 250;
		this.tickSize = opts.tickSize || 1;
		this.symbol = opts.symbol;
		this.status = false;
		this.authed = false;
		this.spot = 0;
		this.futuresPrice = 0;
		this.depth = ( opts.depth > 25 ? 25 : ( opts.depth < 1 ? 1 : opts.depth ) );
		this.trader = { balance: 0, leverage: 1, pnl: 0, upnl: 0 };
		this.position = 0;
		this.orderbook = {
			book: {  asks: [], bids: [] },
			spread: {
				ask: 0, bid: 0, gap: () => {

					return ( ( this.orderbook.spread.ask - this.orderbook.spread.bid )/this.tickSize )-1;

				}
			},
			update: ( bids, asks ) => {

				this.orderbook.book.bids = bids; this.orderbook.book.asks = asks;
				this.orderbook.spread.bid = Math.max( ...this.orderbook.book.bids.map( e => {

					return e[0];

				} ) );
				this.orderbook.spread.ask = Math.min( ...this.orderbook.book.asks.map( e => {

					return e[0];

				} ) );

			}
		};
		this.orders = [];
		this.positions = [];
		this.conditionalOrders = [];
		this.lastSpreadChange = { ask: 0, bid: 0 };
		this.curGap = 0;
		setInterval( () => {

			this.rateLimit.current = 0;

		}, 1000 ); // Digitex api rate limit is max of 10 per second. We reset the calls to 0 every second.

		this.ws = new ws( 'wss://ws.mapi.digitexfutures.com' );

		this.rateLimit = {
			current: 0,
			max: 10
		};

		this.send = msg => {

			if ( this.rateLimit.current >= this.rateLimit.max || !this.connected ) {

				setTimeout( () => {

					this.send( msg );

				}, this.retryMS ); // If we are not at or above the current rate limit, send it, otherwise wait for this.retryMS (default: 250ms) miliseconds to resend the same msg.

				return;

			}

			this.ws.send( msg );

			this.rateLimit.current++;

		};
		this.errorCodes = {
			10: 'ID Doesn\'t exist.',
			10501: 'Invalid credentials.',
			14:	'Unknown trader.',
			18:	'Invalid leverage.',
			19: 'Invalid price.',
			20:	'Invalid quantity.',
			22:	'No market price.',
			27: 'Not enough balance.',
			3: 'ID already exists.',
			3001: 'Bad Request (invalid parameters, etc.).',
			3002: 'Channel not found.',
			3003: 'Contract not found.',
			3004: 'Index not found.',
			3005: 'Kline interval not specified.',
			3006: 'Kline interval not found.',
			3007: 'Orderbook depth not specified.',
			3008: 'Invalid orderbook depth.',
			3009: 'Already subscribed for the topic.',
			3010: 'Not subscribed for the topic.',
			3011: 'Feature is not implemented yet.',
			3012: 'The front fell off.',
			3013: 'Not authorized.',
			3014: 'Already authorized.',
			3015: 'Trading is not available.',
			3016: 'Authentication in progress.',
			3017: 'Request limit exceeded.',
			34:	'Invalid contract ID.',
			35:	'Rate limit exceeded.',
			36:	'No contracts.',
			37: 'No opposing orders.',
			40: 'Price is worse than liquidation price.',
			4001: 'System maintenance.',
			45: 'Tournament in progress.',
			53:	'Max quantity exceeded.',
			54:	'PnL is too negative.',
			55:	'Order would become invalid.',
			58:	'Trading suspended.',
			63:	'Can\'t be filled.',
			65: 'Too many conditional orders.',
			68:	'Too many orders.'
		};
		this.getError = errID => {

			return this.errorCodes[errID] || 'Unknown Error Code';

		};
		this.connect();

		this.ws.onmessage = msg => {

			if ( msg.data == 'ping' ) {

				this.send( 'pong' ); return;

			}
			const data = JSON.parse( msg.data.toString() ).data;
			const channel = JSON.parse( msg.data.toString() ).ch;
			const id = JSON.parse( msg.data.toString() ).id;

			if ( id == 1 ) {

				console.log( '    Authorized'.green );
				this.requestTraderInfo();

			}
			if ( channel == 'index' ) {

				this.emit( 'spotUpdate', data.spotPx ); this.spot = data.spotPx.toFixed( 0 ) * 1;

			}
			else if ( typeof channel == 'string' && channel.includes( 'kline_' ) ) {

				this.emit( 'kline', {
					ID: data.id,
					close: data.c,
					high: data.h,
					interval: data.interval,
					low: data.l,
					open: data.o,
					volume: data.v
				} );

			}
			else if ( typeof channel == 'string' && channel.includes( 'orderbook_' ) ) {

				if ( !this.spot ) {

					return;

				}

				this.orderbook.update( data.bids, data.asks );

				if ( this.spreadGap != this.curGap ) {

					this.curGap = this.spreadGap; this.emit( 'gapChange', this.curGap );

				}

			}
			else if ( channel == 'orderFilled' ) {

				this.orders = this.orders.filter( order => {

					if ( !order.is( data.origClOrdId ) ) {

						return true;

					} else {

						return false;

					}

				} );
				this.emit( 'orderFilled', data );

			}
			else if ( channel == 'trades' ) {

				this.emit( 'trades', data.trades );

				const maxTs = Math.max.apply( Math, data.trades.map( function ( o ) {

					return o.ts;

				} ) );

				const t = this.futuresPrice;

				this.futuresPrice = data.trades.filter( trade => {

					return trade.ts = maxTs;

				} )[0].px;

				if ( t != this.futuresPrice ) {

					this.emit( 'futuresPxUpdate', this.futuresPrice );

				}

			}
			else if ( channel == 'orderStatus' ) {

				this.trader = {
					balance: data.traderBalance,
					leverage: data.leverage,
					pnl: data.pnl,
					upnl: data.upnl
				};
				if ( data.orderStatus == 'ACCEPTED' ) {

					const o = new Order( data );
					this.orders.push( o );
					this.emit( 'orderPlaced', o );

				}
				else if ( data.orderStatus == 'REJECTED' ) {

					this.emit( 'orderRejected', this.getError( data.errCode ) );

				}
				else {

					this.orders.forEach( order => {

						// Otherwise Update it with the new data.
						console.log( ( `Unknown Status: ${ data.orderStatus }` ).red );
						//TODO Create a position here
						if ( order.is( data.origClOrdId ) ) {

							order.update( data );

						}
						else {

							this.orders.push( new Order( data ) );

						}

					} );

				}

			}
			else if ( channel == 'orderCancelled' ) {

				this.trader = {
					balance: data.traderBalance,
					leverage: data.leverage,
					pnl: data.pnl,
					upnl: data.upnl
				};
				data.orders.forEach( o => {

					this.orders = this.orders.filter( order => {

						return !order.is( o.origClOrdId );

					} );
					this.emit( 'orderCancelled', o );

				} );

			}
			else if ( channel == 'traderStatus' ) {

				this.trader = {
					balance: data.traderBalance,
					leverage: data.leverage,
					pnl: data.pnl,
					upnl: data.upnl
				};
				this.position = ( data.positionType == 'SHORT' ? 0 - data.positionContracts : data.positionContracts * 1 );
				// Rebuild the orders and positions arrays
				data.activeOrders.forEach( order => {

					order.symbol = data.symbol;
					this.orders.push( new Order( order ) );

				} );
				data.conditionalOrders.forEach( order => {

					order.symbol = data.symbol;
					this.conditionalOrders.push( new Order( order ) );

				} );
				data.contracts.forEach( contract => {

					contract.symbol = data.symbol;
					this.positions.push( new Position( contract ) );

				} );
				console.log( '    Trader Balance(DGTX):     ', this.trader.balance );
				console.log( '    Trader Orders:            ', this.orders.length );
				console.log( '    Trader Conditional Orders:', this.conditionalOrders.length );
				console.log( '    Trader Positions:         ', this.positions.length );
				console.log( '    Trader PnL:               ', this.trader.pnl );
				console.log( '    Trader Unrealized PnL:    ', this.trader.upnl );
				console.log( '' );

			}
			//Conditional Orders
			else if ( channel == 'condOrderStatus' ) {

				switch ( data.status ) {

				case 'ACCEPTED':
					data.conditionalOrders.forEach( o => {

						o.symbol = data.symbol;
						o.futuresPrice = this.futuresPrice;
						const order = new ConditionalOrder( o );
						this.conditionalOrders.push( order );
						this.emit( 'conditionalPlaced', order );

					} );
					break;
				case 'CANCELLED':
					data.conditionalOrders.forEach( o => {

						this.conditionalOrders = this.conditionalOrders.filter( order => {

							return !order.is( o.clOrdId );

						} );
						this.emit( 'conditionalCancelled', o );

					} );
					break;
				case 'TRIGGERED':
					data.conditionalOrders.forEach( o => {

						this.conditionalOrders = this.conditionalOrders.filter( order => {

							return !order.is( o.clOrdId );

						} );
						this.emit( 'conditionalTriggered', o );

					} );

					break;
				case 'REJECTED':
					this.emit( 'conditionalRejected', this.getError( data.errCode ) );
					break;
				default:
					console.warn( `Unknown conditional status: ${ data.orderStatus }`, data );
					break;

				}

			}
			else if ( JSON.parse( msg.data.toString() ).status == 'error' ) {

				console.error( `Error: ${ this.getError( JSON.parse( msg.data.toString() ).code ) }`.red );

			}
			else {

				this.emit( 'ws-message', JSON.parse( msg.data.toString() ) );
				console.log( JSON.parse( msg.data.toString() ) );

			}

		};
		this.rate = {
			current: 0,
			limit: 10,
			queue: []
		};
		setInterval( () => {

			this.rate.current = 0;

		}, 1000 );

	}
	levelHasOrder( level ) {

		const t = this.orders.filter( order => {

			return order.price == level;

		} );
		if ( t.length > 0 ) {

			return true;

		}
		else {

			return false;

		}

	}
	requestTraderInfo() {

		if ( this.connected ) {

			this.send( JSON.stringify( {
				'id':9,
				'method':'getTraderStatus',
				'params':{
					'symbol':this.symbol
				}
			} ) );

		}

	}
	set leverage( leverage ) {

		if ( this.connected ) {

			this.send( JSON.stringify( {
				'id':10,
				'method':'changeLeverageAll',
				'params': {
					'leverage':leverage,
					'symbol':this.symbol
				}
			} ) );

		}

	}
	get spreadGap() {

		return this.orderbook.spread.gap();

	}
	get totalContractsOfOrders() {

		let i = 0;this.orders.forEach( o => {

			i += o.qty;

		} ); return i;

	}
	connect() {

		this.ws.onopen = () => {

			this.emit( 'connect' );
			this.send( JSON.stringify( {
				'id': 2,
				'method': 'subscribe',
				'params': ['kline_1min', 'trades', `orderbook_${ this.depth }`, 'index'].map( topic => {

					return `${ this.symbol  }@${  topic }`;

				} )
			} ) );

		};
		this.ws.onclose = () => {

			this.emit( 'close' );

		};
		this.ws.onerror = err => {

			this.emit( 'ws-error', err );

		};
		this.on( 'connect', () => {

			this.send( JSON.stringify( {
				'id': 1,
				'method': 'auth',
				'params': {
					'type': 'token',
					'value': this.apikey
				}
			} ) );

		} );

	}
	/**
     * Place an order. If opts.entry is omitted, it will place an opt.timeInForce (default: GTC) market order on opts.side for opts.qty (default: 1) contracts. If opts.entry is passed in, will place a limit order.
     * @param {object} opts
     * @param {number} opts.entry
     * @param {string} opts.timeInForce
     * @param {string} opts.side
     * @param {number} opts.qty
     *
     * @example DigitexAPI.placeOrder({side: 'BUY', qty: 10}); // Market long 10 contracts
     *
     * @example DigitexAPI.placeOrder({side: 'SELL', qty: 10, entry: 15005}); // Limit short 10 contracts at $15,005
     *
     */
	placeOrder( opts ) {

		this.send( JSON.stringify( {
			'id':3,
			'method':'placeOrder',
			'params': {
				'clOrdId': this.UUID().substring( 0, 16 ),
				'ordType': ( opts.entry ? 'LIMIT' : 'MARKET' ),
				'px': opts.entry || undefined,
				'qty':( opts.qty>=1?opts.qty:1 ),
				'side':opts.side.toUpperCase(),
				'symbol': this.symbol,
				'timeInForce':opts.timeInForce || 'GTC'
			}
		} ) );

	}
	/**
     * Cancels all conditional orders.
     */
	cancelAllConditionals() {

		this.send( JSON.stringify( {
			'id': 9,
			'method': 'cancelCondOrder',
			'params': {
				'allForTrader': true,
				'symbol': this.symbol
			}
		} ) );

	}
	/** Cancel all orders at a certain price level (opts.price: xxxxx) or all orders on a certain side of the ladder (opts.side: 'BUY') or opts = {} to cancal all orders.
     *
     * @example DigitexAPI.cancelAllOrders({side: 'BUY'}); // Cancel all buy orders.
     * @example DigitexAPI.cancelAllOrders({price: 15005}); // Cancel all with a price of $15,005
     * @example DigitexAPI.cancelAllOrders({}); // Cancel All Orders
     */
	cancelAllOrders( opts ) {

		const parameters = {
			'id': 11,
			'method': 'cancelAllOrders',
			'params': {
				'symbol': this.symbol,
			}
		};
		if ( opts.side ) {

			parameters.side = opts.side;

		}
		else if ( opts.price ) {

			parameters.px = opts.price;

		}
		this.send( JSON.stringify( parameters ) );

	}
	cancelOrder( payload ) {

		this.send( JSON.stringify( payload ) );

	}
	placeConditional( opts ) {

		opts.futuresPrice = this.futuresPrice;
		opts.symbol = this.symbol;
		const o = new ConditionalOrder( opts );
		this.send( o.payload );

	}
	get connected() {

		return this.ws.readyState == ws.OPEN;

	}
	get balance() {

		return this.trader.balance;

	}
	get leverage() {

		return;

	}
	UUID() {

		// http://www.ietf.org/rfc/rfc4122.txt
		let s = [];
		let hexDigits = '0123456789abcdef';
		for ( let i = 0; i < 36; i++ ) {

			s[i] = hexDigits.substr( Math.floor( Math.random() * 0x10 ), 1 );

		}
		s[14] = '4';
		// @ts-ignore
		s[19] = hexDigits.substr( ( s[19] & 0x3 ) | 0x8, 1 );
		s[8] = s[13] = s[18] = s[23] = '-';

		let uuid = s.join( '' );
		return uuid;

	}

}
module.exports = DigitexAPI;

class ConditionalOrder {

	constructor( opts ) {

		this.price = opts.px || opts.price || opts.futuresPrice; // Actual price if omitting ConditionalOrder.offset. If including ConditionalOrder.offset, this should be the current futures price.
		this.futuresPrice = opts.futuresPrice;
		opts.offset = opts.offset || {};
		this.offset = {
			ticks: opts.offset.ticks || 0, // Should be positive or negative.
			trigger: opts.offset.trigger || 0,
		};
		this.pxValue = opts.pxValue || undefined;
		this.tickSize = opts.tickSize || 1;
		this.type = opts.ordType || opts.type;
		this.actionId = opts.actionId;
		this.clOrdId = opts.clOrdId || undefined;
		this.qty = opts.qty || opts.origQty || 1;
		this.side = opts.side;
		this.timeInForce = ( ['GTC', 'FOC'].includes( opts.timeInForce ) ? opts.timeInForce : 'GTC' );
		this.mayIncrPosition = opts.mayIncrPosition;
		this.symbol = opts.symbol;
		if ( ['LESS_EQUAL', 'GREATER_EQUAL'].includes( opts.condition ) ) {

			this.condition = opts.condition;

		} else {

			throw new Error( 'You must pass opts.condition of either "GREATER_EQUALS" or "LESS_EQUALS"' );

		}

	}
	get triggerPrice() {

		if ( this.pxValue ) {

			return this.pxValue;

		}
		else if ( this.offset.trigger > 0 ) {

			return this.px - ( this.tickSize * this.offset.trigger );

		} else if ( this.offset.trigger < 0 ) {

			return this.px + ( this.tickSize * this.offset.trigger );

		}
		else {

			return this.px;

		}

	}
	get px() {

		if ( this.price == this.futuresPrice && this.offset.ticks == undefined ) {

			throw new Error( 'This conditional will execute immediatly because the px (price) is equal to the current futures price. Maybe you forgot to also pass an offset object?' );

		}
		else if ( this.offset.ticks != 0 && this.price ) {

			return this.price + ( this.offset.ticks * this.tickSize );

		} else if ( this.price ) {

			return this.price;

		}
		else {

			throw new Error( 'ConditionalOrder.price must be set.' );

		}

	}
	get payload() {

		return JSON.stringify( {
			'id':4,
			'method':'placeCondOrder',
			'params': {
				'actionId': this.actionId,
				'condition': this.condition,
				'mayIncrPosition': this.mayIncrPosition,
				'ordType': this.type,
				'px': this.px,
				'pxType': 'SPOT_PRICE',
				'pxValue': this.triggerPrice,
				'qty': this.qty,
				'side':this.side,
				'symbol': this.symbol,
				'timeInForce':this.timeInForce
			}
		} );

	}
	is( id ) {

		return this.clOrdId == id;

	}
	get cancelPayload() {

		return JSON.stringify( {
			'id':5,
			'method':'cancelCondOrder',
			'params':{
				'actionId': this.actionId,
				'allForTrader':false,
				'symbol':this.symbol
			}
		} );

	}

}

class Order extends EVENTS {

	constructor( opts ) {

		super();
		this.id = opts.origClOrdId || opts.id || undefined;
		this.symbol = opts.symbol;
		this.side = opts.orderSide;
		this.price = opts.px || null;
		this.triggerPrice = opts.pxValue || null;
		this.type = ( this.price ? 'LIMIT' : 'MARKET' );
		this.status = opts.orderStatus;
		this.timeInForce = opts.timeInForce || 'GTC';
		this.qty = opts.origQty;
		this.condition = opts.condition,
		this.filledQty = opts.qty || 0;
		this.actionId = opts.actionId || undefined;
		this.contracts = opts.contracts || [];
		console.log( this );

	}
	get isConditional() {

		if ( this.triggerPrice > 0 ) {

			return true;

		} return false;

	}
	cancelPayload() {

		if ( this.isConditional ) {

			return {
				'id':5,
				'method':'cancelCondOrder',
				'params': {
					'actionId': this.actionId,
					'allForTrader':false,
					'symbol':this.symbol
				}
			};

		}
		return {
			'id':4,
			'method':'cancelOrder',
			'params': {
				'clOrdId':this.id,
				'symbol':this.symbol
			}
		};

	}
	placePayload( increase = false ) {

		if ( this.isConditional ) {

			return {
				'id':6,
				'method':'placeCondOrder',
				'params':{
					'actionId': this.actionId,
					'clOrdId':this.id,
					'condition': this.condition,
					'mayIncrPosition': increase,
					'ordType':this.type,
					'px':this.price,
					'pxType':'SPOT_PRICE',
					'pxValue': this.triggerPrice,
					'qty':this.qty,
					'side':this.side,
					'symbol': this.symbol,
					'timeInForce':this.timeInForce
				}
			};

		}
		return {
			'id':7,
			'method':'placeOrder',
			'params': {
				'clOrdId':this.id,
				'ordType': this.type,
				'px':this.price,
				'qty':this.qty,
				'side': this.side,
				'symbol': this.symbol,
				'timeInForce': this.timeInForce
			}
		};

	}
	update( data ) { // Called when an orderStatus or conOrderStatus is received

		if ( data.droppedQty > 0 ) {

			this.qty = this.qty - data.droppedQty;

		}
		else if ( data.droppedQty == 0 && data.qty == 0 ) {

			this.status = 'FILLED'; this.emit( 'filled', this );

		}
		else if ( data.qty > 0 ) {

			this.filledQty += data.qty;

		}

	}
	is( id ) {

		return this.id == id;

	}// Used to compare to an ID

}
class Position {

	constructor( opts ) {

	}

}