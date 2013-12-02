"use strict";

var std = require('streamline-streams/lib/xlets').std;

std.in('utf8').map(function(_, line) {
	switch (process.argv[2]) {
		case '-u': return line.toUpperCase();
		case '-d': return line.toUpperCase();
		default: return line;
	}
}).pipe(_, std.out('utf8'))