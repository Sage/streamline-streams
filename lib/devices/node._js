"use strict";

/// 
/// ## Native node.js streams
/// 
var streams = require('streamline-streams/lib/streams');
var api = require('streamline-streams/lib/api');
api.decorate(streams.ReadableStream.prototype);

function fixOptions(options) {
	options = options || {};
	options.newApi = true;
	return options;
}

module.exports = {
	reader: function(emitter, options) {
		return new streams.ReadableStream(emitter, fixOptions(options));
	},
	writer: function(emitter, options) {
		return new streams.WritableStream(emitter, fixOptions(options));
	},
	fixOptions: fixOptions,
};