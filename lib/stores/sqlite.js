/*
 * Store for raoul
 *
 * It must implement the following public methods:
 *  - save_message(message)
 *  - random_reply(message, callback)
 *
 * The callback must be called with the random quote you want the bot to answer
 * 
*/

var sqlite = require('sqlite');

function Store(options) {

  var options = options;

  this.db = new sqlite.Database;

  this.db.open(options.file, function(e) { if (e) throw e });

  this.save_message = function(message) {
    this.db.execute("INSERT INTO quotes (quote) VALUES (?)",
                      [ message.text ],
                      function(e) { if (e) throw e });
  }

  this.random_reply = function(message, callback) {
    this.db.prepare("SELECT quote from quotes ORDER BY RANDOM() LIMIT 1",
                      function(e, statement) {
                        if (e) throw e;
                        statement.fetchAll(function(e, rows) {
                          if (e) throw e;
                          if (rows.length)
                            callback(rows[0].quote);
                        });
                    });
  }

};

module.exports = Store;

