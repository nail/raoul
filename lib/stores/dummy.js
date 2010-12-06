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

function Store() {

  this.save_message = function(message) {}
  this.random_reply = function(message, callback) {}

};

module.exports = Store;

