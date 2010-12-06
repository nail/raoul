var sys         = require('sys'),
    path        = require('path');

require.paths.unshift(path.join(__dirname, '..', 'node_modules'));
require.paths.unshift(path.join(__dirname));

var IRC     = require('irc-js'),
    sprintf = require('sprintf').sprintf;

function Raoul(options) {

  var watchers = [];
  var ping_timeout_timer;
  var nicks = [];
  var nick_idx = 0;
  var current_nick;

  var irc = this.irc = undefined;

  options = options;
  nicks.push(options.irc.nick);
  nicks = options.altnicks?nicks.concat(options.altnicks):nicks;

  var random_reply_cnt = _random_between(options.autoreply[0], options.autoreply[1]);

  if (!options.store || !options.store.backend) options.store = { backend: 'dummy' };
  var store = require(path.join('stores', options.store.backend));
  var db = new store(options.store);

  function _connect(options) {

    irc = this.irc = new IRC(options || {});
    irc.addListener('001', _connection_init_listener);
    irc.addListener('433', _nick_taken_listener);
    irc.addListener('privmsg', _privmsg_listener);
    irc.addListener('notice', _notice_listener);
    irc.addListener('pong', _pong_listener);
    irc.connect(_connect_callback);

  }

  function _connect_callback() {
    nick_idx = 0;
    current_nick = nicks[0];
  }


  /* -------- IRC Events Listeners --------- */

  function _connection_init_listener(msg) {

    setTimeout(function() {
      if (Array.isArray(options.channels)) {
        for ( var i = 0; i < options.channels.length; i++) {
          var channel = options.channels[i];
          console.log('>>> Joining ' + channel);
          irc.join(channel);
        }
      }
      _ping_check(); // initialize ping checks to monitor if we're connected
    }, 2000); // let's give us a 2 second rest before joining channels
  }

  function _pong_listener(msg) {
    clearTimeout(ping_timeout_timer);
    setTimeout(function() { _ping_check() }, options.ping_delay);
  }

  function _nick_taken_listener(msg) {
    _try_next_nick();
    setTimeout(_take_nick_back, 300000);
  }

  function _notice_listener(msg) {
    // handle nickserv authentication
    if (options.nspassword &&
          msg.person && msg.person.nick == 'NickServ' &&
          msg.params[1].match(/This nickname is registered/)) {
      irc.privmsg('NickServ', 'identify ' + options.nspassword);
    }
  }

  function _privmsg_listener(msg) {

    // reformat message to our needs
    var message = {
      channel   : msg.params[0],
      query     : msg.params[0] == current_nick?true:false,
      text      : msg.params.slice(-1).toString(),
      from      : msg.person
    };

    // check if we were addressed directly
    var to_me_regexp = new RegExp('^' + current_nick + '\\s*[:,?]?\\s*(.*)$', 'i');
    var match = to_me_regexp.exec(message.text);
    if (match) { message.text = match[1]; }
    message.addressed = (message.query || match)?true:false;

    // pass the message to the right handler
    if (message.query)
      _query_handler.call(this, message);
    else 
      _public_handler.call(this, message);

  }

  /* --------- Messages handlers ---------- */

  function _query_handler(message) {
  }

  function _public_handler(message) {

    var match;

    // look if one of the watchers matches
    for (var i = 0; i < watchers.length; i++) {

      var watcher = watchers[i];
      if (match = watcher.regex.exec(message.text)) {
        console.log(">>> Caught by " + watcher.name);
        watcher.handler.apply(this, [message, match]);
        return;
      }

    }

    // default behaviour if no watcher
    if (!message.addressed) {

      if (!message.text.match(/http:\/\//))
        db.save_message(message);

      if (!random_reply_cnt--) {
        random_reply_cnt = _random_between(options.autoreply[0], options.autoreply[1]);
        db.random_reply(function(random) {
          irc.privmsg(message.channel, random.text);
        });
      }

    } else {

      db.random_reply(message, function(random) {
        var reply = message.from.nick + ': ' + random.text;
        irc.privmsg(message.channel, reply);
      });

    }

  }

  /* --------- IRC Ping/Nick Handling --------- */

  function _ping_check() {
    irc.raw('PING :' + irc.options.server);
    clearTimeout(ping_timeout_timer);
    ping_timeout_timer = setTimeout(function() { _ping_timeout(); }, options.timeout_delay);
  }

  function _ping_timeout() {
    irc.disconnect();
    irc.connect(_connect_callback);
  }

  function _try_next_nick() {
    nick_idx = (nick_idx+1) % nicks.length;
    current_nick = nicks[nick_idx];
    irc.nick(current_nick);
  }

  function _take_nick_back() {
    nick_idx = 0;
    irc.nick(nicks[0]);
  }

  /* --------- Utilities --------- */

  function _random_between(min, max) {
    var r = Math.random();
    var range = max - min;
    var i = Math.floor(r * range);
    return i + min;
  }

  function _log_message(message) {
    console.log(sprintf("> %s - <%s> %s", message.channel, message.from.nick, message.text));
  }

  /* --------- Public methods ---------- */

  this.connect = function() {
    _connect(options.irc);
    return this;
  };

  this.watch_for = function(watcher) {
    watchers.push(watcher);
    return this;
  }

  this.privmsg = function() {
    irc.privmsg.apply(irc, arguments);
    return this;
  }

};

module.exports = Raoul;
