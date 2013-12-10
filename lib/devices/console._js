"use strict";

var base = require('streamline-streams/lib/devices/base');

function consoleSink(name) {
	return base.sink(function(_, value) {
		if (value !== undefined) console[name](value);
	});
}

/// * `console.log`  
/// * `console.info`  
/// * `console.warn`  
/// * `console.errors`  
///   Writable streams for console 
module.exports = {
	log: consoleSink("log"),
	info: consoleSink("info"),
	warn: consoleSink("warn"),
	error: consoleSink("error"),
};