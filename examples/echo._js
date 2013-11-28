"use strict";

var streams = require('streamline-streams');

streams.stdin('utf8').map(function(_, line) {
	switch (process.argv[2]) {
		case '-u': return line.toUpperCase();
		case '-d': return line.toUpperCase();
		default: return line;
	}
}).pipe(_, streams.stdout('utf8'))