"use strict";

var fixOptions = require('streamline-streams/lib/devices/node').fixOptions;

module.exports = {
	server: function(listener, options) {
		return streams.createHttpServer(listener, fixOptions(options));
	},
	client: function(options) {
		return streams.httpClient(fixOptions(options));
	},
};