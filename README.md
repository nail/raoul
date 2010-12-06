# Raoul

Yet another useless IRC bot, written in javascript and running on *node.js*, using a *CouchDB* backend by default.
You are free to provide your own store backend. This is a pretty wrong use for CouchDB but I wanted to get my hands on it.

## Synopsys

Raoul will:

* Record everything one says in its store
* Randomly use those quotes to answer when you address him (or intelligently if your store implements it... Up to you!)
* Use *watchers* to handle specific actions

## Installation

raoul depends on a few other modules:

    npm install irc-js request sprintf

## Example

bot.js

    var raoul = require('./lib/raoul'),
        exchange_watcher  = require('./lib/watchers/exchange'),
        translate_watcher = require('./lib/watchers/exchange'),
        weather_watcher   = require('./lib/watchers/exchange');

    var options = {
      irc: { // to pass to the internal IRC-js object
        server: 'irc.freenode.net',
        nick: 'mybot',
        encoding: 'utf-8'
      },
      store: { // will use 'dummy' if not set
        backend: 'couchdb',
        hostname: 'localhost',
        port: 5984,
        db: 'mybot'
      },
      altnicks: ['myb0t', 'mybot_'],
      autoreply: [30, 60], // Will throw a random quote between each 30-60 msgs (random)
      channels: ['#mychan'],
      nspassword: 'foo', // Nickserv password
      ping_delay: 180000, // send ping to server every 3 minutes
      timeout_delay: 60000 // consider dead if no pong within 1 minute
    };

    var bot = new raoul(options);
    bot.watch_for(new exchange_watcher({ key: 'foo' }));
    bot.watch_for(new weather_watcher({ key: 'bar' }));
    bot.watch_for(new translate_watcher());

    bot.connect();

## Usage

### Options

The option object has the following attributes:

* **irc**: The options for the internal [IRC-js](https://github.com/gf3/IRC-js) object, see its docs.
* **store** *(Optional)*: If set, use the backend defined, if not, will use the *dummy* one, which does nothing.
* **altnicks**: alternate nicknames
* **autoreply**: *[min, max]* if set, the bot will throw a random quote after having seen between *min* and *max* messages (randomly)
* **ping_delay**: time between each PING sent to the server, to detect disconnections
* **timeout_delay**: if we haven't received a PONG within that time, we'll consider ourselves disconnected

### Watchers

Watchers are easy to implement, see in the *lib/watchers* directory to get an idea.
Basically it is an object that must have at least those 3 properties: *name*, *regex* and *handler*.

The *handler* is a function that takes 2 arguments, *message*, which is the message it triggered on, and *match*, which is the array containing the captured parts, returned by the *regex* you set. 

The *this* keyword inside the handler will refer to the bot instance.

If the *handler* returns *true*, there be no further processing, so if you want to implement something like an infobot that must catch everything, don't return *true* in your handler.

#### Provided Watchers

* translate: Uses google translate REST API.
* weather: Uses the [Worl Weather Online](http://www.worldweatheronline.com) API, you'll need a free key.
* exchange: Uses the [Exchange Rate](http://www.exchangerate-api.com/) API, you'll need a free key.

### Stores

As watchers, you can check how to implement stores in the *lib/stores* directory.

The *stores* option attribute you pass to the bot will be passed to the store constructor, so this is where you can set your password and stuff, if needed.

Your own store must provide at least those 2 methods:

* random_reply(message, callback)
* save_message(message)


## Credits

Written by Renaud Drousies

Raoul is [UNLICENSED](http://unlicense.org)
