var sys     = require('sys'),
    path    = require('path');

require.paths.unshift(path.join(__dirname, '..', '..', 'node_modules'));

var httpreq     = require('request'),
    querystring = require('querystring'),
    sprintf     = require('sprintf').sprintf;


function Exchange(options) {

  var exchange_api_host = 'www.exchangerate-api.com';
  var exchange_api_key  = options.key;

  this.name = "Exchange";
  this.regex = new RegExp("^(?:ex)?change ([.0-9]+) ([a-z]+) to ([a-z]+)", "i");

  this.handler = function(message, match) {

      var bot = this;

      get_change_for(match[1], match[2], match[3],
          function(amount, from, to, value) {
            bot.privmsg(message.channel, sprintf("%s: %s %s == %s %s",
                                                  message.from.nick,
                                                  amount,
                                                  from.toUpperCase(),
                                                  value,
                                                  to.toUpperCase()));

          }, function(error) {
            bot.privmsg(message.channel, "Unable to convert: " + error);
          })

      return true;

  };

  function get_change_for(amount, from, to, callback, errcb) {

    var params = { k: exchange_api_key };
    params = querystring.stringify(params);
    var exchange_api_url = sprintf('http://%s/%s/%s/%s?%s', exchange_api_host, from, to, amount, params);

    httpreq({ uri: exchange_api_url }, function(error, response, body) {

        if (!error && response.statusCode == 200) {

          if (body) {

            body = parseFloat(body);

            switch (body) {
              case -1:
                errcb('Invalid amount');
                break;
              case -2:
                errcb('Invalid currency code');
                break;
              case -3:
                errcb('Invalid API key');
                break;
              case -4:
                errcb('Query limit reached');
                break;
              default:
                callback(amount, from, to, body);
                break;
            }

            return;
          }
        }

        errcb('Unknown error');
    });
  }
}


module.exports = Exchange
