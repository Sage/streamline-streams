"use strict";

var fixOptions = require('streamline-streams/lib/endpoints/native').fixOptions;

module.exports = {
	tcpClient: function(port, host, options) {
		return streams.tcpClient(port, host, fixOptions(options));
	},
	socketClient: function(path, options) {
		return streams.socketClient(path, fixOptions(options));
	},
	server: function(serverOptions, listener, streamOptions) {
		return streams.netServer(serverOptions, listener, fixOptions(streamOptions));
	}
};