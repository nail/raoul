var raoul = require('./lib/raoul');
var exchange_watcher  = require('./lib/watchers/exchange');
var weather_watcher   = require('./lib/watchers/weather');
var translate_watcher = require('./lib/watchers/translate');

var options = {
  irc: {
    server    : 'irc.freenode.net',
    port      : 6667,
    nick      : 'mybot',
    encoding  : 'utf-8',
    user      : {
        username: 'mybot',
        realname: 'mybot'
    }
  },
  store     : {
      backend: 'couchdb',
      hostname: 'localhost',
      port: 5984,
      db: 'raoul'
  },
  altnicks  : ['mybot_', 'mybot__'],
  autoreply: [50,100],
  channels  : ['#raoulbot lala'],
};

var bot = new raoul(options);

bot.watch_for(new exchange_watcher({ key: 'foo'}));
bot.watch_for(new weather_watcher({ key: 'bar' }));
bot.watch_for(new translate_watcher());
bot.connect();
