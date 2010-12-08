var sys         = require('sys'),
    path        = require('path');

require.paths.unshift(path.join(__dirname, '..', 'node_modules'));
require.paths.unshift(path.join(__dirname));

var IRC     = require('irc-js'),
    sprintf = require('sprintf').sprintf;

function Raoul(options) {

  var watchers = [];
  var ping_timeout_timer;
  var ping_check_timer;
  var nick_back_timer;
  var nicks = [];
  var nick_idx = 0;
  var current_nick;
  var autoreply = false;
  var random_reply_cnt;

  var irc = this.irc = undefined;

  // Merge options with default ones
  for (k in Raoul.options) 
    if (typeof(options[k]) == "undefined")
      options[k] = Raoul.options[k];

  if (!options.altnicks)
    options.altnicks = [ options.irc.nick + '_', options.irc.nick + '__' ];

  nicks.push(options.irc.nick);
  nicks = options.altnicks?nicks.concat(options.altnicks):nicks;

  autoreply = (Array.isArray(options.autoreply) && options.autoreply.length == 2)?true:false;
  autoreply && (random_reply_cnt = _random_between(options.autoreply[0], options.autoreply[1]));

  if (!options.store || !options.store.backend) options.store = { backend: 'dummy' };
  var Store = require(path.join('stores', options.store.backend));
  this.store = new Store(options.store);

  function _connect(options) {

    console.log('Connecting...');
    this.irc = null;
    this.irc = new IRC(options || {});
    this.irc.addListener('001', _connection_init_listener.bind(this));
    this.irc.addListener('433', _nick_taken_listener.bind(this));
    this.irc.addListener('435', _nick_taken_listener.bind(this));
    this.irc.addListener('privmsg', _privmsg_listener.bind(this));
    this.irc.addListener('notice', _notice_listener.bind(this));
    this.irc.addListener('pong', _pong_listener.bind(this));
    this.irc.addListener('connected', _connect_callback.bind(this));
    this.irc.listenOnce('disconnected', _disconnected_listener.bind(this));
    this.irc.addListener('error', _network_error.bind(this));
    this.irc.connect();

  }

  function _network_error(exception) {
    console.log('Network error: ' + exception.message);
    this.irc.disconnect.call(this.irc);
  }

  function _reconnect() {
    _connect.call(this, options.irc);
  }

  function _connect_callback() {
    nick_idx = 0;
    current_nick = nicks[0];
  }


  /* -------- IRC Events Listeners --------- */

  function _connection_init_listener(msg) {

    clearTimeout(ping_timeout_timer);
    clearTimeout(ping_check_timer);
    clearTimeout(nick_back_timer);

    setTimeout(function() {
      if (Array.isArray(options.channels)) {
        for ( var i = 0; i < options.channels.length; i++) {
          var channel = options.channels[i];
          console.log('>>> Joining ' + channel);
          this.irc.join(channel);
        }
      }
      _ping_check.call(this); // initialize ping checks to monitor if we're connected
    }.bind(this), 2000); // let's give us a 2 second rest before joining channels
  }

  function _disconnected_listener() {
    console.log('Caught [disconnected] event');
    // Give us a 10 seconds rest before reconnecting...
    setTimeout(_reconnect.bind(this), 10000);
  }

  function _pong_listener(msg) {
    clearTimeout(ping_timeout_timer);
    ping_check_timer = setTimeout(function() { _ping_check.call(this) }.bind(this), options.ping_delay);
  }

  function _nick_taken_listener(msg) {
    _try_next_nick.call(this);
    nick_back_timer = setTimeout(_take_nick_back.bind(this), 300000);
  }

  function _notice_listener(msg) {
    // handle nickserv authentication
    if (options.nspassword &&
          msg.person && msg.person.nick == 'NickServ' &&
          msg.params[1].match(/This nickname is registered/)) {
      this.irc.privmsg('NickServ', 'identify ' + options.nspassword);
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
        if (watcher.handler.apply(this, [message, match])) return;
      }

    }

    // default behaviour if no watcher
    if (!message.addressed) {

      if (!message.text.match(/http:\/\//))
        this.store.save_message(message);

      if (autoreply && !random_reply_cnt--) {
        random_reply_cnt = _random_between(options.autoreply[0], options.autoreply[1]);
        this.store.random_reply(message, function(random) {
          this.irc.privmsg(message.channel, random.text);
        }.bind(this));
      }

    } else {

      this.store.random_reply(message, function(random) {
        var reply = message.from.nick + ': ' + random.text;
        this.irc.privmsg(message.channel, reply);
      }.bind(this));

    }

  }

  /* --------- IRC Ping/Nick Handling --------- */

  function _ping_check() {
    this.irc.raw('PING :' + this.irc.options.server);
    clearTimeout(ping_timeout_timer);
    ping_timeout_timer = setTimeout(function() { _ping_timeout.call(this); }.bind(this), options.timeout_delay);
  }

  function _ping_timeout() {
    console.log('Connection timed out!');
    //_reconnect.call(this);
    this.irc.disconnect.call(this.irc);
  }

  function _try_next_nick() {
    nick_idx = (nick_idx+1) % nicks.length;
    current_nick = nicks[nick_idx];
    this.irc.nick(current_nick);
  }

  function _take_nick_back() {
    nick_idx = 0;
    this.irc.nick(nicks[0]);
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
    _connect.call(this, options.irc);
    return this;
  };

  this.watch_for = function(watcher) {
    watchers.push(watcher);
    return this;
  }

  this.privmsg = function() {
    this.irc.privmsg.apply(this.irc, arguments);
    return this;
  }

};

Raoul.options = {

  ping_delay: 180000,
  timeout_delay: 60000,
  store: {
    backend: 'dummy'
  }

}

module.exports = Raoul;
