"use strict";
var fs = require('fs');
var fsp = require('path');
if (fs.existsSync(fsp.join(__dirname, 'lib'))) {
	module.exports = require('./lib/' + require('streamline-runtime').runtime + '/streams');
} else {
	module.exports = require('./src/streams');	
}
