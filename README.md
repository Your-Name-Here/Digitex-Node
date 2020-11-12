# Digitex - Node Wrapper

This is a node package that can be used to connect to the [Digitex Futures Exchange] and manipulate account data or fetch market data.
### Installation

`npm install digitex-node --save`

Then, see [Documentation] for usage.

License
----

[MIT]

---

### Changelog

**v.1.1.0** - Initial Commit - Stable

- Added ``API.closePosition()`` function for closing whole position in one call
- Added fetching of user account data prior to ready event firing
- Added ``ready`` event

**v.1.0.0** - Initial Commit - Unstable - see [issue #6] for fix

- Added most of the websocket api
- Added orderbook tracking
- Added order managagment
- Added conditional order management
- Added Order Type
- Added Conditional Order Type
- Added all events

---

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)


   [MIT]: <https://github.com/Your-Name-Here/Digitex-Node/blob/main/LICENSE>
   [Digitex Futures Exchange]: <https://exchange.digitexfutures.com/>
   [Documentation]: <DOCS.md>
   [issue #6]: <https://github.com/Your-Name-Here/Digitex-Node/issues/6>