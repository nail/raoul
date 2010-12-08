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

var couchdb = require('node-couchdb/lib/couchdb');

function Store(options) {

  var options = options;

  var couchdbClient = couchdb.createClient(options.port, options.hostname);
  var db = couchdbClient.db(options.db);

  this.db = db;

  this.save_message = function(message) {

    message.random = Math.random();
    message.type = 'quote';
    message.source = 'irc';
    message.text = message.text.replace(/^\w+:\s+/, "");
    db.saveDoc(message);

  }

  this.random_reply = function(message, callback) {

    // http://stackoverflow.com/questions/3779605/how-do-i-load-a-random-document-from-couchdb-efficiently-and-fairly

    db.view('tools', 'random', function(e, data) {

      var n = data.rows[0].value;
      var r = Math.random();
      var i = Math.floor(r * n);

      db.view('tools', 'random', { endkey: r }, function (e, data) {
        var l = data.rows.length?data.rows[0].value:0;
        var s = i - l;

        var params = {
          startkey: r,
          limit: 1,
          reduce: 'false'
        };

        if (s >= 0) {
          params.skip = s;
        } else {
          params.skip = 0 - (s+1);
          params.descending = true;
        }

        db.view('tools', 'random', params, function (e, data) {
          if (data.rows && data.rows.length)
            callback(data.rows[0].value);
        });
      });
    });
  }
};

module.exports = Store;

