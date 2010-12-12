/*
 * Store for raoul
 *
 * It must implement the following public methods:
 *  - save_message(message)
 *  - random_reply(message, callback)
 *
 *  The callback needs to be called with the random reply you want the bot to answer
*/

var sys     = require('sys'),
    path    = require('path');

require.paths.unshift(path.join(__dirname, '..', '..', 'node_modules'));

var couchclient = require('couch-client')

function Store(options) {

  var options = options;

  if (typeof(options.port) === "undefined") options.port = 5984;
  if (typeof(options.hostname) === "undefined") options.hostname = '127.0.0.1';
  if (typeof(options.db) === "undefined") options.db = '127.0.0.1';

  var couch_url = 'http://' + options.hostname + ':' + options.port
                    + '/' + options.db;

  var random_view = '/' + options.db + '/_design/tools/_view/random';

  var db = couchclient(couch_url);

  this.db = db;

  this.save_message = function(message) {

    message.random = Math.random();
    message.type = 'quote';
    message.source = 'irc';
    message.text = message.text.replace(/^\w+:\s+/, "");
    db.save(message);

  }

  this.random_reply = function(message, callback) {

    // http://stackoverflow.com/questions/3779605/how-do-i-load-a-random-document-from-couchdb-efficiently-and-fairly

    db.view(random_view, function(e, data) {

      if (e) return;

      var n = data.rows[0].value;
      var r = Math.random();
      var i = Math.floor(r * n);

      db.view(random_view, { endkey: r }, function (e, data) {

        if (e) return;

        var l = data.rows.length?data.rows[0].value:0;
        var s = i - l;

        var params = {
          startkey: r,
          limit: 1,
          reduce: false
        };

        if (s >= 0) {
          params.skip = s;
        } else {
          params.skip = 0 - (s+1);
          params.descending = true;
        }

        db.view(random_view, params, function (e, data) {
          if (!e && data.rows && data.rows.length)
            callback(data.rows[0].value.text);
        });
      });
    });
  }
};

module.exports = Store;

