"use strict";

var streams = require('streamline-streams');

function consoleSink(name) {
	return streams.sink(function(_, value) {
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