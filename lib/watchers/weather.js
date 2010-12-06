var sys     = require('sys'),
    path    = require('path');

require.paths.unshift(path.join(__dirname, '..', '..', 'node_modules'));

var httpreq     = require('request'),
    querystring = require('querystring'),
    sprintf     = require('sprintf').sprintf;


function Weather(options) {

  var weather_api_host  = 'www.worldweatheronline.com';
  var weather_api_base  = '/feed/weather.ashx?';
  var weather_api_key   = options.key;

  this.name = "Weather";
  this.regex = new RegExp("^weather (.*)");

  this.handler = function(message, match) {
        var bot = this;
        get_weather_for(match[1], function(weather) {
          bot.privmsg(message.channel, weather);
        }, function() {
          bot.privmsg(message.channel, "Unable to find weather info for [" + match[1] + "]");
        });
  };

  function get_weather_for(q, callback, errcb) {

    var params = {
      format: 'json',
      key: weather_api_key,
      q: q,
      extra: 'localObsTime'
    };

    params = querystring.stringify(params);

    var weather_api_url = sprintf('http://%s%s%s', weather_api_host, weather_api_base, params);

    console.log("-> Calling " + weather_api_url);

    httpreq({ uri: weather_api_url }, function(error, response, body) {

        if (!error && response.statusCode == 200) {

          try {
            body = JSON.parse(body);
          } catch (e) {
            errcb();
            return;
          }

          if (body && body.data && !body.data.error) {
            var s = parse_weather(body.data);
            callback(s);
          } else {
            errcb();
          }
        } else {
          errcb();
        }
    });
  }

  function parse_weather(data) {

    var current = data.current_condition[0];
    var request = data.request[0];

    return sprintf("Weather for %s, on %s - %s - Temperature: %sC, Humidity: %s%%, Wind: %skm/h from the %s, Cloud coverage: %s%%, Pressure: %smb",
                      request.query,
                      current.localObsDateTime,
                      current.weatherDesc[0].value,
                      current.temp_C,
                      current.humidity,
                      current.windspeedKmph,
                      current.winddir16Point,
                      current.cloudcover,
                      current.pressure
                      );
  }


};

module.exports = Weather;
