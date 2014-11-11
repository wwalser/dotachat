var http = require('http');
var querystring = require('querystring');

var config = require('../config.json');

module.exports = exports = {
    extend: function (dest, source) {
        for (var o in source) {
            if (source.hasOwnProperty(o)) {
                dest[o] = source[o];
            }
        };
        return dest;
    },
    generateCallbackId: function (iface, method) {
        return iface + '_' + method;
    },
    makeCall: function (apiClient) {
        var self = this;

        var params = this.extend({}, apiClient.params);
        params = this.extend(params, apiClient.transientParams);

        this.makeRequest(apiClient, params, function (err, response) {
            var callbackId = self.generateCallbackId(apiClient.interface, apiClient.method);
            apiClient.parseCallback(callbackId, err, response[apiClient.accessor]);
        });

        apiClient.transientParams = {};

        return apiClient;
    },
	makePath: function (apiClient, query) {
		var optionalParts = [
			['/', apiClient.getInterface()],
			['_', apiClient.getAppId()],
			['/', apiClient.getMethod()],
			['/v', apiClient.getSteamApiVersion()],
			['?', querystring.stringify(query)]
		]
        var urlParts = [
            config.steamApiProtocol,
            config.steamApiHost
		];
        for (var i = 0; i < optionalParts.length; i++) {
			if (optionalParts[i][1]) {
				urlParts.push(optionalParts[i][0], optionalParts[i][1]);
			}
		}
		return urlParts.join("");
    },
    makeRequest: function (apiClient, query, next) {
        var path = this.makePath(apiClient, query);
		console.log(path);

        var req = http.get(path, function (res) {
            var data = '';

            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end',function () {
				try {
					var obj = JSON.parse(data);
					next(null, obj, null);
				} catch (e) {
					next("Steam API is returning strange stuff, it's probably down.", {}, null);
				}
            });
        });

        req.on('error', function (e) {
            next(e, {}, null);
        });
    }
};
