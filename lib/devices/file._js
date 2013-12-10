"use strict";

var fs = require("fs");
var node = require("streamline-streams/lib/devices/node");

module.exports = {
	text: {
		reader: function(path, encoding) {
			return node.readable(fs.createReadStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
		writer: function(path, encoding) {
			return node.readable(fs.createWriteStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
	},
	binary: {
		reader: function(path) {
			return node.readable(fs.createReadStream(path));
		},
		writer: function(path, encoding) {
			return node.readable(fs.createWriteStream(path));
		},

	}
}